import { useState, useCallback } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useFlowEditStore } from '../stores/flowEditStore'
import BlockDeltaViz from '../components/Flow/BlockDeltaViz'
import BlockPickerModal from '../components/Flow/BlockPickerModal'

const SECTION_LABELS = {
  warm_up:     'WARM UP',
  main:        'MAIN',
  integration: 'INTEGRATION',
}

function getSectionLabel(name) {
  return SECTION_LABELS[name] || name.toUpperCase()
}

// ─── Body scan row ────────────────────────────────────────────────────────────
function BodyScanRow({ enabled, showToggle, onToggle }) {
  return (
    <View style={[styles.planItem, styles.bodyScanItem]}>
      <View style={[styles.planItemNumber, styles.bodyScanNumber]}>
        <Text style={styles.bodyScanNumberText}>~</Text>
      </View>
      <Text style={[styles.planItemName, !enabled && styles.planItemNameDimmed]}>
        Body Scan
      </Text>
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

export default function EditFlow() {
  const params = useLocalSearchParams()
  const {
    actualDuration: actualDurationStr,
    selectedMinutes: selectedMinutesStr,
    showBodyScanToggles: showBodyScanTogglesStr,
    bodyScanStartEnabled: bodyScanStartStr,
    bodyScanEndEnabled: bodyScanEndStr,
    useAi: useAiStr,
    reasoning,
  } = params

  const actualDuration = actualDurationStr ? Number(actualDurationStr) : null
  const selectedMinutes = selectedMinutesStr ? Number(selectedMinutesStr) : 10
  const showBodyScanToggles = showBodyScanTogglesStr === 'true'
  const initialBsStart = bodyScanStartStr !== 'false'
  const initialBsEnd = bodyScanEndStr !== 'false'
  const useAi = useAiStr === 'true'

  const { segments, swapBlock } = useFlowEditStore()
  const queue = segments.filter(s => s.type === 'somi_block')
  const fullSegments = segments

  const [bodyScanStartEnabled, setBodyScanStartEnabled] = useState(initialBsStart)
  const [bodyScanEndEnabled, setBodyScanEndEnabled] = useState(initialBsEnd)
  const [showPicker, setShowPicker] = useState(false)
  const [swapIndex, setSwapIndex] = useState(null)

  const blockCount = queue.length
  const displayMin = actualDuration
    ? Math.ceil(actualDuration / 60)
    : selectedMinutes

  const hasBsStart =
    fullSegments.length > 0 && fullSegments[0]?.type === 'body_scan'
  const hasBsEnd =
    fullSegments.length > 0 &&
    fullSegments[fullSegments.length - 1]?.type === 'body_scan' &&
    fullSegments[fullSegments.length - 1]?.section === 'integration'

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.back()
  }, [])

  const handleSwapBlock = useCallback((index) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSwapIndex(index)
    setShowPicker(true)
  }, [])

  const handleBlockSelected = useCallback((blockData) => {
    if (swapIndex == null) return
    swapBlock(swapIndex, blockData)
    setShowPicker(false)
    setSwapIndex(null)
  }, [swapIndex, swapBlock])

  const handleToggleBsStart = useCallback(() => {
    setBodyScanStartEnabled(v => !v)
  }, [])

  const handleToggleBsEnd = useCallback(() => {
    setBodyScanEndEnabled(v => !v)
  }, [])

  // ── Block renderer ─────────────────────────────────────────────────────────
  const renderBlock = (block, globalIndex) => (
    <View
      key={`${block.canonical_name ?? block.name}-${globalIndex}`}
      style={styles.planItem}
    >
      <View style={styles.planItemNumber}>
        <Text style={styles.planItemNumberText}>{globalIndex + 1}</Text>
      </View>

      <Text style={styles.planItemName} numberOfLines={1}>
        {block.name}
      </Text>

      <BlockDeltaViz energyDelta={block.energy_delta} safetyDelta={block.safety_delta} />

      <TouchableOpacity
        onPress={() => handleSwapBlock(globalIndex)}
        style={styles.swapBtn}
        activeOpacity={0.7}
      >
        <Text style={styles.swapBtnText}>⇄</Text>
      </TouchableOpacity>
    </View>
  )

  // ── Block list ─────────────────────────────────────────────────────────────
  const renderBlockList = () => {
    if (!queue || queue.length === 0) return null
    const hasSections = !!queue[0]?.section

    const showBsStart = showBodyScanToggles || hasBsStart
    const showBsEnd   = showBodyScanToggles || hasBsEnd

    if (hasSections) {
      const groups = []
      let curSection = null
      queue.forEach((block, i) => {
        const name = block.section || 'main'
        if (name !== curSection) { curSection = name; groups.push({ name, items: [] }) }
        groups[groups.length - 1].items.push({ block, globalIndex: i })
      })

      return groups.map((group, gi) => (
        <View key={group.name}>
          <Text style={styles.sectionHeader}>{getSectionLabel(group.name)}</Text>
          {gi === 0 && showBsStart && (
            <BodyScanRow
              enabled={bodyScanStartEnabled}
              showToggle={showBodyScanToggles}
              onToggle={handleToggleBsStart}
            />
          )}
          {group.items.map(({ block, globalIndex }) => renderBlock(block, globalIndex))}
          {gi === groups.length - 1 && showBsEnd && (
            <BodyScanRow
              enabled={bodyScanEndEnabled}
              showToggle={showBodyScanToggles}
              onToggle={handleToggleBsEnd}
            />
          )}
        </View>
      ))
    }

    return (
      <>
        {showBsStart && (
          <BodyScanRow
            enabled={bodyScanStartEnabled}
            showToggle={showBodyScanToggles}
            onToggle={handleToggleBsStart}
          />
        )}
        {queue.map((block, index) => renderBlock(block, index))}
        {showBsEnd && (
          <BodyScanRow
            enabled={bodyScanEndEnabled}
            showToggle={showBodyScanToggles}
            onToggle={handleToggleBsEnd}
          />
        )}
      </>
    )
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.background.primary + 'BF', colors.background.secondary + 'CC', colors.background.primary + 'BF']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Flow</Text>
        <View style={{ width: 44 }} />
      </View>

      {/* Content */}
      <View style={styles.content}>
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

        {/* AI toggle */}
        {useAi && (
          <View style={[styles.aiRow, styles.aiRowActive]}>
            <View style={styles.aiLeft}>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <View>
                <Text style={[styles.aiLabel, styles.aiLabelActive]}>AI-assisted</Text>
                <Text style={styles.aiSub}>SoMi curated your flow</Text>
              </View>
            </View>
          </View>
        )}

        {/* Block list */}
        <ScrollView
          style={styles.blockScroll}
          contentContainerStyle={styles.blockScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {renderBlockList()}
        </ScrollView>

        {/* Done button */}
        <TouchableOpacity onPress={handleBack} style={styles.doneButton} activeOpacity={0.7}>
          <Text style={styles.doneButtonText}>Done</Text>
        </TouchableOpacity>
      </View>

      {/* Block picker modal */}
      <BlockPickerModal
        visible={showPicker}
        onClose={() => { setShowPicker(false); setSwapIndex(null) }}
        onSelect={handleBlockSelected}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },

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
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 22,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
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
    color: 'rgba(255,255,255,0.45)',
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

  // ── AI row ─────────────────────────────────────────────────────────────────
  aiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    marginBottom: 12,
  },
  aiRowActive: {
    backgroundColor: 'rgba(0,217,163,0.07)',
    borderColor: 'rgba(0,217,163,0.2)',
  },
  aiLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 14, fontWeight: '600',
  },
  aiLabelActive: { color: '#fff' },
  aiSub: {
    color: 'rgba(255,255,255,0.28)',
    fontSize: 11, fontWeight: '400', marginTop: 1,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 16, marginBottom: 4,
    paddingHorizontal: 12,
  },

  // ── Block scroll ───────────────────────────────────────────────────────────
  blockScroll: { flex: 1 },
  blockScrollContent: { paddingBottom: 20 },

  // ── Block row ──────────────────────────────────────────────────────────────
  planItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 4, gap: 12,
  },
  planItemNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  planItemNumberText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13, fontWeight: '600',
  },
  planItemName: {
    flex: 1, color: '#fff',
    fontSize: 15, fontWeight: '500',
  },
  planItemNameDimmed: { color: 'rgba(255,255,255,0.35)' },

  // ── Swap button ────────────────────────────────────────────────────────────
  swapBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  swapBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },

  // ── Body scan row ──────────────────────────────────────────────────────────
  bodyScanItem: { opacity: 0.85 },
  bodyScanNumber: { backgroundColor: 'rgba(255,255,255,0.07)' },
  bodyScanNumberText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, fontWeight: '600',
  },

  // ── Done button ────────────────────────────────────────────────────────────
  doneButton: {
    paddingVertical: 16,
    marginBottom: 36,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
