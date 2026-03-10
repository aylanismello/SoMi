import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import {
  StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal,
  Animated, PanResponder, Dimensions, LayoutAnimation, Platform,
  UIManager,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { colors } from '../../constants/theme'
import { supabase } from '../../supabase'
import { deriveStateFromDeltas } from '../../constants/polyvagalStates'
import BlockDeltaViz from './BlockDeltaViz'

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const { width: SCREEN_WIDTH } = Dimensions.get('window')
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.3
const SWIPE_VELOCITY = 0.5
const H_PAD = 20

const SECTION_LABELS = {
  warm_up: 'WARM UP',
  main: 'MAIN',
  integration: 'INTEGRATION',
}

const STATE_COLORS = {
  shutdown: '#4A5A72',
  restful: '#4ECDC4',
  wired: '#8B5CF6',
  glowing: '#F4B942',
  steady: '#7DBCE7',
}

const STATE_LABELS = {
  shutdown: 'Shutdown',
  restful: 'Restful',
  wired: 'Wired',
  glowing: 'Glowing',
  steady: 'Steady',
}

// ─── Block Card ──────────────────────────────────────────────────────────────
function BlockCard({ block, index, isSelected, onSwap, fadeAnim }) {
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
    </Animated.View>
  )
}

// ─── Body Scan Row ───────────────────────────────────────────────────────────
function BodyScanRow() {
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
function LibraryBlockCard({ block, stateColor, isInQueue, onSelect, onDeselect }) {
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
export default function EditFlow() {
  const navigation = useNavigation()
  const route = useRoute()

  const {
    segments: initialSegments = [],
    onSave,
  } = route.params || {}

  // Extract somi_blocks from the full segments, tagging segment index
  const [queue, setQueue] = useState(() =>
    initialSegments
      .map((seg, i) => ({ ...seg, _segmentIndex: i }))
      .filter(seg => seg.type === 'somi_block')
  )

  // Detect body scans
  const hasBsStart = initialSegments.length > 0 && initialSegments[0]?.type === 'body_scan'
  const hasBsEnd =
    initialSegments.length > 0 &&
    initialSegments[initialSegments.length - 1]?.type === 'body_scan' &&
    initialSegments[initialSegments.length - 1]?.section === 'integration'

  const [libraryBlocks, setLibraryBlocks] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [swapIndex, setSwapIndex] = useState(null)

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
      setLibraryBlocks(library || [])
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
    // Rebuild full segments array with updated blocks
    const updatedSegments = [...initialSegments]
    queue.forEach((block) => {
      if (block._segmentIndex != null) {
        updatedSegments[block._segmentIndex] = {
          ...updatedSegments[block._segmentIndex],
          somi_block_id: block.somi_block_id ?? block.id,
          name: block.name,
          canonical_name: block.canonical_name,
          url: block.url ?? block.media_url,
          description: block.description,
          energy_delta: block.energy_delta,
          safety_delta: block.safety_delta,
        }
      }
    })
    if (route.params?.onSave) {
      route.params.onSave(updatedSegments)
    }
    Animated.parallel([
      Animated.timing(translateX, { toValue: SCREEN_WIDTH, duration: 250, useNativeDriver: true }),
      Animated.timing(screenOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
    ]).start(() => navigation.goBack())
  }, [queue, initialSegments, navigation, translateX, screenOpacity, route.params])

  const handleSwapPress = useCallback((index) => {
    setSwapIndex(index)
    setShowLibrary(true)
  }, [])

  const handleLibrarySelect = useCallback((libraryBlock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
    const newQueue = [...queue]
    newQueue[swapIndex] = {
      ...newQueue[swapIndex],
      somi_block_id: libraryBlock.id,
      name: libraryBlock.name,
      canonical_name: libraryBlock.canonical_name,
      url: libraryBlock.media_url,
      description: libraryBlock.description,
      energy_delta: libraryBlock.energy_delta,
      safety_delta: libraryBlock.safety_delta,
    }
    setQueue(newQueue)
    setShowLibrary(false)
    setSwapIndex(null)
  }, [queue, swapIndex])

  const handleCloseLibrary = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowLibrary(false)
    setSwapIndex(null)
  }, [])

  // ── Section grouping ───────────────────────────────────────────────────────
  const groupedBlocks = useMemo(() => {
    if (!queue.length) return []
    const groups = []
    let curSection = null
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
        <Text style={styles.subtitleHint}>Swap blocks or browse the library</Text>
      </View>

      {/* Block list */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
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
                isSelected={swapIndex === index}
                onSwap={handleSwapPress}
              />
            ))}

            {gi === groupedBlocks.length - 1 && hasBsEnd && <BodyScanRow />}
          </View>
        ))}

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
                : `${libraryBlocks.length} exercises available`
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
                const blockState = deriveStateFromDeltas(b.energy_delta, b.safety_delta)
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
                          // Browse mode — swap not active, just close
                          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
                        }
                      }}
                      onDeselect={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
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
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 16, marginBottom: 8, gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  blockCardSelected: {
    backgroundColor: 'rgba(0,217,163,0.08)',
    borderColor: 'rgba(0,217,163,0.25)',
  },
  blockNumber: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  blockNumberSelected: { backgroundColor: colors.accent.primary },
  blockNumberText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 14, fontWeight: '600',
  },
  blockNumberTextSelected: { color: '#000' },
  blockInfo: { flex: 1, gap: 2 },
  blockName: {
    color: '#fff',
    fontSize: 15, fontWeight: '600',
  },
  blockDesc: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12, fontWeight: '400',
  },
  swapBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  swapBtnText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 16, fontWeight: '500',
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

  // ── Browse library button ──────────────────────────────────────────────────
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 16, paddingHorizontal: 16,
    marginTop: 16,
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
