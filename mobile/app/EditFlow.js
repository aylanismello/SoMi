import { useState, useCallback, useRef, useEffect } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Animated } from 'react-native'
import { router, useLocalSearchParams } from 'expo-router'
import { LinearGradient } from 'expo-linear-gradient'
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

// ─── Animated Block Row ──────────────────────────────────────────────────────
function AnimatedBlockRow({ block, globalIndex, onSwap, entranceDelay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current
  const swapAnim = useRef(new Animated.Value(1)).current
  const prevNameRef = useRef(block.name)

  // Entrance animation
  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1, duration: 350, useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0, tension: 80, friction: 12, useNativeDriver: true,
        }),
      ]).start()
    }, entranceDelay)
    return () => clearTimeout(timer)
  }, [])

  // Swap animation — pulse when block name changes
  useEffect(() => {
    if (prevNameRef.current !== block.name) {
      prevNameRef.current = block.name
      swapAnim.setValue(0.4)
      Animated.spring(swapAnim, {
        toValue: 1, tension: 100, friction: 8, useNativeDriver: true,
      }).start()
    }
  }, [block.name])

  return (
    <Animated.View
      style={[
        styles.blockCard,
        {
          opacity: Animated.multiply(fadeAnim, swapAnim),
          transform: [
            { translateY: slideAnim },
            { scale: swapAnim.interpolate({
              inputRange: [0.4, 1],
              outputRange: [0.95, 1],
            })},
          ],
        },
      ]}
    >
      <View style={styles.blockNumberWrap}>
        <Text style={styles.blockNumberText}>{globalIndex + 1}</Text>
      </View>

      <View style={styles.blockContent}>
        <Text style={styles.blockName} numberOfLines={1}>{block.name}</Text>
        {block.description ? (
          <Text style={styles.blockDesc} numberOfLines={1}>{block.description}</Text>
        ) : null}
      </View>

      <BlockDeltaViz energyDelta={block.energy_delta} safetyDelta={block.safety_delta} size={32} />

      <TouchableOpacity
        onPress={() => onSwap(globalIndex)}
        style={styles.swapBtn}
        activeOpacity={0.7}
      >
        <Ionicons name="swap-horizontal" size={16} color="rgba(255,255,255,0.6)" />
      </TouchableOpacity>
    </Animated.View>
  )
}

// ─── Body scan row ───────────────────────────────────────────────────────────
function BodyScanRow({ enabled, showToggle, onToggle, entranceDelay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current
  const slideAnim = useRef(new Animated.Value(20)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
      ]).start()
    }, entranceDelay)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Animated.View
      style={[
        styles.bodyScanCard,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.bodyScanIcon}>
        <Ionicons name="body-outline" size={14} color="rgba(255,255,255,0.4)" />
      </View>
      <Text style={[styles.bodyScanName, !enabled && styles.bodyScanNameDimmed]}>
        Body Scan
      </Text>
      {showToggle ? (
        <Switch
          value={enabled}
          onValueChange={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
            onToggle?.()
          }}
          trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.accent.primary }}
          thumbColor="#ffffff"
          style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
        />
      ) : (
        <Ionicons name="lock-closed" size={13} color="rgba(255,255,255,0.35)" />
      )}
    </Animated.View>
  )
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ label, entranceDelay }) {
  const fadeAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }).start()
    }, entranceDelay)
    return () => clearTimeout(timer)
  }, [])

  return (
    <Animated.View style={[styles.sectionHeaderRow, { opacity: fadeAnim }]}>
      <View style={styles.sectionHeaderLine} />
      <Text style={styles.sectionHeaderText}>{label}</Text>
      <View style={styles.sectionHeaderLine} />
    </Animated.View>
  )
}

// ─── Main Component ──────────────────────────────────────────────────────────
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

  // Header entrance animation
  const headerFade = useRef(new Animated.Value(0)).current
  const headerSlide = useRef(new Animated.Value(-20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerFade, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.spring(headerSlide, { toValue: 0, tension: 80, friction: 12, useNativeDriver: true }),
    ]).start()
  }, [])

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
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

  // ── Block list with staggered animations ─────────────────────────────────
  const renderBlockList = () => {
    if (!queue || queue.length === 0) return null
    const hasSections = !!queue[0]?.section

    const showBsStart = showBodyScanToggles || hasBsStart
    const showBsEnd   = showBodyScanToggles || hasBsEnd

    // Track cumulative delay for staggered entrance
    let delayCounter = 0
    const STAGGER_MS = 60

    if (hasSections) {
      const groups = []
      let curSection = null
      queue.forEach((block, i) => {
        const name = block.section || 'main'
        if (name !== curSection) { curSection = name; groups.push({ name, items: [] }) }
        groups[groups.length - 1].items.push({ block, globalIndex: i })
      })

      return groups.map((group, gi) => {
        const sectionDelay = delayCounter++ * STAGGER_MS
        return (
          <View key={group.name}>
            <SectionHeader label={getSectionLabel(group.name)} entranceDelay={sectionDelay} />

            {gi === 0 && showBsStart && (
              <BodyScanRow
                enabled={bodyScanStartEnabled}
                showToggle={showBodyScanToggles}
                onToggle={handleToggleBsStart}
                entranceDelay={delayCounter++ * STAGGER_MS}
              />
            )}

            {group.items.map(({ block, globalIndex }) => (
              <AnimatedBlockRow
                key={`${block.canonical_name ?? block.name}-${globalIndex}`}
                block={block}
                globalIndex={globalIndex}
                onSwap={handleSwapBlock}
                entranceDelay={delayCounter++ * STAGGER_MS}
              />
            ))}

            {gi === groups.length - 1 && showBsEnd && (
              <BodyScanRow
                enabled={bodyScanEndEnabled}
                showToggle={showBodyScanToggles}
                onToggle={handleToggleBsEnd}
                entranceDelay={delayCounter++ * STAGGER_MS}
              />
            )}
          </View>
        )
      })
    }

    return (
      <>
        {showBsStart && (
          <BodyScanRow
            enabled={bodyScanStartEnabled}
            showToggle={showBodyScanToggles}
            onToggle={handleToggleBsStart}
            entranceDelay={delayCounter++ * STAGGER_MS}
          />
        )}
        {queue.map((block, index) => (
          <AnimatedBlockRow
            key={`${block.canonical_name ?? block.name}-${index}`}
            block={block}
            globalIndex={index}
            onSwap={handleSwapBlock}
            entranceDelay={delayCounter++ * STAGGER_MS}
          />
        ))}
        {showBsEnd && (
          <BodyScanRow
            enabled={bodyScanEndEnabled}
            showToggle={showBodyScanToggles}
            onToggle={handleToggleBsEnd}
            entranceDelay={delayCounter++ * STAGGER_MS}
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
      <Animated.View style={[styles.header, { opacity: headerFade, transform: [{ translateY: headerSlide }] }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Edit Flow</Text>
          <Text style={styles.headerSubtitle}>
            {blockCount} exercise{blockCount !== 1 ? 's' : ''} · {displayMin} min
          </Text>
        </View>
        <View style={{ width: 44 }} />
      </Animated.View>

      {/* AI badge */}
      {useAi && (
        <View style={styles.aiBadge}>
          <Ionicons name="sparkles" size={13} color={colors.accent.primary} />
          <Text style={styles.aiBadgeText}>AI-curated</Text>
        </View>
      )}

      {/* Why button */}
      {reasoning ? (
        <TouchableOpacity style={styles.whyButton} activeOpacity={0.7}>
          <Text style={styles.whyButtonIcon}>✦</Text>
          <Text style={styles.whyButtonText}>Why did SoMi make this?</Text>
          <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
        </TouchableOpacity>
      ) : null}

      {/* Block list */}
      <ScrollView
        style={styles.blockScroll}
        contentContainerStyle={styles.blockScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderBlockList()}
      </ScrollView>

      {/* Done button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={handleBack} style={styles.doneButton} activeOpacity={0.85}>
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
  headerCenter: { alignItems: 'center' },
  headerTitle: {
    color: '#fff',
    fontSize: 18, fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 12, fontWeight: '500',
    marginTop: 2,
  },

  // ── AI badge ───────────────────────────────────────────────────────────────
  aiBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: 'rgba(0,217,163,0.08)',
    borderWidth: 1, borderColor: 'rgba(0,217,163,0.2)',
    marginTop: 8,
    marginBottom: 4,
  },
  aiBadgeText: {
    color: colors.accent.primary,
    fontSize: 12, fontWeight: '600',
    letterSpacing: 0.3,
  },

  // ── Why button ─────────────────────────────────────────────────────────────
  whyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 12, paddingHorizontal: 16,
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  whyButtonIcon: { color: '#ff6b6b', fontSize: 14 },
  whyButtonText: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13, fontWeight: '500', letterSpacing: 0.1,
  },

  // ── Section header ─────────────────────────────────────────────────────────
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 10,
    gap: 12,
  },
  sectionHeaderLine: {
    flex: 1, height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  sectionHeaderText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
  },

  // ── Block scroll ───────────────────────────────────────────────────────────
  blockScroll: { flex: 1 },
  blockScrollContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },

  // ── Block card ─────────────────────────────────────────────────────────────
  blockCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 14,
    borderRadius: 16, marginBottom: 8, gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  blockNumberWrap: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.08)',
    alignItems: 'center', justifyContent: 'center',
  },
  blockNumberText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13, fontWeight: '700',
  },
  blockContent: { flex: 1, gap: 2 },
  blockName: {
    color: '#fff',
    fontSize: 15, fontWeight: '600',
  },
  blockDesc: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 12, fontWeight: '400',
  },

  // ── Swap button ────────────────────────────────────────────────────────────
  swapBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },

  // ── Body scan card ─────────────────────────────────────────────────────────
  bodyScanCard: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, paddingHorizontal: 14,
    borderRadius: 16, marginBottom: 8, gap: 12,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)',
  },
  bodyScanIcon: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center', justifyContent: 'center',
  },
  bodyScanName: {
    flex: 1, color: 'rgba(255,255,255,0.6)',
    fontSize: 15, fontWeight: '500',
  },
  bodyScanNameDimmed: { color: 'rgba(255,255,255,0.3)' },

  // ── Bottom bar ─────────────────────────────────────────────────────────────
  bottomBar: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  doneButton: {
    paddingVertical: 16,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  doneButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
})
