import { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import { supabase } from '../supabase'
import { deriveStateFromDeltas } from '../constants/polyvagalStates'

// Polyvagal states (new 2D model) — order: shutdown → restful → steady → wired → glowing
const POLYVAGAL_STATES = [
  { id: 'shutdown', label: 'Shutdown', color: '#4A5A72', emoji: '🌑' },
  { id: 'restful',  label: 'Restful',  color: '#4ECDC4', emoji: '🌦' },
  { id: 'steady',   label: 'Steady',   color: '#7DBCE7', emoji: '⛅' },
  { id: 'wired',    label: 'Wired',    color: '#8B5CF6', emoji: '🌪' },
  { id: 'glowing',  label: 'Glowing',  color: '#F4B942', emoji: '☀️' },
]

// Derive state info for a video from its energy/safety deltas
const getStateInfo = (video) => {
  const state = deriveStateFromDeltas(video.energy_delta, video.safety_delta)
  return POLYVAGAL_STATES.find(s => s.id === state?.name) || null
}

// Sort videos by derived polyvagal state (for vagal toning category)
const sortByStateTarget = (videos) => {
  return videos.slice().sort((a, b) => {
    const aState = deriveStateFromDeltas(a.energy_delta, a.safety_delta)
    const bState = deriveStateFromDeltas(b.energy_delta, b.safety_delta)
    const aIndex = POLYVAGAL_STATES.findIndex(s => s.id === aState?.name)
    const bIndex = POLYVAGAL_STATES.findIndex(s => s.id === bState?.name)
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  })
}

export default function CategoryDetailScreen({ navigation, route }) {
  const { categoryId, categoryName, categoryColors } = route.params
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchVideos()
  }, [categoryId])

  const fetchVideos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('somi_blocks')
        .select('*')
        .eq('block_type', categoryId)
        .eq('media_type', 'video')
        .eq('active', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching videos:', error)
        setVideos([])
      } else {
        // Sort by state_target for vagal toning, otherwise use default order
        const sortedVideos = categoryId === 'vagal_toning'
          ? sortByStateTarget(data || [])
          : data || []
        setVideos(sortedVideos)
      }
    } catch (err) {
      console.error('Unexpected error fetching videos:', err)
      setVideos([])
    } finally {
      setLoading(false)
    }
  }

  const handleVideoPress = (video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Navigate to Player with the video
    navigation.navigate('Player', {
      media: {
        type: 'video',
        url: video.media_url,
        somi_block_id: video.id,
      },
      isBodyScan: false,
      currentStep: null,
      savedSliderValue: null,
      savedPolyvagalState: null,
      savedInitialValue: null,
      savedInitialState: null,
      fromExplore: true, // Flag to indicate we came from Explore flow
    })
  }

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  return (
    <View style={styles.container}>
      {/* Header with gradient */}
      <LinearGradient
        colors={categoryColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
        >
          <Text style={styles.backArrow}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{categoryName}</Text>
        <Text style={styles.headerSubtitle}>
          {loading ? 'Loading...' : `${videos.length} ${videos.length === 1 ? 'practice' : 'practices'}`}
        </Text>
      </LinearGradient>

      {/* Video List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4ecdc4" />
          </View>
        ) : videos.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyEmoji}>🌱</Text>
            <Text style={styles.emptyTitle}>Coming Soon</Text>
            <Text style={styles.emptySubtitle}>
              We're preparing new {categoryName.toLowerCase()} practices for you
            </Text>
          </View>
        ) : (
          <View style={styles.videoGrid}>
            {videos.map((video, index) => {
              const stateInfo = getStateInfo(video)
              const derivedStateName = deriveStateFromDeltas(video.energy_delta, video.safety_delta)?.name

              // Check if we need to show a state header (for vagal toning only)
              const prevStateName = index > 0 ? deriveStateFromDeltas(videos[index - 1]?.energy_delta, videos[index - 1]?.safety_delta)?.name : null
              const showStateHeader = categoryId === 'vagal_toning' &&
                (index === 0 || prevStateName !== derivedStateName)

              return (
                <View key={video.id}>
                  {showStateHeader && stateInfo && (
                    <View style={styles.stateHeaderContainer}>
                      <View style={styles.stateHeaderLine} />
                      <View style={styles.stateHeader}>
                        <Text style={styles.stateHeaderEmoji}>{stateInfo.emoji}</Text>
                        <Text style={[styles.stateHeaderText, { color: stateInfo.color }]}>
                          {stateInfo.label}
                        </Text>
                      </View>
                      <View style={styles.stateHeaderLine} />
                    </View>
                  )}

                  <TouchableOpacity
                    activeOpacity={0.85}
                    onPress={() => handleVideoPress(video)}
                    style={styles.videoCard}
                  >
                    <LinearGradient
                      colors={
                        categoryId === 'vagal_toning' && stateInfo
                          ? [`${stateInfo.color}30`, `${stateInfo.color}10`]
                          : ['rgba(78, 205, 196, 0.15)', 'rgba(78, 205, 196, 0.05)']
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.videoCardGradient}
                    >
                      <View style={styles.videoCardContent}>
                        {categoryId === 'vagal_toning' && stateInfo && (
                          <View style={styles.stateIconContainer}>
                            <Text style={styles.stateEmoji}>{stateInfo.emoji}</Text>
                          </View>
                        )}
                        <View style={styles.videoInfo}>
                          <Text style={styles.videoName}>{video.name}</Text>
                          {video.description && (
                            <Text style={styles.videoDescription} numberOfLines={2}>
                              {video.description}
                            </Text>
                          )}
                          {categoryId === 'vagal_toning' && stateInfo && (
                            <View style={styles.videoMetadata}>
                              <View style={[
                                styles.metadataBadge,
                                {
                                  backgroundColor: `${stateInfo.color}30`,
                                  borderColor: stateInfo.color,
                                  borderWidth: 1,
                                }
                              ]}>
                                <Text style={[styles.metadataText, { color: stateInfo.color }]}>
                                  {stateInfo.label}
                                </Text>
                              </View>
                              {video.intensity && (
                                <View style={styles.metadataBadge}>
                                  <Text style={styles.metadataText}>
                                    {video.intensity.charAt(0).toUpperCase() + video.intensity.slice(1)}
                                  </Text>
                                </View>
                              )}
                            </View>
                          )}
                          {categoryId !== 'vagal_toning' && video.intensity && (
                            <View style={styles.videoMetadata}>
                              <View style={styles.metadataBadge}>
                                <Text style={styles.metadataText}>
                                  {video.intensity.charAt(0).toUpperCase() + video.intensity.slice(1)}
                                </Text>
                              </View>
                            </View>
                          )}
                        </View>
                        <View style={styles.playIconContainer}>
                          <Text style={styles.playIcon}>▶</Text>
                        </View>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              )
            })}
          </View>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0c29',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    marginBottom: 20,
  },
  backArrow: {
    fontSize: 24,
    color: '#ffffff',
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.9)',
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 40,
  },
  loadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  emptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 12,
  },
  emptySubtitle: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.6)',
    textAlign: 'center',
    lineHeight: 24,
  },
  videoGrid: {
    gap: 16,
  },
  stateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  stateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  stateHeaderEmoji: {
    fontSize: 18,
  },
  stateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  videoCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  videoCardGradient: {
    padding: 20,
  },
  videoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  stateIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateEmoji: {
    fontSize: 24,
  },
  videoInfo: {
    flex: 1,
    gap: 8,
  },
  videoName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 0.3,
  },
  videoDescription: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
    lineHeight: 20,
  },
  videoMetadata: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  metadataBadge: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  metadataText: {
    fontSize: 11,
    color: '#4ecdc4',
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  playIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playIcon: {
    fontSize: 18,
    color: '#ffffff',
    marginLeft: 2,
  },
})
