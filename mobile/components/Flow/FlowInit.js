import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { router } from 'expo-router'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Animated, PanResponder, Modal, Switch } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { colors } from '../../constants/theme'
import { useSettingsStore } from '../../stores/settingsStore'
import { useRoutineStore } from '../../stores/routineStore'
import { chainService } from '../../services/chainService'
import { useEditFlowStore } from '../../stores/editFlowStore'
import PolyvagalStatePicker from './PolyvagalStatePicker'
import CustomizationModal from '../CustomizationModal'
import MusicPickerModal from '../MusicPickerModal'
import { api } from '../../services/api'
import { deriveState, getPolyvagalExplanation } from '../../constants/polyvagalStates'

const _H_PAD = 20
const MIN_DURATION = 2
const MAX_DURATION = 60

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
  const {
    bodyScanStart, bodyScanEnd,
    setBodyScanStart, setBodyScanEnd,
    isMusicEnabled, toggleMusic,
  } = useSettingsStore()

  const [selectedMinutes, setSelectedMinutes] = useState(10)
  const [energyLevel, setEnergyLevel]         = useState(50)
  const [safetyLevel, setSafetyLevel]         = useState(50)
  const [isGenerating, setIsGenerating]       = useState(false)
  const [reasoning, setReasoning]             = useState(null)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  const [showCustomization, setShowCustomization]   = useState(false)
  const [showMusicPicker, setShowMusicPicker]       = useState(false)
  const [showPolyvagalInfo, setShowPolyvagalInfo]   = useState(false)

  const fullSegmentsRef = useRef(null)

  const energyRef  = useRef(50)
  const safetyRef  = useRef(50)
  const hasInitializedRef      = useRef(false)
  const isReadyForInputRef     = useRef(false)
  const pendingRegenRef        = useRef(false)

  const glowAnim  = useRef(new Animated.Value(0)).current
  const toastAnim = useRef(new Animated.Value(-120)).current
  const [isToastVisible, setIsToastVisible] = useState(false)
  const isToastShownRef      = useRef(false)
  const toastDismissTimerRef = useRef(null)

  // Glow animation
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

  // Body scan toggles — only relevant when duration ≥ 8 min
  const showBodyScanToggles = selectedMinutes >= 8

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

  // Toast pan responder — swipe up to dismiss, tap to open plan sheet
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
          // Swipe up → dismiss
          dismiss()
        } else if (Math.abs(gs.dy) < 5 && Math.abs(gs.dx) < 5) {
          // Tap → open Edit Flow
          clearTimeout(toastDismissTimerRef.current)
          hideToast()
          handleEditRoutine()
        } else {
          Animated.spring(toastAnim, { toValue: 0, useNativeDriver: true, tension: 200, friction: 15 }).start()
          toastDismissTimerRef.current = setTimeout(hideToast, 2200)
        }
      },
      onPanResponderTerminate: dismiss,
    })
  }, [])

  // ── Generate preview ────────────────────────────────────────────────────────
  // scanStartOverride / scanEndOverride allow passing new values before store updates
  const doGeneratePreview = useCallback(async (
    durationMinutes, energy, safety, isInitial,
    scanStartOverride, scanEndOverride
  ) => {
    setIsGenerating(true)
    try {
      const stateTarget = (energy != null && safety != null)
        ? deriveState(energy, safety).name
        : 'steady'
      const { bodyScanStart: scanStart, bodyScanEnd: scanEnd } = useSettingsStore.getState()
      const effectiveScanStart = scanStartOverride !== undefined ? scanStartOverride : scanStart
      const effectiveScanEnd   = scanEndOverride   !== undefined ? scanEndOverride   : scanEnd

      const now = new Date()
      const result = await api.generateFlow({
        polyvagal_state:  stateTarget,
        duration_minutes: durationMinutes,
        body_scan_start:  effectiveScanStart,
        body_scan_end:    effectiveScanEnd,
        local_hour: now.getHours(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      })
      if (result.segments && result.segments.length > 0) {
        if (result.reasoning) setReasoning(result.reasoning)
        fullSegmentsRef.current = result.segments
        if (!isInitial) showUpdatedToast()
      }
    } catch (err) {
      console.warn('Preview generation failed:', err)
    } finally {
      setIsGenerating(false)
      if (isInitial) isReadyForInputRef.current = true
      // A toggle fired while generating — re-run immediately with latest store values
      if (!isInitial && pendingRegenRef.current) {
        pendingRegenRef.current = false
        const { bodyScanStart: s, bodyScanEnd: e } = useSettingsStore.getState()
        doGeneratePreview(durationMinutes, energy, safety, false, s, e)
      }
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
      setReasoning(null)
      setBodyScanStart(true)
      setBodyScanEnd(true)

      doGeneratePreview(10, 50, 50, true)
    }
  }, [doGeneratePreview]))

  // Sync edited segments back from EditFlowScreen when this screen regains focus
  useFocusEffect(useCallback(() => {
    if (!hasInitializedRef.current) return
    const storeSegs = useEditFlowStore.getState().segments
    if (storeSegs.length > 0) {
      fullSegmentsRef.current = storeSegs
    }
  }, []))

  // ── Event handlers ──────────────────────────────────────────────────────────
  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    hasInitializedRef.current = false
    router.dismissAll()
  }

  const handleEditRoutine = () => {
    if (isGenerating || !fullSegmentsRef.current?.length) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    useEditFlowStore.getState().setSegments(fullSegmentsRef.current)
    useEditFlowStore.getState().setReasoning(reasoning || null)
    router.push('/EditFlow')
  }

  const handleStartFlow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    await chainService.saveCheckToSession(energyLevel, safetyLevel, null)
    const derivedState = deriveState(energyLevel, safetyLevel)
    const segments = fullSegmentsRef.current || []
    const hasBodyScanStart = segments.length > 0 && segments[0].type === 'body_scan'
    useRoutineStore.getState().initializeRoutine({
      totalBlocks:        segments.filter(s => s.type === 'somi_block').length || 1,
      routineType:        'daily_flow',
      savedInitialEnergy: energyLevel,
      savedInitialSafety: safetyLevel,
      savedInitialValue:  0,
      savedInitialState:  derivedState.name,
      segments:           segments,
      isQuickRoutine:     false,
      flowType:           'daily_flow',
    })
    if (hasBodyScanStart) {
      useRoutineStore.getState().setSegmentIndex(1)
      navigation.replace('FlowBodyScan', { isInitial: true, skipToRoutine: true })
    } else {
      navigation.replace('SoMiRoutine')
    }
  }

  // Trigger re-generate when user lifts finger from the XY picker
  const handlePickerDragEnd = useCallback(() => {
    if (!isReadyForInputRef.current || isGenerating) return
    doGeneratePreview(selectedMinutes, energyRef.current, safetyRef.current, false)
  }, [doGeneratePreview, selectedMinutes, isGenerating])

  // Duration save → re-generate immediately
  const handleDurationSave = useCallback((min) => {
    setSelectedMinutes(min)
    if (!isReadyForInputRef.current || isGenerating) return
    doGeneratePreview(min, energyLevel, safetyLevel, false)
  }, [doGeneratePreview, energyLevel, safetyLevel, isGenerating])

  // Body scan toggle handlers
  const handleToggleBodyScanStart = useCallback(() => {
    const newVal = !bodyScanStart
    setBodyScanStart(newVal)
    if (!isReadyForInputRef.current || isGenerating) {
      pendingRegenRef.current = true
      return
    }
    doGeneratePreview(selectedMinutes, energyLevel, safetyLevel, false, newVal, bodyScanEnd)
  }, [bodyScanStart, bodyScanEnd, selectedMinutes, energyLevel, safetyLevel, isGenerating, doGeneratePreview])

  const handleToggleBodyScanEnd = useCallback(() => {
    const newVal = !bodyScanEnd
    setBodyScanEnd(newVal)
    if (!isReadyForInputRef.current || isGenerating) {
      pendingRegenRef.current = true
      return
    }
    doGeneratePreview(selectedMinutes, energyLevel, safetyLevel, false, bodyScanStart, newVal)
  }, [bodyScanStart, bodyScanEnd, selectedMinutes, energyLevel, safetyLevel, isGenerating, doGeneratePreview])

  return (
    <View style={styles.container}>
      {/* Water background comes from the root layout — always pre-rendered, zero flicker */}
      {/* Gradient overlay — deep ocean-blue tint matching Profile screen */}
      <LinearGradient
        colors={[colors.background.primary + 'BF', colors.background.secondary + 'CC', colors.background.primary + 'BF']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Toast — tappable to open plan sheet, swipe-up to dismiss */}
      <Animated.View
        {...toastPanResponder.panHandlers}
        pointerEvents={isToastVisible ? 'auto' : 'none'}
        style={[styles.toast, { transform: [{ translateY: toastAnim }] }]}
      >
        <View style={styles.toastIconWrap}>
          <Ionicons name="checkmark" size={14} color="#fff" />
        </View>
        <Text style={styles.toastText}>Flow Updated</Text>
        <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.35)" />
      </Animated.View>

      {/* Header: edit | X */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleEditRoutine} style={styles.iconButton} activeOpacity={0.7} disabled={isGenerating}>
          {isGenerating
            ? <ActivityIndicator size="small" color={colors.accent.primary} />
            : <Ionicons name="pencil-outline" size={20} color={colors.accent.primary} />
          }
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
          {/* "I'm feeling [chip]" — mirrors FlowOutro's live state display */}
          {(() => {
            const st = deriveState(energyLevel, safetyLevel)
            return (
              <View style={styles.feelingRow}>
                <Text style={styles.feelingLabel}>I'm feeling</Text>
                <View style={styles.stateChip}>
                  <Text style={{ fontSize: 13 }}>{st.icon}</Text>
                  <Text style={styles.stateChipText}>{st.label}</Text>
                </View>
              </View>
            )
          })()}
          <PolyvagalStatePicker
            energyLevel={energyLevel}
            onEnergyChange={(v) => { energyRef.current = v; setEnergyLevel(v) }}
            safetyLevel={safetyLevel}
            onSafetyChange={(v) => { safetyRef.current = v; setSafetyLevel(v) }}
            onDragEnd={handlePickerDragEnd}
            hideReadout
          />
        </View>

        {showBodyScanToggles && (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Body Scans</Text>
            <View style={styles.scanRow}>
              <Text style={styles.scanRowLabel}>Opening Body Scan</Text>
              <Switch
                value={bodyScanStart}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  handleToggleBodyScanStart()
                }}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4ECDC4' }}
                thumbColor="#ffffff"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
            <View style={styles.scanRow}>
              <Text style={styles.scanRowLabel}>Closing Body Scan</Text>
              <Switch
                value={bodyScanEnd}
                onValueChange={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  handleToggleBodyScanEnd()
                }}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: '#4ECDC4' }}
                thumbColor="#ffffff"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
          </View>
        )}

      </ScrollView>

      {/* Sticky bottom: action row + duration pill */}
      <View style={styles.stickyBottom}>
        <View style={styles.actionRow}>
          {/* Music picker button */}
          <TouchableOpacity
            style={styles.sideBtn}
            onPress={() => setShowMusicPicker(true)}
            activeOpacity={0.75}
          >
            <Ionicons
              name="musical-notes"
              size={20}
              color="rgba(255,255,255,0.78)"
            />
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
          <Text style={styles.durationPillText}>
            {selectedMinutes} min
          </Text>
          <Ionicons name="chevron-expand-outline" size={14} color="rgba(255,255,255,0.5)" />
        </TouchableOpacity>
      </View>

      {/* Duration picker modal */}
      <DurationPickerModal
        visible={showDurationPicker}
        minutes={selectedMinutes}
        onClose={() => setShowDurationPicker(false)}
        onSave={handleDurationSave}
      />

      {/* Customization modal */}
      <CustomizationModal visible={showCustomization} onClose={() => setShowCustomization(false)} />
      <MusicPickerModal visible={showMusicPicker} onClose={() => setShowMusicPicker(false)} />

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
  scrollContent: { flexGrow: 1, paddingHorizontal: _H_PAD, paddingTop: 24, paddingBottom: 240 },
  section: { marginBottom: 24 },
  sectionLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionLabel: {
    color: '#ffffff',
    fontSize: 15, fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
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
  feelingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  feelingLabel: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(0,15,35,0.55)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(0,210,255,0.28)',
  },
  stateChipText: {
    color: 'rgba(190,240,255,0.92)',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
  },

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

  // ── Body Scan Toggles ───────────────────────────────────────────────────────
  scanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.07)',
  },
  scanRowLabel: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.2,
    textShadowColor: 'rgba(0,0,0,0.85)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

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
