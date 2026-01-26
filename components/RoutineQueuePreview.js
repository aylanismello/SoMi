import { useState, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { getBlocksForRoutine } from '../services/mediaService'
import { supabase } from '../supabase'

// Polyvagal state emojis and colors
const STATE_EMOJIS = {
  withdrawn: { emoji: '🌧', color: '#4A5F8C', label: 'Withdrawn' },
  stirring: { emoji: '🌫', color: '#5B7BB4', label: 'Stirring' },
  activated: { emoji: '🌪', color: '#6B9BD1', label: 'Activated' },
  settling: { emoji: '🌤', color: '#7DBCE7', label: 'Settling' },
  connected: { emoji: '☀️', color: '#90DDF0', label: 'Connected' },
}

export default function RoutineQueuePreview({ navigation, route }) {
  const {
    polyvagalState,
    sliderValue,
    savedInitialValue,
    savedInitialState,
    totalBlocks,
  } = route.params

  const [queue, setQueue] = useState([])
  const [enrichedQueue, setEnrichedQueue] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [libraryBlocks, setLibraryBlocks] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [swapIndex, setSwapIndex] = useState(null)

  useEffect(() => {
    loadQueue()
  }, [])

  const loadQueue = async () => {
    setIsLoading(true)
    const blocks = await getBlocksForRoutine(totalBlocks)
    setQueue(blocks)

    // Fetch full block details from database for descriptions and state info
    const blockIds = blocks.map(b => b.somi_block_id)
    const { data } = await supabase
      .from('somi_blocks')
      .select('id, name, description, state_target')
      .in('id', blockIds)

    // Merge with queue order
    const enriched = blocks.map(block => {
      const details = data?.find(d => d.id === block.somi_block_id)
      return {
        ...block,
        description: details?.description,
        state_target: details?.state_target,
      }
    })

    setEnrichedQueue(enriched)

    // Load library blocks (excluding routine blocks)
    const { data: library } = await supabase
      .from('somi_blocks')
      .select('id, name, description, state_target, canonical_name, media_url')
      .eq('media_type', 'video')
      .eq('active', true)
      .eq('block_type', 'vagal_toning')
      .or('is_routine.is.null,is_routine.eq.false')
      .not('media_url', 'is', null)

    setLibraryBlocks(library || [])
    setIsLoading(false)
  }

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    navigation.replace('SoMiRoutine', {
      polyvagalState,
      sliderValue,
      savedInitialValue,
      savedInitialState,
      totalBlocks,
      customQueue: enrichedQueue, // Pass custom queue if edited
    })
  }

  const handleSwapPress = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSwapIndex(index)
    setShowLibrary(true)
  }

  const handleBlockSelect = (libraryBlock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Create new enriched queue with swapped block
    const newQueue = [...enrichedQueue]
    newQueue[swapIndex] = {
      somi_block_id: libraryBlock.id,
      name: libraryBlock.name,
      canonical_name: libraryBlock.canonical_name,
      url: libraryBlock.media_url,
      type: 'video',
      description: libraryBlock.description,
      state_target: libraryBlock.state_target,
    }

    setEnrichedQueue(newQueue)
    setShowLibrary(false)
    setSwapIndex(null)
  }

  const handleCloseLibrary = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowLibrary(false)
    setSwapIndex(null)
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Navigate back to CheckIn and tell it to stay on Step 2
    navigation.navigate('CheckIn', {
      fromBodyScan: true,
      skipToStep2: true,
      polyvagalState,
      sliderValue,
    })
  }

  const minutes = totalBlocks === 2 ? 5 : totalBlocks === 6 ? 10 : 15

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Routine</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.titleSection}>
          <Text style={styles.title}>{minutes} Minute Routine</Text>
          <Text style={styles.subtitle}>
            {totalBlocks} somatic exercises · ~{minutes} minutes
          </Text>
        </View>

        {isLoading ? (
          <ActivityIndicator size="large" color={colors.accent.primary} style={styles.loader} />
        ) : (
          <ScrollView style={styles.queueList} contentContainerStyle={styles.queueListContent}>
            {enrichedQueue.map((block, index) => {
              const stateInfo = STATE_EMOJIS[block.state_target]
              return (
                <BlurView
                  key={index}
                  intensity={15}
                  tint="dark"
                  style={[
                    styles.blockCard,
                    stateInfo && { borderColor: stateInfo.color }
                  ]}
                >
                  <View style={styles.blockHeader}>
                    <View style={[styles.blockNumber, stateInfo && { backgroundColor: stateInfo.color }]}>
                      <Text style={styles.blockNumberText}>{index + 1}</Text>
                    </View>
                    <View style={styles.blockContent}>
                      <View style={styles.blockTitleRow}>
                        <Text style={styles.blockName}>{block.name}</Text>
                        {stateInfo && (
                          <Text style={styles.stateEmoji}>{stateInfo.emoji}</Text>
                        )}
                      </View>
                      {block.description && (
                        <Text style={styles.blockDescription} numberOfLines={2}>
                          {block.description}
                        </Text>
                      )}
                      {stateInfo && (
                        <Text style={[styles.stateLabel, { color: stateInfo.color }]}>
                          {stateInfo.label}
                        </Text>
                      )}
                    </View>
                    <TouchableOpacity
                      onPress={() => handleSwapPress(index)}
                      style={styles.swapButton}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.swapButtonText}>⇄</Text>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              )
            })}
          </ScrollView>
        )}

        <TouchableOpacity
          onPress={handleConfirm}
          style={styles.confirmButton}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>Start Routine</Text>
        </TouchableOpacity>
      </View>

      {/* Library Modal */}
      <Modal
        visible={showLibrary}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseLibrary}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.libraryContainer}>
            <View style={styles.libraryHeader}>
              <TouchableOpacity onPress={handleCloseLibrary} style={styles.backButton}>
                <Text style={styles.backButtonText}>←</Text>
              </TouchableOpacity>
              <Text style={styles.libraryTitle}>Choose Exercise</Text>
              <Text style={styles.librarySubtitle}>
                {libraryBlocks.length} {libraryBlocks.length === 1 ? 'exercise' : 'exercises'}
              </Text>
            </View>

            <ScrollView
              style={styles.libraryScrollView}
              contentContainerStyle={styles.libraryListContent}
              showsVerticalScrollIndicator={false}
            >
              {(() => {
                let isFirstSection = true
                return Object.entries(STATE_EMOJIS).map(([stateId, stateInfo]) => {
                  // Filter blocks for this state
                  const blocksForState = libraryBlocks.filter(b => b.state_target === stateId)

                  if (blocksForState.length === 0) return null

                  const isFirst = isFirstSection
                  isFirstSection = false

                  return (
                    <View key={stateId}>
                      {/* State header */}
                      <View style={[styles.stateHeaderContainer, isFirst && { marginTop: 0 }]}>
                      <View style={styles.stateHeaderLine} />
                      <View style={styles.stateHeader}>
                        <Text style={styles.stateHeaderEmoji}>{stateInfo.emoji}</Text>
                        <Text style={[styles.stateHeaderText, { color: stateInfo.color }]}>
                          {stateInfo.label}
                        </Text>
                      </View>
                      <View style={styles.stateHeaderLine} />
                    </View>

                    {/* Blocks for this state */}
                    {blocksForState.map((block) => (
                      <TouchableOpacity
                        key={block.id}
                        onPress={() => handleBlockSelect(block)}
                        style={[
                          styles.libraryBlockCard,
                          { borderColor: `${stateInfo.color}50` }
                        ]}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={[`${stateInfo.color}20`, `${stateInfo.color}10`]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.libraryBlockGradient}
                        >
                          <View style={styles.libraryBlockContent}>
                            <View style={styles.stateIconContainer}>
                              <Text style={styles.stateIconEmoji}>{stateInfo.emoji}</Text>
                            </View>
                            <View style={styles.libraryBlockInfo}>
                              <Text style={styles.libraryBlockName}>{block.name}</Text>
                              {block.description && (
                                <Text style={styles.libraryBlockDescription} numberOfLines={2}>
                                  {block.description}
                                </Text>
                              )}
                            </View>
                            <View style={styles.selectIconContainer}>
                              <Text style={styles.selectIcon}>+</Text>
                            </View>
                          </View>
                        </LinearGradient>
                      </TouchableOpacity>
                    ))}
                  </View>
                )
              })())}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '300',
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
  },
  titleSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  title: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  loader: {
    marginTop: 100,
  },
  queueList: {
    flex: 1,
    marginBottom: 20,
  },
  queueListContent: {
    gap: 12,
    paddingBottom: 20,
  },
  blockCard: {
    padding: 16,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  blockHeader: {
    flexDirection: 'row',
    gap: 14,
  },
  blockNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  blockNumberText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '700',
  },
  blockContent: {
    flex: 1,
    gap: 6,
  },
  blockTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  blockName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
  },
  stateEmoji: {
    fontSize: 20,
  },
  blockDescription: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  stateLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  confirmButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    marginBottom: 32,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  confirmButtonText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  swapButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  swapButtonText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  libraryContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  libraryHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.background.primary,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.tertiary,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  backButtonText: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '600',
  },
  libraryTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  librarySubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  libraryScrollView: {
    flex: 1,
  },
  libraryListContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
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
    backgroundColor: colors.border.subtle,
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
  libraryBlockCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 16,
  },
  libraryBlockGradient: {
    padding: 20,
  },
  libraryBlockContent: {
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
  stateIconEmoji: {
    fontSize: 24,
  },
  libraryBlockInfo: {
    flex: 1,
    gap: 8,
  },
  libraryBlockName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  libraryBlockDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  libraryMetadata: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  libraryStateBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  libraryStateLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  selectIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectIcon: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '300',
  },
})
