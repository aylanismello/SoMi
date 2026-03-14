import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal,
  Animated, PanResponder, Dimensions, LayoutAnimation, Platform,
  UIManager,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { colors } from '../../constants/theme'
import { supabase } from '../../supabase'
import { deriveStateFromDeltas } from '../../constants/polyvagalStates'
import BlockDeltaViz from './BlockDeltaViz'
import type { SomiBlock, SectionName, Segment } from '../../types'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3
const SWIPE_VELOCITY = 0.5
const H_PAD = 20

const SECTION_LABELS: Record<string, string> = {
  warm_up: 'WARM UP',
  main: 'MAIN',
  integration: 'INTEGRATION',
}

const STATE_COLORS: Record<string, string> = {
  shutdown: '#4A5A72',
  restful: '#4ECDC4',
  wired: '#8B5CF6',
  glowing: '#F4B942',
  steady: '#7DBCE7',
}

const STATE_LABELS: Record<string, string> = {
  shutdown: 'Shutdown',
  restful: 'Restful',
  wired: 'Wired',
  glowing: 'Glowing',
  steady: 'Steady',
}

interface EditFlowBlock {
  type?: string
  somi_block_id?: number
  id?: number
  name: string
  canonical_name?: string
  description?: string
  energy_delta?: number | null
  safety_delta?: number | null
  url?: string | null
  media_url?: string | null
  duration_seconds?: number
  section?: string
}

// Assign sections based on queue position (matches server/lib/polyvagal.js logic)
function assignSections(blocks: EditFlowBlock[]): EditFlowBlock[] {
  const n = blocks.length
  return blocks.map((block, i) => {
    let section = 'main'
    if (n === 1) {
      section = 'main'
    } else if (n === 2) {
      section = i === 0 ? 'warm_up' : 'main'
    } else {
      if (i === 0) section = 'warm_up'
      else if (i === n - 1) section = 'integration'
      else section = 'main'
    }
    return { ...block, section }
  })
}

// ─── Block Card ──────────────────────────────────────────────────────────────
interface BlockCardProps {
  block: EditFlowBlock
  index: number
  total: number
  isSelected: boolean
  onSwap: (index: number) => void
  onRemove: (index: number) => void
  onMoveUp: (index: number) => void
  onMoveDown: (index: number) => void
  fadeAnim?: Animated.Value
}

function BlockCard({ block, index, total, isSelected, onSwap, onRemove, onMoveUp, onMoveDown, fadeAnim }: BlockCardProps): React.JSX.Element {
  return (
    <Animated.View
      style={[
        styles.blockCard,
        isSelected && styles.blockCardSelected,
        fadeAnim && { opacity: fadeAnim, transform: [{ scale: fadeAnim.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) }] },
      ]}
    >
      <View style={[styles.blockNumber, isSelected && styles.blockNumberSelected]}>
        <Text style={[styles.blockNumberText, isSelected && styles.blockNumberTextSelected]}>
          {index + 1}
        </Text>
      </View>

      <View style={styles.blockInfo}>
        <Text style={styles.blockName} numberOfLines={1}>{block.name}</Text>
        {block.description && (
          <Text style={styles.blockDesc} numberOfLines={1}>{block.description}</Text>
        )}
      </View>

      <BlockDeltaViz energyDelta={block.energy_delta} safetyDelta={block.safety_delta} />

      {/* Reorder arrows */}
      <View style={styles.reorderCol}>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onMoveUp(index)
          }}
          style={[styles.reorderBtn, index === 0 && styles.reorderBtnDisabled]}
          activeOpacity={0.7}
          disabled={index === 0}
        >
          <Ionicons name="chevron-up" size={14} color={index === 0 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)'} />
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onMoveDown(index)
          }}
          style={[styles.reorderBtn, index === total - 1 && styles.reorderBtnDisabled]}
          activeOpacity={0.7}
          disabled={index === total - 1}
        >
          <Ionicons name="chevron-down" size={14} color={index === total - 1 ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.5)'} />
        </TouchableOpacity>
      </View>

      {/* Swap button */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          onSwap(index)
        }}
        style={styles.swapBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.swapBtnText}>⇄</Text>
      </TouchableOpacity>

      {/* Remove button */}
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
          onRemove(index)
        }}
        style={styles.removeBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="close" size={14} color="rgba(255,120,120,0.8)" />
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Body Scan Row ───────────────────────────────────────────────────────────
function BodyScanRow(): React.JSX.Element {
  return (
    <View style={[styles.blockCard, styles.bodyScanCard]}>
      <View style={[styles.blockNumber, styles.bodyScanNumber]}>
        <Text style={styles.bodyScanNumberText}>~</Text>
      </View>
      <View style={styles.blockInfo}>
        <Text style={styles.bodyScanName}>Body Scan</Text>
        <Text style={styles.bodyScanSub}>60 sec</Text>
      </View>
      <Ionicons name="leaf-outline" size={14} color="rgba(255,255,255,0.3)" />
    </View>
  )
}

// ─── Library Block Card ──────────────────────────────────────────────────────
interface LibraryBlock {
  id: number
  name: string
  description?: string | null
  energy_delta?: number | null
  safety_delta?: number | null
  canonical_name?: string
  media_url?: string | null
  section?: string
}

interface LibraryBlockCardProps {
  block: LibraryBlock
  stateColor: string
  isInQueue: boolean
  onSelect: (block: LibraryBlock) => void
  onDeselect: (block: LibraryBlock) => void
}

function LibraryBlockCard({ block, stateColor, isInQueue, onSelect, onDeselect }: LibraryBlockCardProps): React.JSX.Element {
  return (
    <TouchableOpacity
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        isInQueue ? onDeselect(block) : onSelect(block)
      }}
      style={[
        styles.libraryBlock,
        { borderColor: isInQueue ? `${stateColor}80` : `${stateColor}30` },
        isInQueue && { backgroundColor: `${stateColor}10` },
      ]}
      activeOpacity={0.85}
    >
      <BlockDeltaViz energyDelta={block.energy_delta} safetyDelta={block.safety_delta} size={36} />
      <View style={styles.libraryBlockInfo}>
        <Text style={styles.libraryBlockName}>{block.name}</Text>
        {block.description && (
          <Text style={styles.libraryBlockDesc} numberOfLines={2}>{block.description}</Text>
        )}
      </View>
      <View style={[
        styles.selectBtn,
        isInQueue
          ? { backgroundColor: `${stateColor}30`, borderColor: stateColor }
          : { backgroundColor: `${stateColor}15`, borderColor: `${stateColor}50` },
      ]}>
        <Text style={[styles.selectBtnText, { color: stateColor }]}>
          {isInQueue ? '✓' : '+'}
        </Text>
      </View>
    </TouchableOpacity>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function EditFlow(): React.JSX.Element {
  const navigation = useNavigation()
  const route = useRoute()

  const {
    segments: initialSegments = [],
    onSave,
  } = (route.params || {}) as { segments?: Segment[]; onSave?: (segments: Segment[]) => void }

  // Extract somi_blocks from the full segments
  const [queue, setQueue] = useState<EditFlowBlock[]>(() =>
    assignSections(
      initialSegments
        .filter((seg: Segment) => seg.type === 'somi_block')
    )
  )

  // Detect body scans
  const hasBsStart = initialSegments.length > 0 && initialSegments[0]?.type === 'body_scan'
  const hasBsEnd =
    initialSegments.length > 0 &&
    initialSegments[initialSegments.length - 1]?.type === 'body_scan' &&
    initialSegments[initialSegments.length - 1]?.section === 'integration'

  const [libraryBlocks, setLibraryBlocks] = useState<LibraryBlock[]>([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [swapIndex, setSwapIndex] = useState<number | null>(null)

  // Swipe-to-dismiss
  const translateX = useRef(new Animated.Value(0)).current
  const screenOpacity = useRef(new Animated.Value(0)).current

  // Entry animation
  useEffect(() => {
    Animated.spring(screenOpacity, {
      toValue: 1,
      useNativeDriver: true,
      tension: 80,
      friction: 12,
    }).start()
  }, [])

  // Swipe-right pan responder for back navigation
  const panResponder = useMemo(() =>
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dx > 10 && Math.abs(gs.dy) < 20,
      onPanResponderMove: (_, gs) => {
        if (gs.dx > 0) translateX.setValue(gs.dx)
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dx > SWIPE_THRESHOLD || gs.vx > SWIPE_VELOCITY) {
          handleDismiss()
        } else {
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 20,
          }).start()
        }
      },
    }), [])

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
      setLibraryBlocks((library || []) as LibraryBlock[])
    }
    loadLibrary()
  }, [])

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    Animated.parallel([
      Animated.timing(translateX, { toValue: SCREEN_WIDTH, duration: 250, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => navigation.goBack())
  }, [navigation, translateX, screenOpacity])

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Rebuild full segments array from the customized queue
    const segments: Segment[] = []

    // Body scan start
    if (hasBsStart) {
      segments.push({
        type: 'body_scan' as const,
        section: 'warm_up' as const,
        duration_seconds: 60,
      })
    }

    // For each block in queue, prepend a micro_integration then the somi_block
    queue.forEach((block) => {
      segments.push({
        type: 'micro_integration' as const,
        section: (block.section || 'main') as SectionName,
        duration_seconds: 20,
      })
      segments.push({
        type: 'somi_block' as const,
        section: (block.section || 'main') as SectionName,
        duration_seconds: block.duration_seconds || 60,
        somi_block_id: block.somi_block_id ?? block.id ?? 0,
        name: block.name,
        canonical_name: block.canonical_name || '',
        url: (block.url ?? block.media_url) || '',
        description: block.description || '',
        energy_delta: block.energy_delta ?? 0,
        safety_delta: block.safety_delta ?? 0,
      })
    })

    // Body scan end
    if (hasBsEnd) {
      segments.push({
        type: 'body_scan' as const,
        section: 'integration' as const,
        duration_seconds: 60,
      })
    }

    if (onSave) {
      onSave(segments)
    }
    Animated.parallel([
      Animated.timing(translateX, { toValue: SCREEN_WIDTH, duration: 250, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => navigation.goBack())
  }, [queue, hasBsStart, hasBsEnd, navigation, translateX, screenOpacity, route.params])

  const handleSwapPress = useCallback((index: number) => {
    setSwapIndex(index)
    setShowLibrary(true)
  }, [])

  const handleLibrarySelect = useCallback((libraryBlock: LibraryBlock) => {
    if (swapIndex == null) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const newQueue = [...queue]
    newQueue[swapIndex] = {
      ...newQueue[swapIndex],
      somi_block_id: libraryBlock.id,
      id: libraryBlock.id,
      name: libraryBlock.name,
      canonical_name: libraryBlock.canonical_name,
      url: libraryBlock.media_url,
      media_url: libraryBlock.media_url,
      description: libraryBlock.description ?? undefined,
      energy_delta: libraryBlock.energy_delta,
      safety_delta: libraryBlock.safety_delta,
    }
    setQueue(assignSections(newQueue))
    setShowLibrary(false)
    setSwapIndex(null)
  }, [queue, swapIndex])

  const handleAddBlock = useCallback((libraryBlock: LibraryBlock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const newBlock: EditFlowBlock = {
      type: 'somi_block',
      somi_block_id: libraryBlock.id,
      id: libraryBlock.id,
      name: libraryBlock.name,
      canonical_name: libraryBlock.canonical_name,
      url: libraryBlock.media_url,
      media_url: libraryBlock.media_url,
      description: libraryBlock.description ?? undefined,
      energy_delta: libraryBlock.energy_delta,
      safety_delta: libraryBlock.safety_delta,
      duration_seconds: 60,
    }
    setQueue(prev => assignSections([...prev, newBlock]))
    setShowLibrary(false)
  }, [])

  const handleRemoveBlock = useCallback((index: number) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setQueue(prev => {
      const newQueue = prev.filter((_, i) => i !== index)
      return assignSections(newQueue)
    })
  }, [])

  const handleMoveUp = useCallback((index: number) => {
    if (index === 0) return
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    setQueue(prev => {
      const newQueue = [...prev]
      ;[newQueue[index - 1], newQueue[index]] = [newQueue[index], newQueue[index - 1]]
      return assignSections(newQueue)
    })
  }, [])

  const handleMoveDown = useCallback((index: number) => {
    setQueue(prev => {
      if (index >= prev.length - 1) return prev
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      const newQueue = [...prev]
      ;[newQueue[index], newQueue[index + 1]] = [newQueue[index + 1], newQueue[index]]
      return assignSections(newQueue)
    })
  }, [])

  const handleCloseLibrary = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowLibrary(false)
    setSwapIndex(null)
  }, [])

  // ── Section grouping ───────────────────────────────────────────────────────
  const groupedBlocks = useMemo(() => {
    if (!queue.length) return []
    const groups: { section: string; items: { block: EditFlowBlock; index: number }[] }[] = []
    let curSection: string | null = null
    queue.forEach((block, i) => {
      const section = block.section || 'main'
      if (section !== curSection) {
        curSection = section
        groups.push({ section, items: [] })
      }
      groups[groups.length - 1].items.push({ block, index: i })
    })
    return groups
  }, [queue])

  // Check which library blocks are already in the queue
  const queueCanonicalNames = useMemo(
    () => new Set(queue.map(b => b.canonical_name).filter(Boolean)),
    [queue]
  )

  const blockCount = queue.length

  return (
    <Animated.View
      style={[styles.container, { opacity: screenOpacity, transform: [{ translateX }] }]}
      {...panResponder.panHandlers}
    >
      {/* Gradient overlay */}
      <LinearGradient
        colors={[colors.background.primary + 'E6', colors.background.secondary + 'F0', colors.background.primary + 'E6']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleDismiss} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Flow</Text>
        <TouchableOpacity onPress={handleSave} style={styles.saveHeaderBtn} activeOpacity={0.7}>
          <Text style={styles.saveHeaderText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Subtitle */}
      <View style={styles.subtitleRow}>
        <Text style={styles.subtitle}>
          {blockCount} exercise{blockCount !== 1 ? 's' : ''}
        </Text>
        <Text style={styles.subtitleDot}> · </Text>
        <Text style={styles.subtitleHint}>Add, remove, reorder, or swap blocks</Text>
      </View>

      {/* Block list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {blockCount === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="add-circle-outline" size={40} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyStateText}>No blocks in your flow</Text>
            <Text style={styles.emptyStateHint}>Tap "Add Block" below to get started</Text>
          </View>
        )}

        {groupedBlocks.map((group, gi) => (
          <View key={group.section}>
            <Text style={styles.sectionHeader}>
              {SECTION_LABELS[group.section] || group.section.toUpperCase()}
            </Text>

            {gi === 0 && hasBsStart && <BodyScanRow />}

            {group.items.map(({ block, index }) => (
              <BlockCard
                key={`${block.canonical_name ?? block.name}-${index}`}
                block={block}
                index={index}
                total={blockCount}
                isSelected={swapIndex === index}
                onSwap={handleSwapPress}
                onRemove={handleRemoveBlock}
                onMoveUp={handleMoveUp}
                onMoveDown={handleMoveDown}
              />
            ))}

            {gi === groupedBlocks.length - 1 && hasBsEnd && <BodyScanRow />}
          </View>
        ))}

        {/* Add block button */}
        <TouchableOpacity
          style={styles.addBlockBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setSwapIndex(null)
            setShowLibrary(true)
          }}
          activeOpacity={0.8}
        >
          <View style={styles.addBlockIcon}>
            <Ionicons name="add" size={20} color={colors.accent.primary} />
          </View>
          <Text style={styles.addBlockBtnText}>Add Block</Text>
        </TouchableOpacity>

        {/* Browse library button */}
        <TouchableOpacity
          style={styles.browseBtn}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            setSwapIndex(null)
            setShowLibrary(true)
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="grid-outline" size={18} color={colors.accent.primary} />
          <Text style={styles.browseBtnText}>Browse Exercise Library</Text>
          <Ionicons name="chevron-forward" size={16} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      </ScrollView>

      {/* Bottom save button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} activeOpacity={0.88}>
          <Text style={styles.saveBtnText}>Save Changes</Text>
        </TouchableOpacity>
      </View>

      {/* ── Library Modal ──────────────────────────────────────────────────────── */}
      <Modal
        visible={showLibrary}
        transparent={false}
        animationType="slide"
        onRequestClose={handleCloseLibrary}
      >
        <View style={styles.libraryContainer}>
          <LinearGradient
            colors={[colors.background.primary, colors.background.secondary + 'F0', colors.background.primary]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={styles.libraryHeader}>
            <TouchableOpacity onPress={handleCloseLibrary} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.libraryTitle}>
              {swapIndex != null ? 'Choose Replacement' : 'Exercise Library'}
            </Text>
            <Text style={styles.librarySubtitle}>
              {swapIndex != null
                ? `Replacing: ${queue[swapIndex]?.name}`
                : `${libraryBlocks.length} exercises · tap + to add`
              }
            </Text>
          </View>

          <ScrollView
            style={styles.libraryScrollView}
            contentContainerStyle={styles.libraryListContent}
            showsVerticalScrollIndicator={false}
          >
            {Object.entries(STATE_COLORS).map(([stateId, stateColor], sectionIndex) => {
              const blocksForState = libraryBlocks.filter(b => {
                const blockState = deriveStateFromDeltas(b.energy_delta ?? null, b.safety_delta ?? null)
                return blockState?.name === stateId
              })
              if (blocksForState.length === 0) return null

              return (
                <View key={stateId}>
                  <View style={[styles.stateHeader, sectionIndex === 0 && { marginTop: 0 }]}>
                    <View style={styles.stateHeaderLine} />
                    <Text style={[styles.stateHeaderText, { color: stateColor }]}>
                      {STATE_LABELS[stateId]}
                    </Text>
                    <View style={styles.stateHeaderLine} />
                  </View>

                  {blocksForState.map((block) => (
                    <LibraryBlockCard
                      key={block.id}
                      block={block}
                      stateColor={stateColor}
                      isInQueue={queueCanonicalNames.has(block.canonical_name)}
                      onSelect={(b) => {
                        if (swapIndex != null) {
                          handleLibrarySelect(b)
                        } else {
                          handleAddBlock(b)
                        }
                      }}
                      onDeselect={(b) => {
                        // Remove from queue when tapping a block already in queue
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
                        setQueue(prev => {
                          const newQueue = prev.filter(q => q.canonical_name !== b.canonical_name)
                          return assignSections(newQueue)
                        })
                      }}
                    />
                  ))}
                </View>
              )
            })}
          </ScrollView>
        </View>
      </Modal>
    </Animated.View>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingHorizontal: H_PAD,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18, fontWeight: '700',
    letterSpacing: 0.3,
  },
  saveHeaderBtn: {
    paddingHorizontal: 16, paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(0,217,163,0.15)',
    borderWidth: 1, borderColor: 'rgba(0,217,163,0.3)',
  },
  saveHeaderText: {
    color: colors.accent.primary,
    fontSize: 14, fontWeight: '600',
  },

  // ── Subtitle ───────────────────────────────────────────────────────────────
  subtitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: H_PAD + 4,
    paddingTop: 4,
    paddingBottom: 16,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13, fontWeight: '600',
  },
  subtitleDot: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 13,
  },
  subtitleHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 13, fontWeight: '400',
  },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 4,
    paddingBottom: 120,
  },

  // ── Empty state ─────────────────────────────────────────────────────────────
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyStateText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 16, fontWeight: '600',
    marginTop: 8,
  },
  emptyStateHint: {
    color: 'rgba(255,255,255,0.25)',
    fontSize: 13, fontWeight: '400',
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 20, marginBottom: 8,
    paddingHorizontal: 4,
  },

  // ── Block card ─────────────────────────────────────────────────────────────
  blockCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 16, marginBottom: 8, gap: 10,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  blockCardSelected: {
    backgroundColor: 'rgba(0,217,163,0.08)',
    borderColor: 'rgba(0,217,163,0.25)',
  },
  blockNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  blockNumberSelected: { backgroundColor: colors.accent.primary },
  blockNumberText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13, fontWeight: '600',
  },
  blockNumberTextSelected: { color: '#000' },
  blockInfo: { flex: 1, gap: 2 },
  blockName: {
    color: '#fff',
    fontSize: 14, fontWeight: '600',
  },
  blockDesc: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11, fontWeight: '400',
  },

  // ── Reorder arrows ──────────────────────────────────────────────────────────
  reorderCol: {
    gap: 2,
  },
  reorderBtn: {
    width: 24, height: 18,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center', justifyContent: 'center',
  },
  reorderBtnDisabled: {
    opacity: 0.4,
  },

  // ── Swap button ─────────────────────────────────────────────────────────────
  swapBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  swapBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14, fontWeight: '500',
  },

  // ── Remove button ──────────────────────────────────────────────────────────
  removeBtn: {
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: 'rgba(255,100,100,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,100,100,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Body scan ──────────────────────────────────────────────────────────────
  bodyScanCard: {
    opacity: 0.7,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderStyle: 'dashed',
  },
  bodyScanNumber: { backgroundColor: 'rgba(255,255,255,0.06)' },
  bodyScanNumberText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600' },
  bodyScanName: { color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: '500', fontStyle: 'italic' },
  bodyScanSub: { color: 'rgba(255,255,255,0.28)', fontSize: 12, fontWeight: '400' },

  // ── Add block button ───────────────────────────────────────────────────────
  addBlockBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, paddingHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    backgroundColor: 'rgba(0,217,163,0.06)',
    borderWidth: 1, borderColor: 'rgba(0,217,163,0.2)',
  },
  addBlockIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(0,217,163,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  addBlockBtnText: {
    flex: 1,
    color: colors.accent.primary,
    fontSize: 15, fontWeight: '600',
  },

  // ── Browse library button ──────────────────────────────────────────────────
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16, paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    borderStyle: 'dashed',
  },
  browseBtnText: {
    flex: 1,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14, fontWeight: '500',
  },

  // ── Bottom bar ─────────────────────────────────────────────────────────────
  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: H_PAD,
    paddingTop: 16, paddingBottom: 40,
  },
  saveBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  saveBtnText: {
    color: '#000',
    fontSize: 17, fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Library modal ──────────────────────────────────────────────────────────
  libraryContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  libraryHeader: {
    paddingTop: 60,
    paddingHorizontal: H_PAD,
    paddingBottom: 20,
  },
  libraryTitle: {
    color: '#fff',
    fontSize: 24, fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 16, marginBottom: 4,
  },
  librarySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, fontWeight: '500',
  },
  libraryScrollView: { flex: 1 },
  libraryListContent: {
    paddingHorizontal: H_PAD,
    paddingTop: 8,
    paddingBottom: 48,
  },
  stateHeader: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: 24, marginBottom: 12, gap: 12,
  },
  stateHeaderLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  stateHeaderText: {
    fontSize: 12, fontWeight: '700',
    letterSpacing: 0.8, textTransform: 'uppercase',
  },
  libraryBlock: {
    flexDirection: 'row', alignItems: 'center',
    gap: 14,
    paddingVertical: 14, paddingHorizontal: 16,
    borderRadius: 16, marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
  },
  libraryBlockInfo: { flex: 1, gap: 4 },
  libraryBlockName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  libraryBlockDesc: { color: 'rgba(255,255,255,0.4)', fontSize: 13, lineHeight: 18 },
  selectBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  selectBtnText: { fontSize: 20, fontWeight: '400', lineHeight: 24 },
})
