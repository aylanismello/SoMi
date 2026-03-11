import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Switch } from 'react-native'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import BlockDeltaViz from './BlockDeltaViz'
import { colors } from '../../constants/theme'

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

// ─── Main component ───────────────────────────────────────────────────────────
/**
 * FlowPlanSheet — unified "Your Flow" bottom-sheet modal.
 *
 * Props
 * ─────
 * visible            bool    – controls Modal visibility (isModal=true mode)
 * onClose            func    – called when user taps Update / dismiss
 * onWhyPress         func?   – if provided, shows "why did SoMi make this?" button
 * queue              array   – somi_block segments to display
 * fullSegments       array   – complete segments array (for body-scan detection)
 * reasoning          string? – AI reasoning text (passed to onWhyPress context)
 * actualDuration     number? – actual duration in seconds (from API)
 * selectedMinutes    number? – user-selected minutes (display fallback)
 * showBodyScanToggles bool   – true when duration ≥ 8 min; shows toggles
 * bodyScanStartEnabled bool  – current state of start body scan
 * bodyScanEndEnabled   bool  – current state of end body scan
 * onToggleBodyScanStart func? – called when start toggle flipped
 * onToggleBodyScanEnd   func? – called when end toggle flipped
 * onSwapBlock        func?   – if provided, adds swap (⇄) button per block
 * isEditMode         bool    – true = show current/past block states
 * currentBlockIndex  number  – which block is "current" in edit mode
 * isModal            bool    – false = render directly (navigation screen use)
 */
export default function FlowPlanSheet({
  visible = false,
  onClose,
  onWhyPress,
  queue = [],
  fullSegments = [],
  reasoning,
  actualDuration,
  selectedMinutes,
  showBodyScanToggles = false,
  bodyScanStartEnabled = true,
  bodyScanEndEnabled = true,
  onToggleBodyScanStart,
  onToggleBodyScanEnd,
  onSwapBlock,
  isEditMode = false,
  currentBlockIndex = 0,
  isModal = true,
  title = 'Your Flow',
  subtitle,
  closeLabel = 'Close',
  completedIndex = -1,
}) {
  const blockCount = queue.length
  const displayMin = actualDuration
    ? Math.ceil(actualDuration / 60)
    : (selectedMinutes ?? 0)

  // Detect body scans in actual segments
  const hasBsStart =
    fullSegments.length > 0 && fullSegments[0]?.type === 'body_scan'
  const hasBsEnd =
    fullSegments.length > 0 &&
    fullSegments[fullSegments.length - 1]?.type === 'body_scan' &&
    fullSegments[fullSegments.length - 1]?.section === 'integration'

  // ── Block renderer ─────────────────────────────────────────────────────────
  const renderBlock = (block, globalIndex) => {
    const isPast       = isEditMode && globalIndex < currentBlockIndex
    const isCurrent    = isEditMode && globalIndex === currentBlockIndex
    const isCompleted  = completedIndex >= 0 && globalIndex < completedIndex
    const isActiveNow  = completedIndex >= 0 && globalIndex === completedIndex
    return (
      <View
        key={`${block.canonical_name ?? block.name}-${globalIndex}`}
        style={[
          styles.planItem,
          isPast && styles.planItemPast,
          isCompleted && styles.planItemCompleted,
          isActiveNow && styles.planItemActiveNow,
        ]}
      >
        <View style={[
          styles.planItemNumber,
          isCurrent && styles.planItemNumberCurrent,
          isActiveNow && styles.planItemNumberActiveNow,
        ]}>
          <Text style={[
            styles.planItemNumberText,
            isCompleted && styles.planItemNumberTextCompleted,
            isActiveNow && styles.planItemNumberTextActiveNow,
          ]}>
            {isCompleted ? '✓' : globalIndex + 1}
          </Text>
        </View>

        <Text
          style={[
            styles.planItemName,
            isPast && styles.planItemNameMuted,
            isCompleted && styles.planItemNameCompleted,
            isActiveNow && styles.planItemNameActiveNow,
          ]}
          numberOfLines={1}
        >
          {block.name}
        </Text>

        <BlockDeltaViz energyDelta={block.energy_delta} safetyDelta={block.safety_delta} />

        {onSwapBlock && !isCompleted && (
          <TouchableOpacity
            onPress={() => {
              if (isPast) return
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onSwapBlock(globalIndex)
            }}
            style={[styles.swapBtn, isPast && styles.swapBtnPast]}
            activeOpacity={isPast ? 1 : 0.7}
            disabled={isPast}
          >
            {isPast
              ? <Ionicons name="lock-closed" size={11} color="rgba(255,255,255,0.4)" />
              : <Text style={styles.swapBtnText}>⇄</Text>
            }
          </TouchableOpacity>
        )}
      </View>
    )
  }

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
              onToggle={onToggleBodyScanStart}
            />
          )}
          {group.items.map(({ block, globalIndex }) => renderBlock(block, globalIndex))}
          {gi === groups.length - 1 && showBsEnd && (
            <BodyScanRow
              enabled={bodyScanEndEnabled}
              showToggle={showBodyScanToggles}
              onToggle={onToggleBodyScanEnd}
            />
          )}
        </View>
      ))
    }

    // Flat (no sections)
    return (
      <>
        {showBsStart && (
          <BodyScanRow
            enabled={bodyScanStartEnabled}
            showToggle={showBodyScanToggles}
            onToggle={onToggleBodyScanStart}
          />
        )}
        {queue.map((block, index) => renderBlock(block, index))}
        {showBsEnd && (
          <BodyScanRow
            enabled={bodyScanEndEnabled}
            showToggle={showBodyScanToggles}
            onToggle={onToggleBodyScanEnd}
          />
        )}
      </>
    )
  }

  // ── Sheet content (shared between modal and direct render) ─────────────────
  const sheetContent = (
    <View style={[styles.sheetContainer, !isModal && styles.sheetContainerFull]}>
      <BlurView intensity={isModal ? 40 : 20} tint="dark" style={styles.sheetBlur}>
        {isModal && <View style={styles.sheetHandle} />}

        <Text style={styles.sheetTitle}>{title}</Text>
        <Text style={styles.sheetSubtitle}>
          {subtitle ?? `${blockCount} exercise${blockCount !== 1 ? 's' : ''} · ${displayMin} min`}
        </Text>

        {/* Why button — TOP, above block list */}
        {reasoning && onWhyPress && (
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              onWhyPress()
            }}
            activeOpacity={0.7}
            style={styles.whyButton}
          >
            <Text style={styles.whyButtonIcon}>✦</Text>
            <Text style={styles.whyButtonText}>why did SoMi make this?</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
          </TouchableOpacity>
        )}

        <ScrollView
          style={styles.sheetScroll}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {renderBlockList()}
        </ScrollView>

        <TouchableOpacity onPress={onClose} style={styles.closeButton} activeOpacity={0.7}>
          <Text style={styles.closeButtonText}>{closeLabel}</Text>
        </TouchableOpacity>
      </BlurView>
    </View>
  )

  if (!isModal) return sheetContent

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.dismissArea} activeOpacity={1} onPress={onClose} />
        {sheetContent}
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  // ── Modal overlay ──────────────────────────────────────────────────────────
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    flexDirection: 'column',
  },
  dismissArea: { flex: 1 },

  // ── Sheet container ────────────────────────────────────────────────────────
  sheetContainer: {
    maxHeight: '88%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetContainerFull: {
    flex: 1,
    maxHeight: undefined,
    borderRadius: 0,
  },
  sheetBlur: {
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40, height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  sheetTitle: {
    color: '#fff',
    fontSize: 22, fontWeight: '700',
    letterSpacing: 0.5, marginBottom: 4,
  },
  sheetSubtitle: {
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

  // ── Scroll ─────────────────────────────────────────────────────────────────
  sheetScroll: { maxHeight: 360 },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeader: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 16, marginBottom: 4,
    paddingHorizontal: 12,
  },

  // ── Block row ──────────────────────────────────────────────────────────────
  planItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 4, gap: 12,
  },
  planItemPast: { opacity: 0.4 },
  planItemCompleted: { opacity: 0.45 },
  planItemActiveNow: {
    backgroundColor: 'rgba(0,217,163,0.12)',
    borderWidth: 1,
    borderColor: '#00D9A3',
  },
  planItemNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  planItemNumberCurrent: { backgroundColor: '#ff6b6b' },
  planItemNumberActiveNow: { backgroundColor: '#00D9A3' },
  planItemNumberText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13, fontWeight: '600',
  },
  planItemNumberTextCompleted: { color: '#00D9A3', fontWeight: '700' },
  planItemNumberTextActiveNow: { color: '#000', fontWeight: '700' },
  planItemName: {
    flex: 1, color: '#fff',
    fontSize: 15, fontWeight: '500',
  },
  planItemNameMuted:     { color: 'rgba(255,255,255,0.4)' },
  planItemNameDimmed:    { color: 'rgba(255,255,255,0.35)' },
  planItemNameCompleted: { textDecorationLine: 'line-through', color: 'rgba(255,255,255,0.35)' },
  planItemNameActiveNow: { color: '#00D9A3', fontWeight: '600' },

  // ── Swap button ────────────────────────────────────────────────────────────
  swapBtn: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  swapBtnPast: { opacity: 0.4 },
  swapBtnText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' },

  // ── Body scan row ──────────────────────────────────────────────────────────
  bodyScanItem: { opacity: 0.85 },
  bodyScanNumber: { backgroundColor: 'rgba(255,255,255,0.07)' },
  bodyScanNumberText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 13, fontWeight: '600',
  },

  // ── Update button ──────────────────────────────────────────────────────────
  closeButton: {
    marginTop: 16, paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  closeButtonText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
