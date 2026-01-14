import { useState, useCallback } from 'react'
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useVideoPlayer, VideoView } from 'expo-video'
import * as Haptics from 'expo-haptics'
import { somiChainService } from '../supabase'
import { useFocusEffect } from '@react-navigation/native'

// Polyvagal states with colors and emojis
const POLYVAGAL_STATES = {
  withdrawn: { label: 'Withdrawn', color: '#7b68ee', emoji: '🌑' },
  stirring: { label: 'Stirring', color: '#9d7be8', emoji: '🌘' },
  activated: { label: 'Activated', color: '#b88ddc', emoji: '⚡' },
  settling: { label: 'Settling', color: '#68c9ba', emoji: '🌤' },
  connected: { label: 'Connected', color: '#4ecdc4', emoji: '🌕' },
}

// Video thumbnail component - shows first frame of video
function VideoThumbnail({ videoUrl }) {
  const player = useVideoPlayer(videoUrl, player => {
    player.pause() // Keep it paused to show first frame
    player.muted = true
  })

  return (
    <VideoView
      style={styles.thumbnail}
      player={player}
      nativeControls={false}
      contentFit="cover"
    />
  )
}

export default function HomeScreen({ navigation }) {
  const [mostPlayed, setMostPlayed] = useState([])
  const [latestChain, setLatestChain] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchHomeData()
    }, [])
  )

  const fetchHomeData = async () => {
    setLoading(true)
    const [playedBlocks, chain] = await Promise.all([
      somiChainService.getMostPlayedBlocks(10),
      somiChainService.getLatestChain()
    ])
    setMostPlayed(playedBlocks)
    setLatestChain(chain)
    setLoading(false)
  }

  const handleVideoPress = (block) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    navigation.navigate('Player', {
      media: {
        somi_block_id: block.id,
        name: block.name,
        type: block.media_type || 'video',
        url: block.media_url,
      },
      fromExplore: true // Mark as à la carte viewing
    })
  }

  // Calculate stats from latest chain
  const getChainStats = () => {
    if (!latestChain || !latestChain.embodiment_checks || latestChain.embodiment_checks.length < 2) {
      return null
    }

    const checks = latestChain.embodiment_checks
    const firstCheck = checks[0]
    const lastCheck = checks[checks.length - 1]

    // Calculate percentage change
    const change = lastCheck.slider_value - firstCheck.slider_value
    const changePercent = change > 0 ? `+${change}%` : `${change}%`

    const fromStateId = firstCheck.polyvagal_state || 'withdrawn'
    const toStateId = lastCheck.polyvagal_state || 'withdrawn'

    return {
      changePercent,
      change,
      fromState: POLYVAGAL_STATES[fromStateId] || POLYVAGAL_STATES.withdrawn,
      toState: POLYVAGAL_STATES[toStateId] || POLYVAGAL_STATES.withdrawn,
    }
  }

  const chainStats = getChainStats()

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SoMi Logo at top */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>SoMi</Text>
        </View>

        {/* Welcome section */}
        <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>Hi there.</Text>
          <Text style={styles.welcomeSubtext}>Welcome back</Text>

          {chainStats ? (
            <BlurView intensity={20} tint="dark" style={styles.statsCard}>
              <View style={styles.statsContent}>
                <Text style={styles.statsLabel}>Last check-in</Text>

                {/* State transition with emojis */}
                <View style={styles.stateTransition}>
                  <View style={[styles.stateCircle, { backgroundColor: chainStats.fromState.color + '33', borderColor: chainStats.fromState.color }]}>
                    <Text style={styles.stateEmoji}>{chainStats.fromState.emoji}</Text>
                  </View>

                  <View style={styles.transitionArrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>

                  <View style={[styles.stateCircle, { backgroundColor: chainStats.toState.color + '33', borderColor: chainStats.toState.color }]}>
                    <Text style={styles.stateEmoji}>{chainStats.toState.emoji}</Text>
                  </View>
                </View>

                {/* Percentage change indicator */}
                <View style={styles.statRow}>
                  <LinearGradient
                    colors={chainStats.change >= 0 ? ['#4ecdc4', '#44a08d'] : ['#7b68ee', '#6a5acd']}
                    style={styles.progressIndicator}
                  >
                    <Text style={styles.statsChange}>{chainStats.changePercent}</Text>
                  </LinearGradient>
                </View>

                {/* State labels */}
                <View style={styles.stateLabels}>
                  <Text style={[styles.stateLabelText, { color: chainStats.fromState.color }]}>
                    {chainStats.fromState.label}
                  </Text>
                  <Text style={styles.stateLabelArrow}>→</Text>
                  <Text style={[styles.stateLabelText, { color: chainStats.toState.color }]}>
                    {chainStats.toState.label}
                  </Text>
                </View>
              </View>
            </BlurView>
          ) : (
            <BlurView intensity={20} tint="dark" style={styles.statsCard}>
              <View style={styles.statsContent}>
                <Text style={styles.statsLabel}>No check-ins yet</Text>
                <Text style={styles.statsDetail}>Start your first SoMi session</Text>
              </View>
            </BlurView>
          )}
        </View>
      </View>

        {/* Video carousel section */}
        <View style={styles.carouselSection}>
          <View style={styles.carouselHeader}>
            <Text style={styles.carouselTitle}>Most Played</Text>
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4ecdc4" />
            </View>
          ) : mostPlayed.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              decelerationRate="fast"
              snapToInterval={260}
            >
              {mostPlayed.map((block) => (
                <TouchableOpacity
                  key={block.id}
                  style={styles.videoCard}
                  onPress={() => handleVideoPress(block)}
                  activeOpacity={0.8}
                >
                  <VideoThumbnail videoUrl={block.media_url} />
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.8)']}
                    style={styles.thumbnailOverlay}
                  />
                  <View style={styles.videoInfo}>
                    <Text style={styles.videoTitle}>{block.name}</Text>
                    <Text style={styles.playCount}>{block.play_count} plays</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No blocks played yet</Text>
              <Text style={styles.emptySubtext}>Start exploring to see your favorites</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  logoSection: {
    paddingTop: 70,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoText: {
    color: '#f7f9fb',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 2,
  },
  welcomeSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  welcomeContent: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    color: '#f7f9fb',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtext: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  statsContent: {
    padding: 28,
    alignItems: 'center',
  },
  statsLabel: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  statsChange: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsDetail: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  stateTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateEmoji: {
    fontSize: 28,
  },
  transitionArrow: {
    marginHorizontal: 16,
  },
  arrowText: {
    fontSize: 24,
    color: 'rgba(247, 249, 251, 0.5)',
  },
  stateLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  stateLabelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  stateLabelArrow: {
    fontSize: 14,
    color: 'rgba(247, 249, 251, 0.5)',
  },
  carouselSection: {
    paddingBottom: 20,
    paddingTop: 40,
  },
  carouselHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  carouselTitle: {
    color: '#f7f9fb',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  seeAllText: {
    color: '#4ecdc4',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  carouselContent: {
    paddingHorizontal: 24,
    gap: 16,
  },
  videoCard: {
    width: 260,
    marginRight: 16,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  thumbnail: {
    width: '100%',
    height: 180,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  thumbnailOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
  },
  videoInfo: {
    padding: 16,
  },
  videoTitle: {
    color: '#f7f9fb',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  playCount: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    paddingVertical: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  emptyText: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    color: 'rgba(247, 249, 251, 0.4)',
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
  },
})
