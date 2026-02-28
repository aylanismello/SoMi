import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { router } from 'expo-router'
import { StyleSheet, View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Animated, PanResponder, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useSettingsStore } from '../stores/settingsStore'
import { useRoutineStore } from '../stores/routineStore'
import { chainService } from '../services/chainService'
import StateXYPicker from './StateXYPicker'
import CustomizationModal from './CustomizationModal'
import { api } from '../services/api'
import { deriveState, deriveStateFromDeltas, getPolyvagalExplanation } from '../constants/polyvagalStates'

const _H_PAD = 20
const MIN_DURATION = 1
const MAX_DURATION = 60

// Polyvagal state emojis (new 2D model)
const STATE_EMOJIS = {
  shutdown: '🌑',
  restful:  '🌦',
  wired:    '🌪',
  glowing:  '☀️',
  steady:   '⛅',
}

const SECTION_LABELS = {
  'warm_up': 'WARM UP',
  'main': 'MAIN',
  'integration': 'INTEGRATION',
}

function getSectionLabel(name) {
  return SECTION_LABELS[name] || name.toUpperCase()
}

// ─── Duration Picker Modal ────────────────────────────────────────────────────
function DurationPickerModal({ visible, minutes, onClose, onSave }) {
  const [localMin, setLocalMin] = useState(minutes)
  const glowAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    if (visible) setLocalMin(minutes)
  }, [visible, minutes])

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
      ])
    )
    loop.start()
    return () => loop.stop()
  }, [])

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.15, 0.5] })
  const glowScale  = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.15] })

  const dec = () => {
    if (localMin <= MIN_DURATION) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLocalMin(v => v - 1)
  }

  const inc = () => {
    if (localMin >= MAX_DURATION) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLocalMin(v => v + 1)
  }

  const save = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onSave(localMin)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFillObject} />
        <View style={dpStyles.content}>
          <View style={dpStyles.row}>
            <TouchableOpacity
              style={[dpStyles.stepBtn, localMin <= MIN_DURATION && dpStyles.stepBtnOff]}
              onPress={dec}
              activeOpacity={0.75}
            >
              <Text style={dpStyles.stepText}>−</Text>
            </TouchableOpacity>

            <View style={dpStyles.circleWrap}>
              <Animated.View style={[dpStyles.circleGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
              <View style={dpStyles.circle}>
                <Text style={dpStyles.circleNum}>{localMin}</Text>
                <Text style={dpStyles.circleUnit}>minutes</Text>
              </View>
            </View>

            <TouchableOpacity
              style={[dpStyles.stepBtn, localMin >= MAX_DURATION && dpStyles.stepBtnOff]}
              onPress={inc}
              activeOpacity={0.75}
            >
              <Text style={dpStyles.stepText}>+</Text>
            </TouchableOpacity>
          </View>

          {localMin < 5 && (
            <Text style={dpStyles.warning}>
              We recommend a minimum of 5 minutes to maintain your streak
            </Text>
          )}

          <TouchableOpacity style={dpStyles.saveBtn} onPress={save} activeOpacity={0.88}>
            <Text style={dpStyles.saveBtnText}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  )
}

const dpStyles = StyleSheet.create({
  content: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: _H_PAD,
    paddingBottom: 52,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 28,
    marginBottom: 32,
  },
  stepBtn: {
    width: 68, height: 68, borderRadius: 34,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center', justifyContent: 'center',
  },
  stepBtnOff: { borderColor: 'rgba(255,255,255,0.18)' },
  stepText: { color: '#fff', fontSize: 30, fontWeight: '300', lineHeight: 34 },
  circleWrap: {
    width: 150, height: 150,
    alignItems: 'center', justifyContent: 'center',
  },
  circleGlow: {
    position: 'absolute',
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: 'rgba(255,255,255,0.22)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 44,
  },
  circle: {
    width: 150, height: 150, borderRadius: 75,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 30,
  },
  circleNum: { color: '#000', fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  circleUnit: { color: '#000', fontSize: 14, fontWeight: '500', marginTop: -4 },
  warning: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  saveBtn: {
    height: 56, borderRadius: 28,
    backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center',
  },
  saveBtnText: { color: '#000', fontSize: 17, fontWeight: '600', letterSpacing: 0.2 },
})

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DailyFlowSetup() {
  const navigation = useNavigation()
  const { bodyScanStart, bodyScanEnd, setBodyScanStart, setBodyScanEnd } = useSettingsStore()

  const [selectedMinutes, setSelectedMinutes] = useState(10)
  const [energyLevel, setEnergyLevel]         = useState(50)
  const [safetyLevel, setSafetyLevel]         = useState(50)
  const [scrollEnabled, setScrollEnabled]     = useState(true)
  const [isGenerating, setIsGenerating]       = useState(false)
  const [previewQueue, setPreviewQueue]       = useState(null)
  const [reasoning, setReasoning]             = useState(null)
  const [showReasoningSheet, setShowReasoningSheet] = useState(false)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [showCustomization, setShowCustomization]   = useState(false)
  const [showPlanSheet, setShowPlanSheet]           = useState(false)
  const [showPolyvagalInfo, setShowPolyvagalInfo]   = useState(false)
  const [isRefreshing, setIsRefreshing]             = useState(false)

  const [actualDuration, setActualDuration] = useState(null)
  const fullSegmentsRef = useRef(null)

  const energyRef  = useRef(50)
  const safetyRef  = useRef(50)
  const lastGeneratedParamsRef = useRef(null)
  const hasInitializedRef      = useRef(false)
  const isReadyForInputRef     = useRef(false)

  const glowAnim  = useRef(new Animated.Value(0)).current
  const toastAnim = useRef(new Animated.Value(-120)).current
  const [isToastVisible, setIsToastVisible] = useState(false)
  const isToastShownRef      = useRef(false)
  const toastDismissTimerRef = useRef(null)

  // Glow animation for the Flow button
  useEffect(() => {
    if (!isGenerating) setIsRefreshing(false)
  }, [isGenerating])

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] })
  const glowScale   = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] })

  const hasDiff = lastGeneratedParamsRef.current !== null && (
    lastGeneratedParamsRef.current.energy   !== energyLevel ||
    lastGeneratedParamsRef.current.safety   !== safetyLevel ||
    lastGeneratedParamsRef.current.minutes  !== selectedMinutes ||
    lastGeneratedParamsRef.current.scanStart !== bodyScanStart ||
    lastGeneratedParamsRef.current.scanEnd   !== bodyScanEnd
  )

  const hideToast = useCallback(() => {
    clearTimeout(toastDismissTimerRef.current)
    Animated.timing(toastAnim, { toValue: -120, duration: 280, useNativeDriver: true }).start(() => {
      isToastShownRef.current = false
      setIsToastVisible(false)
    })
  }, [toastAnim])

  const showUpdatedToast = useCallback(() => {
    clearTimeout(toastDismissTimerRef.current)
    if (!isToastShownRef.current) {
      isToastShownRef.current = true
      setIsToastVisible(true)
      toastAnim.setValue(-120)
      Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 120, friction: 14 }).start()
    }
    toastDismissTimerRef.current = setTimeout(hideToast, 2200)
  }, [toastAnim, hideToast])

  const toastPanResponder = useMemo(() => {
    const dismiss = () => {
      clearTimeout(toastDismissTimerRef.current)
      Animated.timing(toastAnim, { toValue: -120, duration: 200, useNativeDriver: true }).start(() => {
        isToastShownRef.current = false
        setIsToastVisible(false)
      })
    }
    return PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => gs.dy < -3,
      onPanResponderGrant: () => {
        clearTimeout(toastDismissTimerRef.current)
        toastAnim.stopAnimation()
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy < 0) toastAnim.setValue(gs.dy)
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy < -30 || gs.vy < -0.3) {
          dismiss()
        } else {
          Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 200, friction: 15 }).start()
          toastDismissTimerRef.current = setTimeout(hideToast, 2200)
        }
      },
      onPanResponderTerminate: dismiss,
    })
  }, [])

  const doGeneratePreview = useCallback(async (durationMinutes, energy, safety, isInitial) => {
    setIsGenerating(true)
    try {
      const stateTarget = (energy != null && safety != null) ? deriveState(energy, safety).name : 'steady'
      const { bodyScanStart: scanStart, bodyScanEnd: scanEnd } = useSettingsStore.getState()
      const result = await api.generateFlow({
        polyvagal_state: stateTarget,
        duration_minutes: durationMinutes,
        body_scan_start: scanStart,
        body_scan_end: scanEnd,
        use_ai: false,
      })
      if (result.segments && result.segments.length > 0) {
        // Extract somi_block segments as the preview queue (for plan view and player)
        const blockSegments = result.segments.filter(s => s.type === 'somi_block')
        setPreviewQueue(blockSegments)
        setActualDuration(result.actual_duration_seconds)
        if (result.reasoning) setReasoning(result.reasoning)
        // Store full segments for the player
        fullSegmentsRef.current = result.segments
        const { bodyScanStart: scanStart2, bodyScanEnd: scanEnd2 } = useSettingsStore.getState()
        lastGeneratedParamsRef.current = { energy, safety, minutes: durationMinutes, scanStart: scanStart2, scanEnd: scanEnd2 }
        if (!isInitial) showUpdatedToast()
      }
    } catch (err) {
      console.warn('Preview generation failed:', err)
    } finally {
      setIsGenerating(false)
      if (isInitial) isReadyForInputRef.current = true
    }
  }, [showUpdatedToast])

  useFocusEffect(useCallback(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      isReadyForInputRef.current = false

      setSelectedMinutes(10)
      setEnergyLevel(50)
      setSafetyLevel(50)
      energyRef.current = 50
      safetyRef.current = 50
      setScrollEnabled(true)
      setPreviewQueue(null)
      setReasoning(null)
      lastGeneratedParamsRef.current = null
      setBodyScanStart(true)
      setBodyScanEnd(true)

      // Auto-generate immediately with default state
      doGeneratePreview(10, 50, 50, true)
    }
  }, [doGeneratePreview]))

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    hasInitializedRef.current = false
    router.dismissAll()
  }

  const handleEditRoutine = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowPlanSheet(true)
  }

  const handleStartFlow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    await chainService.saveCheckToSession(energyLevel, safetyLevel, null)
    const derivedState = deriveState(energyLevel, safetyLevel)
    // Body scan bookends are now in the segments — check if present
    const segments = fullSegmentsRef.current || []
    const hasBodyScanStart = segments.length > 0 && segments[0].type === 'body_scan'
    useRoutineStore.getState().initializeRoutine({
      totalBlocks: previewQueue?.length ?? 1,
      routineType: 'daily_flow',
      savedInitialEnergy:  energyLevel,
      savedInitialSafety:  safetyLevel,
      savedInitialValue:   0,
      savedInitialState:   derivedState.name,
      customQueue:         previewQueue || null,
      isQuickRoutine:      false,
      flowType:            'daily_flow',
    })
    if (hasBodyScanStart) {
      navigation.replace('BodyScanCountdown', { isInitial: true, skipToRoutine: true })
    } else {
      navigation.replace('SoMiRoutine')
    }
  }

  const handleRefresh = useCallback(() => {
    if (!isReadyForInputRef.current || isGenerating) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsRefreshing(true)
    doGeneratePreview(selectedMinutes, energyLevel, safetyLevel, false)
  }, [doGeneratePreview, selectedMinutes, energyLevel, safetyLevel, isGenerating])

  return (
    <View style={styles.container}>
      {/* Water background */}
      <Image
        source={{ uri: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/home%20screen%20backgrounds/water_1.jpg' }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />
      {/* Dark lens gradient overlay */}
      <LinearGradient
        colors={['rgba(0,0,0,0.48)', 'rgba(0,0,0,0.64)', 'rgba(0,0,0,0.86)']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Toast */}
      <Animated.View
        {...toastPanResponder.panHandlers}
        pointerEvents={isToastVisible ? 'auto' : 'none'}
        style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}
      >
        <View style={styles.toastIconWrap}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
        <Text style={styles.toastText}>Flow Updated</Text>
      </Animated.View>

      {/* Header: edit | X */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEditRoutine} style={styles.iconButton} activeOpacity={0.7}>
          <Ionicons name="pencil-outline" size={20} color={colors.accent.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={handleClose} style={styles.iconButton} activeOpacity={0.7}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Scrollable content */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEnabled={false}
      >
        {/* How do you feel */}
        <View style={styles.section}>
          <View style={styles.sectionLabelRow}>
            <Text style={styles.sectionLabel}>How do you feel in your body?</Text>
            <TouchableOpacity
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPolyvagalInfo(true) }}
              activeOpacity={0.7}
              style={styles.infoBtn}
            >
              <Text style={styles.infoBtnText}>?</Text>
            </TouchableOpacity>
          </View>
          <StateXYPicker
            energyLevel={energyLevel}
            onEnergyChange={(v) => { energyRef.current = v; setEnergyLevel(v) }}
            safetyLevel={safetyLevel}
            onSafetyChange={(v) => { safetyRef.current = v; setSafetyLevel(v) }}
            onDragStart={() => setScrollEnabled(false)}
            onDragEnd={() => setScrollEnabled(true)}
          />
        </View>

      </ScrollView>

      {/* Sticky bottom: action row + duration pill */}
      <View style={styles.stickyBottom}>
        <View style={styles.actionRow}>
          {/* Refresh */}
          <TouchableOpacity
            onPress={handleRefresh}
            activeOpacity={hasDiff && !isRefreshing ? 0.7 : 1}
            style={[styles.sideBtn, (!hasDiff || isRefreshing) && styles.sideBtnOff]}
            disabled={!hasDiff || isGenerating}
          >
            {isRefreshing
              ? <ActivityIndicator size="small" color="rgba(255,255,255,0.78)" />
              : <Ionicons
                  name="refresh"
                  size={20}
                  color={hasDiff ? 'rgba(255,255,255,0.78)' : 'rgba(255,255,255,0.22)'}
                />
            }
          </TouchableOpacity>

          {/* Glowing Flow button */}
          <View style={styles.flowBtnWrapper}>
            <Animated.View style={[styles.flowBtnGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]} />
            <TouchableOpacity style={styles.flowBtn} onPress={handleStartFlow} activeOpacity={0.88} disabled={isGenerating}>
              {isGenerating
                ? <ActivityIndicator color="rgba(0,0,0,0.8)" />
                : <Text style={styles.flowBtnText}>Start</Text>
              }
            </TouchableOpacity>
          </View>

          {/* Customization */}
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowCustomization(true) }}
            activeOpacity={0.75}
          >
            <Ionicons name="options-outline" size={20} color="rgba(255,255,255,0.78)" />
          </TouchableOpacity>
        </View>

        {/* Duration pill */}
        <TouchableOpacity
          style={styles.durationPill}
          onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowDurationPicker(true) }}
          activeOpacity={0.75}
        >
          <Text style={styles.durationPillText}>{actualDuration ? `${Math.ceil(actualDuration / 60)} min` : `${selectedMinutes} min`}</Text>
          <Ionicons name="chevron-expand-outline" size={14} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      {/* Duration picker modal */}
      <DurationPickerModal
        visible={showDurationPicker}
        minutes={selectedMinutes}
        onClose={() => setShowDurationPicker(false)}
        onSave={(min) => setSelectedMinutes(min)}
      />

      {/* Customization modal */}
      <CustomizationModal visible={showCustomization} onClose={() => setShowCustomization(false)} />

      {/* Plan Sheet Modal */}
      <Modal
        visible={showPlanSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPlanSheet(false)}
      >
        <View style={styles.sheetOverlay}>
          <TouchableOpacity style={styles.sheetDismissArea} activeOpacity={1} onPress={() => setShowPlanSheet(false)} />
          <View style={styles.sheetContainer}>
            <BlurView intensity={40} tint="dark" style={styles.sheetBlur}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>Your Plan</Text>
              <Text style={styles.sheetSubtitle}>
                {previewQueue?.length ?? 0} exercises · {actualDuration ? `${Math.ceil(actualDuration / 60)} min` : `~${selectedMinutes} min`}
              </Text>
              <ScrollView style={styles.sheetScroll} showsVerticalScrollIndicator={false}>
                {(() => {
                  if (!previewQueue || previewQueue.length === 0) return null
                  const hasSections = !!previewQueue[0]?.section

                  const renderBlock = (block, globalIndex) => (
                    <View key={`${block.canonical_name}-${globalIndex}`} style={styles.planItem}>
                      <View style={styles.planItemNumber}>
                        <Text style={styles.planItemNumberText}>{globalIndex + 1}</Text>
                      </View>
                      <Text style={styles.planItemName}>{block.name}</Text>
                      {STATE_EMOJIS[deriveStateFromDeltas(block.energy_delta, block.safety_delta)?.name] ? (
                        <Text style={styles.planItemEmoji}>{STATE_EMOJIS[deriveStateFromDeltas(block.energy_delta, block.safety_delta)?.name]}</Text>
                      ) : null}
                    </View>
                  )

                  const renderBodyScanItem = () => (
                    <View key="bodyscan" style={[styles.planItem, styles.bodyScanItem]}>
                      <View style={[styles.planItemNumber, styles.bodyScanNumber]}>
                        <Text style={styles.bodyScanNumberText}>~</Text>
                      </View>
                      <Text style={styles.bodyScanItemName}>Body Scan</Text>
                      <Text style={styles.lockEmoji}>🔒</Text>
                    </View>
                  )

                  const segments = fullSegmentsRef.current || []
                  const hasBodyScanStart = segments.length > 0 && segments[0].type === 'body_scan'
                  const hasBodyScanEnd = segments.length > 0 && segments[segments.length - 1].type === 'body_scan' && segments[segments.length - 1].section === 'integration'

                  if (hasSections) {
                    const groups = []
                    let currentName = null
                    previewQueue.forEach((block, i) => {
                      const name = block.section || 'main'
                      if (name !== currentName) { currentName = name; groups.push({ name, items: [] }) }
                      groups[groups.length - 1].items.push({ block, globalIndex: i })
                    })
                    return groups.map((group, gi) => (
                      <View key={group.name}>
                        <Text style={styles.sectionHeader}>{getSectionLabel(group.name)}</Text>
                        {gi === 0 && hasBodyScanStart && renderBodyScanItem()}
                        {group.items.map(({ block, globalIndex }) => renderBlock(block, globalIndex))}
                        {gi === groups.length - 1 && hasBodyScanEnd && renderBodyScanItem()}
                      </View>
                    ))
                  }

                  return (
                    <>
                      {hasBodyScanStart && renderBodyScanItem()}
                      {previewQueue.map((block, index) => renderBlock(block, index))}
                      {hasBodyScanEnd && renderBodyScanItem()}
                    </>
                  )
                })()}
                {reasoning && previewQueue && previewQueue.length > 0 && (
                  <TouchableOpacity
                    onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setShowPlanSheet(false); setShowReasoningSheet(true) }}
                    activeOpacity={0.7}
                    style={[styles.whyButton, { marginTop: 16, marginBottom: 4 }]}
                  >
                    <Text style={styles.whyButtonIcon}>✦</Text>
                    <Text style={styles.whyButtonText}>Why did SoMi make the flow this way?</Text>
                    <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
                  </TouchableOpacity>
                )}
              </ScrollView>
              <TouchableOpacity onPress={() => setShowPlanSheet(false)} style={styles.sheetCloseButton} activeOpacity={0.7}>
                <Text style={styles.sheetCloseText}>Close</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </Modal>

      {/* Polyvagal State Info Modal */}
      <Modal
        visible={showPolyvagalInfo}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPolyvagalInfo(false)}
      >
        <TouchableOpacity
          style={styles.reasoningOverlay}
          activeOpacity={1}
          onPress={() => setShowPolyvagalInfo(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.reasoningSheet} onPress={() => {}}>
            <View style={styles.reasoningHandle} />
            <Text style={styles.reasoningTitle}>{getPolyvagalExplanation(energyLevel, safetyLevel).title}</Text>
            <Text style={styles.reasoningBody}>{getPolyvagalExplanation(energyLevel, safetyLevel).body}</Text>
            <TouchableOpacity
              onPress={() => setShowPolyvagalInfo(false)}
              style={styles.reasoningDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.reasoningDismissText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Reasoning Sheet Modal */}
      <Modal
        visible={showReasoningSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReasoningSheet(false)}
      >
        <TouchableOpacity
          style={styles.reasoningOverlay}
          activeOpacity={1}
          onPress={() => setShowReasoningSheet(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.reasoningSheet} onPress={() => {}}>
            <View style={styles.reasoningHandle} />
            <Text style={styles.reasoningTitle}>Why this flow?</Text>
            <Text style={styles.reasoningBody}>{reasoning}</Text>
            <TouchableOpacity
              onPress={() => setShowReasoningSheet(false)}
              style={styles.reasoningDismiss}
              activeOpacity={0.7}
            >
              <Text style={styles.reasoningDismissText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 64,
    paddingBottom: 16,
    paddingHorizontal: _H_PAD,
  },
  iconButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: '#fff', fontSize: 24, fontWeight: '300' },

  // ── Scroll ─────────────────────────────────────────────────────────────────
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: _H_PAD, paddingBottom: 240 },
  section: { marginBottom: 24 },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionLabel: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 13, fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  infoBtn: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 1.5, borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center',
  },
  infoBtnText: {
    color: 'rgba(255,255,255,0.5)',
    fontSize: 10, fontWeight: '700',
    lineHeight: 12,
  },

  // ── Plan Sheet ───────────────────────────────────────────────────────────────
  sheetOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', flexDirection: 'column',
  },
  sheetDismissArea: { flex: 1 },
  sheetContainer: {
    maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden',
  },
  sheetBlur: { paddingTop: 12, paddingBottom: 40, paddingHorizontal: 24 },
  sheetHandle: {
    width: 40, height: 4, backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 20,
  },
  sheetTitle: { color: '#fff', fontSize: 22, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4 },
  sheetSubtitle: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '500', marginBottom: 20 },
  sheetScroll: { maxHeight: 400 },
  sectionHeader: {
    color: 'rgba(255,255,255,0.45)', fontSize: 11, fontWeight: '700', letterSpacing: 1.2,
    marginTop: 16, marginBottom: 4, paddingHorizontal: 12,
  },
  planItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 12,
    borderRadius: 12, marginBottom: 4, gap: 12,
  },
  planItemNumber: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  planItemNumberText: { color: 'rgba(255,255,255,0.55)', fontSize: 13, fontWeight: '600' },
  planItemName: { flex: 1, color: '#fff', fontSize: 15, fontWeight: '500' },
  planItemEmoji: { fontSize: 16 },
  bodyScanItem: { opacity: 0.6 },
  bodyScanNumber: { backgroundColor: 'rgba(255,255,255,0.08)' },
  bodyScanNumberText: { color: 'rgba(255,255,255,0.45)', fontSize: 13, fontWeight: '600' },
  bodyScanItemName: { flex: 1, color: 'rgba(255,255,255,0.55)', fontSize: 15, fontWeight: '500', fontStyle: 'italic' },
  lockEmoji: { fontSize: 14 },
  sheetCloseButton: {
    marginTop: 16, paddingVertical: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  sheetCloseText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  // ── Why button ──────────────────────────────────────────────────────────────
  whyButton: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingVertical: 14, paddingHorizontal: 16, marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  whyButtonIcon: { color: colors.accent.primary, fontSize: 14 },
  whyButtonText: { flex: 1, color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500', letterSpacing: 0.1 },

  // ── Sticky bottom ───────────────────────────────────────────────────────────
  stickyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: _H_PAD,
    paddingTop: 16,
    paddingBottom: 36,
    alignItems: 'center',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
    marginBottom: 16,
  },
  sideBtn: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  sideBtnOff: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.06)',
  },
  flowBtnWrapper: {
    width: 118, height: 118,
    alignItems: 'center', justifyContent: 'center',
  },
  flowBtnGlow: {
    position: 'absolute',
    width: 118, height: 118, borderRadius: 59,
    backgroundColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  flowBtn: {
    width: 118, height: 118, borderRadius: 59,
    backgroundColor: '#FFFFFF',
    alignItems: 'center', justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
  },
  flowBtnText: { color: '#000', fontSize: 22, fontWeight: '700', letterSpacing: 0.5 },

  // Duration pill (below action row)
  durationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
  },
  durationPillText: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.2 },

  // ── Reasoning Sheet ─────────────────────────────────────────────────────────
  reasoningOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  reasoningSheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    paddingTop: 12, paddingBottom: 52, paddingHorizontal: 24,
  },
  reasoningHandle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 24,
  },
  reasoningTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginBottom: 16, letterSpacing: 0.2 },
  reasoningBody: { color: 'rgba(255,255,255,0.7)', fontSize: 15, lineHeight: 24, fontWeight: '400', marginBottom: 28 },
  reasoningDismiss: {
    backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 20,
    paddingVertical: 16, alignItems: 'center',
  },
  reasoningDismissText: { color: 'rgba(255,255,255,0.7)', fontSize: 16, fontWeight: '600' },

  // ── Toast ───────────────────────────────────────────────────────────────────
  toast: {
    position: 'absolute', top: 60, left: 16, right: 16,
    backgroundColor: 'rgba(28,28,30,0.97)',
    borderRadius: 18,
    paddingHorizontal: 16, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35, shadowRadius: 20,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  toastIconWrap: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.accent.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  toastText: { color: '#fff', fontSize: 15, fontWeight: '600', letterSpacing: 0.1, flex: 1 },
})
