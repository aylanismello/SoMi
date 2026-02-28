import { useState, useEffect } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { supabase } from '../supabase'
import { useRoutineStore } from '../stores/routineStore'
import { useSettingsStore } from '../stores/settingsStore'

const SECTION_LABELS = {
  'warm_up': 'WARM UP',
  'main': 'MAIN',
  'integration': 'INTEGRATION',
}

function getSectionLabel(name) {
  return SECTION_LABELS[name] || name.toUpperCase()
}

import { deriveStateFromDeltas } from '../constants/polyvagalStates'

// Polyvagal state emojis and colors (new 2D model)
const STATE_EMOJIS = {
  shutdown: { emoji: '🌑', color: '#4A5A72', label: 'Shutdown' },
  restful:  { emoji: '🌦', color: '#4ECDC4', label: 'Restful' },
  wired:    { emoji: '🌪', color: '#8B5CF6', label: 'Wired' },
  glowing:  { emoji: '☀️', color: '#F4B942', label: 'Glowing' },
  steady:   { emoji: '⛅', color: '#7DBCE7', label: 'Steady' },
}

export default function RoutineQueuePreview() {
  const navigation = useNavigation()
  const route = useRoute()
  // Get routine config from store
  const {
    totalBlocks,
    routineType,
    hardcodedQueue: storeQueue,
    currentCycle,
    setQueue,
  } = useRoutineStore()

  const { bodyScanStart, bodyScanEnd } = useSettingsStore()

  // Handle edit mode from route params (optional)
  const {
    isEditMode = false, // True when editing from interstitial
    onQueueUpdate = null, // Callback to update queue in parent (for edit mode)
    displayMinutes = null, // User-selected duration (may differ from actual block count)
  } = route.params || {}

  const [enrichedQueue, setEnrichedQueue] = useState([])
  const [libraryBlocks, setLibraryBlocks] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [swapIndex, setSwapIndex] = useState(null)
  const isLoading = false

  // Initialize queue from store
  useEffect(() => {
    if (storeQueue && storeQueue.length > 0 && enrichedQueue.length === 0) {
      setEnrichedQueue(storeQueue)
    }
  }, [storeQueue])

  // Load library blocks
  useEffect(() => {
    const loadLibrary = async () => {
      const { data: library } = await supabase
        .from('somi_blocks')
        .select('id, name, description, energy_delta, safety_delta, canonical_name, media_url')
        .eq('media_type', 'video')
        .eq('active', true)
        .eq('block_type', 'vagal_toning')
        .not('media_url', 'is', null)

      setLibraryBlocks(library || [])
    }
    loadLibrary()
  }, [])

  const handleConfirm = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Update store with the final queue
    setQueue(enrichedQueue)

    // Navigate to routine (no params needed, uses store)
    navigation.replace('SoMiRoutine')
  }

  const handleSwapPress = (index) => {
    // In edit mode, don't allow swapping past blocks
    if (isEditMode && index < currentCycle - 1) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

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
      energy_delta: libraryBlock.energy_delta,
      safety_delta: libraryBlock.safety_delta,
    }

    // Update both local state and store immediately
    setEnrichedQueue(newQueue)
    setQueue(newQueue)

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

    if (isEditMode) {
      // Update store with edited queue
      setQueue(enrichedQueue)

      // Call callback if provided (for compatibility)
      if (onQueueUpdate) {
        onQueueUpdate(enrichedQueue)
      }

      // Simply go back
      navigation.goBack()
    } else {
      // Go back to previous screen (DailyFlowSetup or wherever we came from)
      navigation.goBack()
    }
  }

  // Use user-selected duration for display; fall back to block count
  const minutes = displayMinutes ?? totalBlocks

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
            {(() => {
              const hasSections = enrichedQueue.length > 0 && !!enrichedQueue[0].section

              const renderBodyScanCard = (subtitle) => (
                <BlurView intensity={10} tint="dark" style={[styles.blockCard, styles.bodyScanCard]}>
                  <View style={styles.blockHeader}>
                    <View style={[styles.blockNumber, styles.bodyScanNumber]}>
                      <Text style={styles.bodyScanIcon}>~</Text>
                    </View>
                    <View style={styles.blockContent}>
                      <Text style={styles.bodyScanName}>Body Scan</Text>
                      <Text style={styles.bodyScanSubtitle}>{subtitle} · 60 sec</Text>
                    </View>
                    <Text style={styles.lockIcon}>🔒</Text>
                  </View>
                </BlurView>
              )

              const renderBlock = (block, index) => {
                const derivedState = deriveStateFromDeltas(block.energy_delta, block.safety_delta)
                const stateInfo = STATE_EMOJIS[derivedState?.name]
                const isPastBlock = isEditMode && index < currentCycle - 1
                const isCurrentBlock = isEditMode && index === currentCycle - 1
                return (
                  <BlurView
                    key={index}
                    intensity={15}
                    tint="dark"
                    style={[
                      styles.blockCard,
                      isCurrentBlock && { borderWidth: 2, borderColor: colors.accent.primary },
                      isPastBlock && { opacity: 0.5 },
                    ]}
                  >
                    <View style={styles.blockHeader}>
                      <View style={styles.blockNumber}>
                        <Text style={styles.blockNumberText}>{index + 1}</Text>
                      </View>
                      <View style={styles.blockContent}>
                        <View style={styles.blockTitleRow}>
                          <Text style={styles.blockName}>
                            {block.name}
                            {isCurrentBlock && <Text style={{ color: stateInfo?.color }}> (Current)</Text>}
                            {isPastBlock && <Text style={{ color: colors.text.muted }}> (Completed)</Text>}
                          </Text>
                          {stateInfo && <Text style={styles.stateEmoji}>{stateInfo.emoji}</Text>}
                        </View>
                        {block.description && (
                          <Text style={styles.blockDescription} numberOfLines={2}>{block.description}</Text>
                        )}
                        {stateInfo && (
                          <Text style={[styles.stateLabel, { color: stateInfo.color }]}>{stateInfo.label}</Text>
                        )}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleSwapPress(index)}
                        style={[styles.swapButton, isPastBlock && { opacity: 0.5 }]}
                        activeOpacity={isPastBlock ? 1 : 0.7}
                        disabled={isPastBlock}
                      >
                        <Text style={styles.swapButtonText}>{isPastBlock ? '🔒' : '⇄'}</Text>
                      </TouchableOpacity>
                    </View>
                  </BlurView>
                )
              }

              if (hasSections) {
                const groups = []
                let currentName = null
                enrichedQueue.forEach((block, i) => {
                  const name = block.section || 'main'
                  if (name !== currentName) {
                    currentName = name
                    groups.push({ name, items: [] })
                  }
                  groups[groups.length - 1].items.push({ block, globalIndex: i })
                })

                return groups.map((group, groupIdx) => (
                  <View key={group.name} style={styles.sectionGroup}>
                    <Text style={styles.sectionHeader}>{getSectionLabel(group.name)}</Text>
                    {groupIdx === 0 && bodyScanStart && renderBodyScanCard('opening')}
                    {group.items.map(({ block, globalIndex }) => renderBlock(block, globalIndex))}
                    {groupIdx === groups.length - 1 && bodyScanEnd && renderBodyScanCard('closing')}
                  </View>
                ))
              }

              // Flat fallback
              return (
                <>
                  {bodyScanStart && renderBodyScanCard('opening')}
                  {enrichedQueue.map((block, index) => renderBlock(block, index))}
                  {bodyScanEnd && renderBodyScanCard('closing')}
                </>
              )
            })()}
          </ScrollView>
        )}

        <TouchableOpacity
          onPress={isEditMode ? handleBack : handleConfirm}
          style={styles.confirmButton}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>{isEditMode ? 'Update Routine' : 'Start Routine'}</Text>
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
              {Object.entries(STATE_EMOJIS).map(([stateId, stateInfo], sectionIndex) => {
                // Filter blocks for this state
                const blocksForState = libraryBlocks.filter(b => {
                  const blockState = deriveStateFromDeltas(b.energy_delta, b.safety_delta)
                  return blockState?.name === stateId
                })

                if (blocksForState.length === 0) return null

                return (
                  <View key={stateId}>
                    {/* State header */}
                    <View style={[styles.stateHeaderContainer, sectionIndex === 0 && { marginTop: 0 }]}>
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
              })}
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
  sectionGroup: {
    gap: 12,
  },
  sectionHeader: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  blockCard: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: colors.border.default,
    overflow: 'hidden',
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
    borderRadius: 20,
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
  bodyScanCard: {
    borderColor: 'rgba(255,255,255,0.12)',
    borderStyle: 'dashed',
    opacity: 0.75,
  },
  bodyScanNumber: {
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  bodyScanIcon: {
    color: colors.text.muted,
    fontSize: 16,
    fontWeight: '600',
  },
  bodyScanName: {
    color: colors.text.secondary,
    fontSize: 17,
    fontWeight: '600',
  },
  bodyScanSubtitle: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  lockIcon: {
    fontSize: 16,
    alignSelf: 'center',
  },
})
