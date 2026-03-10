import { useState, useEffect } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { colors } from '../../constants/theme'
import { supabase } from '../../supabase'
import { useFlowEditStore } from '../../stores/flowEditStore'
import { deriveStateFromDeltas } from '../../constants/polyvagalStates'
import BlockDeltaViz from './BlockDeltaViz'

const SECTION_LABELS = {
  warm_up:     'WARM UP',
  main:        'MAIN',
  integration: 'INTEGRATION',
}

function getSectionLabel(name) {
  return SECTION_LABELS[name] || name.toUpperCase()
}

const STATE_COLORS = {
  shutdown: '#4A5A72',
  restful:  '#4ECDC4',
  wired:    '#8B5CF6',
  glowing:  '#F4B942',
  steady:   '#7DBCE7',
}

const STATE_LABELS = {
  shutdown: 'Shutdown',
  restful:  'Restful',
  wired:    'Wired',
  glowing:  'Glowing',
  steady:   'Steady',
}

// ─── Body scan row ────────────────────────────────────────────────────────────
function BodyScanRow({ enabled, showToggle, onToggle }) {
  return (
    <View style={[styles.planItem, styles.bodyScanItem]}>
      <View style={[styles.planItemNumber, styles.bodyScanNumber]}>
        <Text style={styles.bodyScanNumberText}>~</Text>
      </View>
      <View style={styles.blockTextWrap}>
        <Text style={[styles.planItemName, !enabled && styles.planItemNameDimmed]}>
          Body Scan
        </Text>
        <Text style={styles.blockDescription}>60 sec</Text>
      </View>
      {showToggle ? (
        <Switch
          value={enabled}
          onValueChange={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onToggle?.()
          }}
          trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4ECDC4' }}
          thumbColor="#ffffff"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      ) : (
        <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.35)" />
      )}
    </View>
  )
}

// ─── Main component ──────────────────────────────────────────────────────────
export default function FlowEditPlan() {
  const navigation = useNavigation()
  const route = useRoute()

  const {
    actualDuration,
    selectedMinutes,
    showBodyScanToggles = false,
    bodyScanStartEnabled = true,
    bodyScanEndEnabled = true,
    reasoning,
    useAi = false,
  } = route.params || {}

  const segments = useFlowEditStore((s) => s.segments)
  const updateSegment = useFlowEditStore((s) => s.updateSegment)

  const [enrichedQueue, setEnrichedQueue] = useState([])
  const [libraryBlocks, setLibraryBlocks] = useState([])
  const [showLibrary, setShowLibrary] = useState(false)
  const [swapIndex, setSwapIndex] = useState(null)

  // Derive queue from store segments
  useEffect(() => {
    if (segments.length > 0) {
      const somiBlocks = segments
        .map((seg, i) => ({ ...seg, _segmentIndex: i }))
        .filter(seg => seg.type === 'somi_block')
      setEnrichedQueue(somiBlocks)
    }
  }, [segments])

  // Detect body scans
  const hasBsStart =
    segments.length > 0 && segments[0]?.type === 'body_scan'
  const hasBsEnd =
    segments.length > 0 &&
    segments[segments.length - 1]?.type === 'body_scan' &&
    segments[segments.length - 1]?.section === 'integration'

  // Load library blocks for swap
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

  const blockCount = enrichedQueue.length
  const displayMin = actualDuration
    ? Math.ceil(actualDuration / 60)
    : (selectedMinutes ?? 0)

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  const handleSwapPress = (index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSwapIndex(index)
    setShowLibrary(true)
  }

  const handleBlockSelect = (libraryBlock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const swapData = {
      somi_block_id:  libraryBlock.id,
      name:           libraryBlock.name,
      canonical_name: libraryBlock.canonical_name,
      url:            libraryBlock.media_url,
      type:           'somi_block',
      description:    libraryBlock.description,
      energy_delta:   libraryBlock.energy_delta,
      safety_delta:   libraryBlock.safety_delta,
    }
    const newQueue = [...enrichedQueue]
    newQueue[swapIndex] = { ...newQueue[swapIndex], ...swapData }
    setEnrichedQueue(newQueue)
    // Persist change to the bridge store so FlowInit picks it up
    updateSegment(newQueue[swapIndex]._segmentIndex, swapData)
    setShowLibrary(false)
    setSwapIndex(null)
  }

  const handleCloseLibrary = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowLibrary(false)
    setSwapIndex(null)
  }

  // ── Block renderer ────────────────────────────────────────────────────────
  const renderBlock = (block, globalIndex) => (
    <View
      key={`${block.canonical_name ?? block.name}-${globalIndex}`}
      style={styles.planItem}
    >
      <View style={styles.planItemNumber}>
        <Text style={styles.planItemNumberText}>{globalIndex + 1}</Text>
      </View>

      <View style={styles.blockTextWrap}>
        <Text style={styles.planItemName} numberOfLines={1}>
          {block.name}
        </Text>
        {block.description && (
          <Text style={styles.blockDescription} numberOfLines={1}>
            {block.description}
          </Text>
        )}
      </View>

      <BlockDeltaViz energyDelta={block.energy_delta} safetyDelta={block.safety_delta} />

      <TouchableOpacity
        onPress={() => handleSwapPress(globalIndex)}
        style={styles.swapBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.swapBtnText}>⇄</Text>
      </TouchableOpacity>
    </View>
  )

  // ── Block list ────────────────────────────────────────────────────────────
  const renderBlockList = () => {
    if (!enrichedQueue || enrichedQueue.length === 0) return null
    const hasSections = !!enrichedQueue[0]?.section

    const showBsStart = showBodyScanToggles || hasBsStart
    const showBsEnd   = showBodyScanToggles || hasBsEnd

    if (hasSections) {
      const groups = []
      let curSection = null
      enrichedQueue.forEach((block, i) => {
        const name = block.section || 'main'
        if (name !== curSection) { curSection = name; groups.push({ name, items: [] }) }
        groups[groups.length - 1].items.push({ block, globalIndex: i })
      })

      return groups.map((group, gi) => (
        <View key={group.name}>
          <Text style={styles.sectionHeader}>{getSectionLabel(group.name)}</Text>
          {gi === 0 && showBsStart && (
            <BodyScanRow enabled={bodyScanStartEnabled} showToggle={false} />
          )}
          {group.items.map(({ block, globalIndex }) => renderBlock(block, globalIndex))}
          {gi === groups.length - 1 && showBsEnd && (
            <BodyScanRow enabled={bodyScanEndEnabled} showToggle={false} />
          )}
        </View>
      ))
    }

    return (
      <>
        {showBsStart && <BodyScanRow enabled={bodyScanStartEnabled} showToggle={false} />}
        {enrichedQueue.map((block, index) => renderBlock(block, index))}
        {showBsEnd && <BodyScanRow enabled={bodyScanEndEnabled} showToggle={false} />}
      </>
    )
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Flow</Text>
        <View style={{ width: 44 }} />
      </View>

      <View style={styles.content}>
        {/* Subtitle */}
        <Text style={styles.subtitle}>
          {blockCount} exercise{blockCount !== 1 ? 's' : ''} · {displayMin} min
        </Text>

        {/* Why button */}
        {reasoning && (
          <View style={styles.whyButton}>
            <Text style={styles.whyButtonIcon}>✦</Text>
            <Text style={styles.whyButtonText}>why did SoMi make this?</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
          </View>
        )}

        {/* Swap hint */}
        <Text style={styles.swapHint}>Tap ⇄ on any exercise to swap it</Text>

        {/* Block list */}
        <ScrollView
          style={styles.queueList}
          contentContainerStyle={styles.queueListContent}
          showsVerticalScrollIndicator={false}
        >
          {renderBlockList()}
        </ScrollView>

        {/* Done button */}
        <TouchableOpacity
          onPress={handleBack}
          style={styles.updateButton}
          activeOpacity={0.8}
        >
          <Text style={styles.updateButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Library Modal */}
      <Modal
        visible={showLibrary}
        transparent={false}
        animationType="slide"
        onRequestClose={handleCloseLibrary}
      >
        <View style={styles.libraryContainer}>
          <View style={styles.libraryHeader}>
            <TouchableOpacity onPress={handleCloseLibrary} style={styles.backBtn} activeOpacity={0.7}>
              <Ionicons name="chevron-down" size={22} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.libraryTitle}>Choose Exercise</Text>
            <Text style={styles.librarySubtitle}>{libraryBlocks.length} exercises available</Text>
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
                    <TouchableOpacity
                      key={block.id}
                      onPress={() => handleBlockSelect(block)}
                      style={[styles.libraryBlock, { borderColor: `${stateColor}40` }]}
                      activeOpacity={0.85}
                    >
                      <BlockDeltaViz
                        energyDelta={block.energy_delta}
                        safetyDelta={block.safety_delta}
                        size={36}
                      />
                      <View style={styles.libraryBlockInfo}>
                        <Text style={styles.libraryBlockName}>{block.name}</Text>
                        {block.description && (
                          <Text style={styles.libraryBlockDesc} numberOfLines={2}>
                            {block.description}
                          </Text>
                        )}
                      </View>
                      <View style={[styles.selectBtn, { backgroundColor: `${stateColor}20`, borderColor: `${stateColor}50` }]}>
                        <Text style={[styles.selectBtnText, { color: stateColor }]}>+</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )
            })}
          </ScrollView>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backBtn: {
    width: 44, height: 44,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 18, fontWeight: '700',
    letterSpacing: 0.3,
  },

  // ── Content ────────────────────────────────────────────────────────────────
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, fontWeight: '500',
    marginBottom: 16,
  },

  // ── Why button ─────────────────────────────────────────────────────────────
  whyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  whyButtonIcon: { color: '#ff6b6b', fontSize: 14 },
  whyButtonText: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13, fontWeight: '500', letterSpacing: 0.1,
  },

  // ── Swap hint ──────────────────────────────────────────────────────────────
  swapHint: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12, fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.2,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 20, marginBottom: 6,
    paddingHorizontal: 12,
  },

  // ── Block list ─────────────────────────────────────────────────────────────
  queueList: { flex: 1 },
  queueListContent: { paddingBottom: 20 },

  // ── Block row ──────────────────────────────────────────────────────────────
  planItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 14, marginBottom: 4, gap: 12,
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  planItemNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  planItemNumberText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13, fontWeight: '600',
  },
  blockTextWrap: { flex: 1, gap: 2 },
  planItemName: {
    color: '#fff',
    fontSize: 15, fontWeight: '500',
  },
  planItemNameDimmed: { color: 'rgba(255,255,255,0.35)' },
  blockDescription: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12, fontWeight: '400',
  },

  // ── Swap button ────────────────────────────────────────────────────────────
  swapBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  swapBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },

  // ── Body scan row ──────────────────────────────────────────────────────────
  bodyScanItem: {
    opacity: 0.7,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderStyle: 'dashed',
  },
  bodyScanNumber: { backgroundColor: 'rgba(255,255,255,0.06)' },
  bodyScanNumberText: { color: 'rgba(255,255,255,0.35)', fontSize: 13, fontWeight: '600' },

  // ── Done button ────────────────────────────────────────────────────────────
  updateButton: {
    paddingVertical: 16,
    marginBottom: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  updateButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

  // ── Library modal ──────────────────────────────────────────────────────────
  libraryContainer: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  libraryHeader: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  libraryTitle: {
    color: '#fff',
    fontSize: 26, fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 16, marginBottom: 4,
  },
  librarySubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, fontWeight: '500',
  },
  libraryScrollView: { flex: 1 },
  libraryListContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 48,
  },
  stateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24, marginBottom: 12,
    gap: 12,
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
  libraryBlockName: {
    color: '#fff', fontSize: 16, fontWeight: '600',
  },
  libraryBlockDesc: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, lineHeight: 18,
  },
  selectBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1,
  },
  selectBtnText: { fontSize: 22, fontWeight: '300', lineHeight: 26 },
})
