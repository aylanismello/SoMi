import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, ActivityIndicator, Animated, PanResponder, Modal, Easing, useWindowDimensions } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useSettingsStore } from '../stores/settingsStore'
import { useRoutineStore } from '../stores/routineStore'
import { chainService } from '../services/chainService'
import { getAutoRoutineType } from '../services/routineConfig'
import StateXYPicker from './StateXYPicker'
import { api } from '../services/api'

// Maps polyvagal state ID (from StateXYPicker) → string expected by the AI endpoint
const STATE_CODE_TO_TARGET = {
  1: 'withdrawn',  // Drained  — dorsal vagal shutdown
  2: 'foggy',      // Foggy    — mild dorsal / blended
  4: 'steady',     // Steady   — ventral vagal
  5: 'glowing',    // Glowing  — high-vitality ventral vagal
  3: 'wired',      // Wired    — sympathetic activation
}

const _H_PAD = 20

const STATE_EMOJIS = {
  withdrawn: '🌧',
  stirring:  '🌫',
  activated: '🌪',
  settling:  '🌤',
  connected: '☀️',
}

const SECTION_LABELS = {
  'warm-up': 'WARM UP',
  'main': 'MAIN',
  'integration': 'INTEGRATION',
}

function getSectionLabel(name) {
  return SECTION_LABELS[name] || name.toUpperCase()
}

const SNAP_POINTS = [5, 10, 15, 20]

// ─── Block count formula ───────────────────────────────────────────────────────
function computeBlockCount(totalMinutes, scanStart, scanEnd) {
  const totalSeconds = totalMinutes * 60
  const bodyScanSeconds = (scanStart ? 60 : 0) + (scanEnd ? 60 : 0)
  const exerciseTime = totalSeconds - bodyScanSeconds
  return Math.max(1, Math.round((exerciseTime + 20) / 80))
}
const MIN_MINUTES = 5
const MAX_MINUTES = 20
const TOTAL_RANGE = MAX_MINUTES - MIN_MINUTES
const THUMB_R = 13

// ─── Duration Slider ──────────────────────────────────────────────────────────
function DurationSlider({ selectedMinutes, onSelect, onDragStart, onDragEnd }) {
  const [trackW, setTrackW] = useState(0)
  const trackWRef = useRef(0)
  const isDraggingRef = useRef(false)
  const lastMinRef = useRef(selectedMinutes)
  const lastSnapHapticRef = useRef(null)
  const [displayMin, setDisplayMin] = useState(selectedMinutes)
  const xAnim = useRef(new Animated.Value(0)).current
  const thumbScaleAnim = useRef(new Animated.Value(1)).current
  const onSelectRef = useRef(onSelect)
  const onDragStartRef = useRef(onDragStart)
  const onDragEndRef = useRef(onDragEnd)
  onSelectRef.current = onSelect
  onDragStartRef.current = onDragStart
  onDragEndRef.current = onDragEnd

  const minToX = (min, w) =>
    w > 0 ? THUMB_R + ((min - MIN_MINUTES) / TOTAL_RANGE) * (w - 2 * THUMB_R) : THUMB_R

  const xToMin = (x, w) => {
    if (w <= 2 * THUMB_R) return MIN_MINUTES
    const t = Math.max(0, Math.min(1, (x - THUMB_R) / (w - 2 * THUMB_R)))
    return Math.round(t * TOTAL_RANGE + MIN_MINUTES)
  }

  const snapToNearest = (min) =>
    SNAP_POINTS.reduce((prev, curr) =>
      Math.abs(curr - min) < Math.abs(prev - min) ? curr : prev
    )

  // Sync thumb position when selectedMinutes changes externally (e.g. screen re-open reset)
  useEffect(() => {
    if (trackW > 0 && !isDraggingRef.current) {
      setDisplayMin(selectedMinutes)
      lastMinRef.current = selectedMinutes
      Animated.spring(xAnim, { toValue: minToX(selectedMinutes, trackW), useNativeDriver: true, tension: 200, friction: 15 }).start()
    }
  }, [selectedMinutes, trackW])

  const panResponder = useMemo(() => {
    const clamp = (x) => Math.max(0, Math.min(trackWRef.current, x))
    return PanResponder.create({
      onStartShouldSetPanResponder:        () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder:         () => true,
      onMoveShouldSetPanResponderCapture:  () => true,
      onPanResponderGrant: (evt) => {
        isDraggingRef.current = true
        xAnim.stopAnimation()
        const x = clamp(evt.nativeEvent.locationX)
        xAnim.setValue(x)
        const min = xToMin(x, trackWRef.current)
        const snapped = snapToNearest(min)
        lastMinRef.current = min
        lastSnapHapticRef.current = snapped
        setDisplayMin(snapped)
        onDragStartRef.current?.()
        Animated.spring(thumbScaleAnim, { toValue: 1.3, useNativeDriver: true, tension: 300, friction: 10 }).start()
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      },
      onPanResponderMove: (evt) => {
        const x = clamp(evt.nativeEvent.locationX)
        xAnim.setValue(x)
        const min = xToMin(x, trackWRef.current)
        if (min !== lastMinRef.current) {
          lastMinRef.current = min
          const snapped = snapToNearest(min)
          setDisplayMin(snapped)
          if (snapped !== lastSnapHapticRef.current) {
            lastSnapHapticRef.current = snapped
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
          }
        }
      },
      onPanResponderRelease: () => {
        isDraggingRef.current = false
        const snapped = snapToNearest(lastMinRef.current)
        lastMinRef.current = snapped
        setDisplayMin(snapped)
        onDragEndRef.current?.()
        Animated.spring(thumbScaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()
        Animated.spring(xAnim, { toValue: minToX(snapped, trackWRef.current), useNativeDriver: true, tension: 300, friction: 20 }).start()
        onSelectRef.current(snapped)
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      },
      onPanResponderTerminate: () => {
        isDraggingRef.current = false
        const snapped = snapToNearest(lastMinRef.current)
        setDisplayMin(snapped)
        onDragEndRef.current?.()
        Animated.spring(thumbScaleAnim, { toValue: 1, useNativeDriver: true, tension: 300, friction: 10 }).start()
        Animated.spring(xAnim, { toValue: minToX(snapped, trackWRef.current), useNativeDriver: true, tension: 300, friction: 20 }).start()
        onSelectRef.current(snapped)
      },
    })
  }, [])

  return (
    <View>
      <View style={sliderStyles.valueRow}>
        <Text style={sliderStyles.valueNum}>{displayMin}</Text>
        <Text style={sliderStyles.valueUnit}> min</Text>
      </View>
      <View
        {...panResponder.panHandlers}
        onLayout={e => {
          const w = e.nativeEvent.layout.width
          setTrackW(w)
          trackWRef.current = w
          xAnim.setValue(minToX(selectedMinutes, w))
        }}
        style={sliderStyles.hitArea}
      >
        <View pointerEvents="none" style={sliderStyles.track} />
        <Animated.View
          pointerEvents="none"
          style={[sliderStyles.thumb, {
            transform: [
              { translateX: Animated.subtract(xAnim, THUMB_R) },
              { scale: thumbScaleAnim },
            ],
          }]}
        />
      </View>
      <View style={sliderStyles.labelsRow}>
        {trackW > 0 && SNAP_POINTS.map((m) => (
          <Text
            key={m}
            style={[
              sliderStyles.snapLabel,
              displayMin === m && sliderStyles.snapLabelActive,
              { position: 'absolute', left: minToX(m, trackW) - 15, width: 30, textAlign: 'center' },
            ]}
          >
            {m}
          </Text>
        ))}
      </View>
    </View>
  )
}

const sliderStyles = StyleSheet.create({
  valueRow: { flexDirection: 'row', alignItems: 'baseline', marginBottom: 20 },
  valueNum: { color: '#fff', fontSize: 48, fontWeight: '700', letterSpacing: -2 },
  valueUnit: { color: 'rgba(255,255,255,0.35)', fontSize: 22, fontWeight: '500' },
  hitArea: { height: 44, position: 'relative' },
  track: {
    position: 'absolute',
    left: THUMB_R, right: THUMB_R,
    top: 20, height: 3,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 2,
  },
  thumb: {
    position: 'absolute',
    top: 9,
    width: THUMB_R * 2,
    height: THUMB_R * 2,
    borderRadius: THUMB_R,
    backgroundColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
  },
  labelsRow: {
    height: 20,
    marginTop: 10,
  },
  snapLabel: { color: 'rgba(255,255,255,0.22)', fontSize: 13, fontWeight: '600' },
  snapLabelActive: { color: colors.accent.primary },
})
// ──────────────────────────────────────────────────────────────────────────────

export default function DailyFlowSetup({ navigation }) {
  const { bodyScanStart, bodyScanEnd, setBodyScanStart, setBodyScanEnd } = useSettingsStore()
  const { height: screenH } = useWindowDimensions()

  const [selectedMinutes, setSelectedMinutes] = useState(10)
  const [sliderValue, setSliderValue] = useState(0)
  const [polyvagalState, setPolyvagalState] = useState(null)
  const [scrollEnabled, setScrollEnabled] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [previewQueue, setPreviewQueue] = useState(null)
  const [reasoning, setReasoning] = useState(null)
  const [showReasoningSheet, setShowReasoningSheet] = useState(false)

  // ─── Focus phase ─────────────────────────────────────────────────────────────
  // 'centered'     → picker is vertically + horizontally centered, rest hidden
  // 'transitioning'→ picker animates up, scroll content fades in
  // 'settled'      → normal full layout
  const [focusPhase, setFocusPhase] = useState('centered')
  const focusPhaseRef = useRef('centered')
  const transitionFiredRef = useRef(false)

  // Stable refs so animation callbacks read current values without stale closures
  const polyvagalStateRef = useRef(null)
  const sliderValueRef = useRef(0)

  // Animated values for the focus → settled transition
  const pickerOverlayTransY = useRef(new Animated.Value(0)).current
  const pickerOverlayOpacity = useRef(new Animated.Value(1)).current
  const contentRevealOpacity = useRef(new Animated.Value(0)).current
  const headerExtrasFade = useRef(new Animated.Value(0)).current
  // ─────────────────────────────────────────────────────────────────────────────

  const lastGeneratedParamsRef = useRef(null)
  const hasDiff = lastGeneratedParamsRef.current !== null && (
    lastGeneratedParamsRef.current.state !== polyvagalState ||
    lastGeneratedParamsRef.current.intensity !== sliderValue ||
    lastGeneratedParamsRef.current.minutes !== selectedMinutes ||
    lastGeneratedParamsRef.current.scanStart !== bodyScanStart ||
    lastGeneratedParamsRef.current.scanEnd !== bodyScanEnd
  )

  const hasInitializedRef = useRef(false)
  const isReadyForInputRef = useRef(false)
  const didEditRef = useRef(false)
  const toastAnim = useRef(new Animated.Value(-120)).current
  const [isToastVisible, setIsToastVisible] = useState(false)
  const isToastShownRef = useRef(false)
  const toastDismissTimerRef = useRef(null)

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

  const doGeneratePreview = useCallback(async (routineType, durationMinutes, state, intensity, isInitial) => {
    setIsGenerating(true)
    try {
      const stateTarget = state ? STATE_CODE_TO_TARGET[state] : null
      const { bodyScanStart: scanStart, bodyScanEnd: scanEnd } = useSettingsStore.getState()
      const blockCount = computeBlockCount(durationMinutes, scanStart, scanEnd)
      const localHour = new Date().getHours()
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const result = await api.generateRoutine(
        routineType,
        blockCount,
        stateTarget ? { polyvagalState: stateTarget, intensity: Math.round(intensity), durationMinutes, blockCount, localHour, timezone } : { durationMinutes, blockCount, localHour, timezone }
      )
      if (result.queue && result.queue.length > 0) {
        setPreviewQueue(result.queue)
        if (result.reasoning) setReasoning(result.reasoning)
        const { bodyScanStart: scanStart, bodyScanEnd: scanEnd } = useSettingsStore.getState()
        lastGeneratedParamsRef.current = {
          state,
          intensity,
          minutes: durationMinutes,
          scanStart,
          scanEnd,
        }
        if (!isInitial) showUpdatedToast()
      }
    } catch (err) {
      console.warn('Preview generation failed:', err)
    } finally {
      setIsGenerating(false)
      if (isInitial) isReadyForInputRef.current = true
    }
  }, [showUpdatedToast])

  // ─── Triggered when user releases on the centered overlay picker ─────────────
  const handleOverlayDragEnd = useCallback(() => {
    setScrollEnabled(true)
    if (transitionFiredRef.current) return
    transitionFiredRef.current = true

    const stateId = polyvagalStateRef.current
    const intensity = sliderValueRef.current

    // Immediately switch to transitioning so the scroll picker mounts
    // (inheriting the already-selected state) and starts fading in
    setFocusPhase('transitioning')
    focusPhaseRef.current = 'transitioning'

    // Kick off API call straight away — runs in parallel with the animation
    doGeneratePreview(getAutoRoutineType(), 10, stateId, intensity, true)

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)

    // Distance to translate the overlay picker upward so it lands approximately
    // where the picker sits in the normal scroll layout
    const availableH = screenH - 100 // subtract approx header height
    const pickerNormalCenterFromTop = 160 // approx: paddingTop + label + half pickerH
    const translateTarget = -(availableH / 2 - pickerNormalCenterFromTop)

    Animated.parallel([
      // Picker content slides up and fades
      Animated.timing(pickerOverlayTransY, {
        toValue: translateTarget,
        duration: 560,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(pickerOverlayOpacity, {
        toValue: 0,
        duration: 380,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
      // Scroll content and header extras fade in after a brief beat
      Animated.timing(contentRevealOpacity, {
        toValue: 1,
        duration: 500,
        delay: 200,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(headerExtrasFade, {
        toValue: 1,
        duration: 340,
        delay: 120,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setFocusPhase('settled')
      focusPhaseRef.current = 'settled'
    })
  }, [doGeneratePreview, screenH])

  const handleRefresh = useCallback(() => {
    if (!isReadyForInputRef.current || isGenerating) return
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    doGeneratePreview(getAutoRoutineType(), selectedMinutes, polyvagalState, sliderValue, false)
  }, [doGeneratePreview, selectedMinutes, polyvagalState, sliderValue, isGenerating])

  useFocusEffect(useCallback(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true
      isReadyForInputRef.current = false
      transitionFiredRef.current = false
      focusPhaseRef.current = 'centered'

      // Reset animation values
      pickerOverlayTransY.setValue(0)
      pickerOverlayOpacity.setValue(1)
      contentRevealOpacity.setValue(0)
      headerExtrasFade.setValue(0)

      setFocusPhase('centered')
      setSelectedMinutes(10)
      setSliderValue(0)
      setPolyvagalState(null)
      polyvagalStateRef.current = null
      sliderValueRef.current = 0
      setScrollEnabled(true)
      setPreviewQueue(null)
      setReasoning(null)
      lastGeneratedParamsRef.current = null
      setBodyScanStart(true)
      setBodyScanEnd(true)
      // No auto-generate — waits for user to select state in the centered picker
    } else if (didEditRef.current) {
      didEditRef.current = false
      const { hardcodedQueue } = useRoutineStore.getState()
      if (hardcodedQueue && hardcodedQueue.length > 0) {
        setPreviewQueue(hardcodedQueue)
      }
    }
  }, [doGeneratePreview]))

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    hasInitializedRef.current = false
    const tabNavigator = navigation.getParent()
    if (tabNavigator) tabNavigator.navigate('Home')
  }

  const handleEditRoutine = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const routineType = getAutoRoutineType()
    useRoutineStore.getState().initializeRoutine({
      totalBlocks: previewQueue?.length ?? selectedMinutes,
      routineType,
      savedInitialValue: sliderValue || 0,
      savedInitialState: polyvagalState || 4,
      customQueue: previewQueue || null,
      isQuickRoutine: false,
      flowType: 'daily_flow',
    })
    didEditRef.current = true
    navigation.navigate('RoutineQueuePreview', {
      isEditMode: true,
      displayMinutes: selectedMinutes,
      isDailyFlow: true,
    })
  }

  const handleStartFlow = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    if (polyvagalState) {
      await chainService.saveCheckToSession(sliderValue, polyvagalState, null)
    }
    useRoutineStore.getState().initializeRoutine({
      totalBlocks: previewQueue?.length ?? selectedMinutes,
      routineType: getAutoRoutineType(),
      savedInitialValue: sliderValue || 0,
      savedInitialState: polyvagalState || 4,
      customQueue: previewQueue || null,
      isQuickRoutine: false,
      flowType: 'daily_flow',
    })
    if (bodyScanStart) {
      navigation.replace('BodyScanCountdown', { isInitial: true, skipToRoutine: true })
    } else {
      navigation.replace('SoMiRoutine')
    }
  }

  const isCentered = focusPhase === 'centered'
  const isTransitioning = focusPhase === 'transitioning'

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      {/* Flow Updated toast */}
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

      {/* Header: pencil + title fade in after transition; X always visible */}
      <View style={styles.header}>
        <Animated.View style={{ opacity: headerExtrasFade }}>
          <TouchableOpacity onPress={handleEditRoutine} style={styles.iconButton} activeOpacity={0.7}>
            <Ionicons name="pencil-outline" size={20} color={colors.accent.primary} />
          </TouchableOpacity>
        </Animated.View>
        <Animated.View style={{ opacity: headerExtrasFade }}>
          <Text style={styles.headerTitle}>Daily Flow</Text>
        </Animated.View>
        <TouchableOpacity onPress={handleClose} style={styles.iconButton} activeOpacity={0.7}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Main scrollable area — invisible until transition, blocked from touches in centered */}
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1 }} pointerEvents={isCentered ? 'none' : 'auto'}>
          <Animated.View style={{ flex: 1, opacity: contentRevealOpacity }}>
            <ScrollView
              style={styles.scrollView}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              scrollEnabled={scrollEnabled}
            >
              {/* How do you feel? — only mount picker after centered phase so there's
                  exactly one picker instance at a time (avoids double mount effects) */}
              {!isCentered && (
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>How do you feel in your body?</Text>
                  <StateXYPicker
                    selectedStateId={polyvagalState}
                    onStateChange={(id) => {
                      polyvagalStateRef.current = id
                      setPolyvagalState(id)
                    }}
                    intensityValue={sliderValue}
                    onIntensityChange={(v) => {
                      sliderValueRef.current = v
                      setSliderValue(v)
                    }}
                    onDragStart={() => setScrollEnabled(false)}
                    onDragEnd={() => setScrollEnabled(true)}
                  />
                </View>
              )}

              {/* Duration */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>Duration</Text>
                <DurationSlider
                  selectedMinutes={selectedMinutes}
                  onSelect={(min) => {
                    if (min === selectedMinutes) return
                    setSelectedMinutes(min)
                  }}
                  onDragStart={() => setScrollEnabled(false)}
                  onDragEnd={() => setScrollEnabled(true)}
                />
              </View>

              {/* Your Routine */}
              <View style={styles.section}>
                <View style={styles.routineHeaderRow}>
                  <Text style={styles.sectionLabel}>Your Routine</Text>
                  <TouchableOpacity onPress={handleEditRoutine} activeOpacity={0.7}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.routineList}>
                  {isGenerating && !previewQueue ? (
                    <ActivityIndicator color={colors.accent.primary} style={styles.loader} />
                  ) : previewQueue && previewQueue.length > 0 ? (() => {
                    const hasSections = !!previewQueue[0]?.section
                    const renderBodyScanStart = () => (
                      <View style={styles.routineToggleItem}>
                        <View style={styles.routineItemIndex}>
                          <Text style={styles.routineItemIndexText}>~</Text>
                        </View>
                        <Text style={[styles.routineItemName, !bodyScanStart && styles.routineItemNameDisabled]}>Body Scan</Text>
                        <Switch
                          value={bodyScanStart}
                          onValueChange={(val) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBodyScanStart(val) }}
                          trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.accent.primary + '60' }}
                          thumbColor={bodyScanStart ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                          style={styles.routineSwitch}
                        />
                      </View>
                    )
                    const renderBodyScanEnd = () => (
                      <View style={styles.routineToggleItem}>
                        <View style={styles.routineItemIndex}>
                          <Text style={styles.routineItemIndexText}>~</Text>
                        </View>
                        <Text style={[styles.routineItemName, !bodyScanEnd && styles.routineItemNameDisabled]}>Body Scan</Text>
                        <Switch
                          value={bodyScanEnd}
                          onValueChange={(val) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBodyScanEnd(val) }}
                          trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.accent.primary + '60' }}
                          thumbColor={bodyScanEnd ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                          style={styles.routineSwitch}
                        />
                      </View>
                    )

                    if (hasSections) {
                      const groups = []
                      let currentName = null
                      previewQueue.forEach((item) => {
                        const name = item.section || 'main'
                        if (name !== currentName) {
                          currentName = name
                          groups.push({ name, items: [] })
                        }
                        groups[groups.length - 1].items.push(item)
                      })

                      return groups.map((group, groupIdx) => (
                        <View key={group.name} style={styles.routineSectionGroup}>
                          <Text style={styles.routineSectionHeader}>{getSectionLabel(group.name)}</Text>
                          {groupIdx === 0 && renderBodyScanStart()}
                          {group.items.map((item) => {
                            const globalIndex = previewQueue.indexOf(item)
                            return (
                              <View key={item.canonical_name + globalIndex} style={[styles.routineItem, isGenerating && { opacity: 0.4 }]}>
                                <View style={styles.routineItemIndex}>
                                  <Text style={styles.routineItemIndexText}>{globalIndex + 1}</Text>
                                </View>
                                <Text style={styles.routineItemName}>{item.name}</Text>
                                {STATE_EMOJIS[item.state_target] && (
                                  <Text style={styles.routineItemEmoji}>{STATE_EMOJIS[item.state_target]}</Text>
                                )}
                              </View>
                            )
                          })}
                          {groupIdx === groups.length - 1 && renderBodyScanEnd()}
                        </View>
                      ))
                    }

                    return (
                      <>
                        {renderBodyScanStart()}
                        {previewQueue.map((item, index) => (
                          <View key={item.canonical_name + index} style={[styles.routineItem, isGenerating && { opacity: 0.4 }]}>
                            <View style={styles.routineItemIndex}>
                              <Text style={styles.routineItemIndexText}>{index + 1}</Text>
                            </View>
                            <Text style={styles.routineItemName}>{item.name}</Text>
                            {STATE_EMOJIS[item.state_target] && (
                              <Text style={styles.routineItemEmoji}>{STATE_EMOJIS[item.state_target]}</Text>
                            )}
                          </View>
                        ))}
                        {renderBodyScanEnd()}
                      </>
                    )
                  })() : (
                    <>
                      <View style={styles.routineToggleItem}>
                        <View style={styles.routineItemIndex}>
                          <Text style={styles.routineItemIndexText}>~</Text>
                        </View>
                        <Text style={[styles.routineItemName, !bodyScanStart && styles.routineItemNameDisabled]}>Body Scan</Text>
                        <Switch
                          value={bodyScanStart}
                          onValueChange={(val) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBodyScanStart(val) }}
                          trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.accent.primary + '60' }}
                          thumbColor={bodyScanStart ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                          style={styles.routineSwitch}
                        />
                      </View>
                      <Text style={styles.noBlocksText}>No exercises found</Text>
                      <View style={styles.routineToggleItem}>
                        <View style={styles.routineItemIndex}>
                          <Text style={styles.routineItemIndexText}>~</Text>
                        </View>
                        <Text style={[styles.routineItemName, !bodyScanEnd && styles.routineItemNameDisabled]}>Body Scan</Text>
                        <Switch
                          value={bodyScanEnd}
                          onValueChange={(val) => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setBodyScanEnd(val) }}
                          trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.accent.primary + '60' }}
                          thumbColor={bodyScanEnd ? '#ffffff' : 'rgba(255,255,255,0.5)'}
                          style={styles.routineSwitch}
                        />
                      </View>
                    </>
                  )}
                </View>
              </View>

              {reasoning && previewQueue && previewQueue.length > 0 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setShowReasoningSheet(true)
                  }}
                  activeOpacity={0.7}
                  style={styles.whyButton}
                >
                  <Text style={styles.whyButtonIcon}>✦</Text>
                  <Text style={styles.whyButtonText}>Why did SoMi make the flow this way?</Text>
                  <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.3)" />
                </TouchableOpacity>
              )}

              <View style={{ height: 160 }} />
            </ScrollView>
          </Animated.View>
        </View>

        {/* ── Centered overlay picker — visible during 'centered' and 'transitioning' ── */}
        {!isCentered ? null : (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="box-none">
            {/* Dark backdrop fades out in place */}
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, styles.overlayBackdrop, { opacity: pickerOverlayOpacity }]}
            />
            {/* Picker content slides up and fades */}
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.overlayContent,
                {
                  opacity: pickerOverlayOpacity,
                  transform: [{ translateY: pickerOverlayTransY }],
                },
              ]}
            >
              <Text style={styles.focusPrompt}>How do you feel{'\n'}in your body?</Text>
              <View style={{ width: '100%', paddingHorizontal: _H_PAD }}>
                <StateXYPicker
                  selectedStateId={polyvagalState}
                  onStateChange={(id) => {
                    polyvagalStateRef.current = id
                    setPolyvagalState(id)
                  }}
                  intensityValue={sliderValue}
                  onIntensityChange={(v) => {
                    sliderValueRef.current = v
                    setSliderValue(v)
                  }}
                  onDragStart={() => setScrollEnabled(false)}
                  onDragEnd={handleOverlayDragEnd}
                />
              </View>
            </Animated.View>
          </View>
        )}

        {/* Transitioning: same overlay but now fading out while scroll fades in */}
        {isTransitioning && (
          <View style={StyleSheet.absoluteFillObject} pointerEvents="none">
            <Animated.View
              pointerEvents="none"
              style={[StyleSheet.absoluteFillObject, styles.overlayBackdrop, { opacity: pickerOverlayOpacity }]}
            />
            <Animated.View
              style={[
                StyleSheet.absoluteFill,
                styles.overlayContent,
                {
                  opacity: pickerOverlayOpacity,
                  transform: [{ translateY: pickerOverlayTransY }],
                },
              ]}
            >
              <Text style={styles.focusPrompt}>How do you feel{'\n'}in your body?</Text>
              <View style={{ width: '100%', paddingHorizontal: _H_PAD }}>
                <StateXYPicker
                  selectedStateId={polyvagalState}
                  onStateChange={(id) => {
                    polyvagalStateRef.current = id
                    setPolyvagalState(id)
                  }}
                  intensityValue={sliderValue}
                  onIntensityChange={(v) => {
                    sliderValueRef.current = v
                    setSliderValue(v)
                  }}
                  onDragStart={() => {}}
                  onDragEnd={() => {}}
                />
              </View>
            </Animated.View>
          </View>
        )}
      </View>

      {/* Sticky Start — fades in with the rest of the content */}
      <Animated.View
        style={[styles.stickyBottom, { opacity: contentRevealOpacity }]}
        pointerEvents={focusPhase === 'settled' ? 'auto' : 'none'}
      >
        <View style={styles.startRow}>
          <TouchableOpacity onPress={handleStartFlow} activeOpacity={0.75} style={styles.startButton} disabled={isGenerating}>
            {isGenerating ? (
              <ActivityIndicator color="rgba(255,255,255,0.7)" style={{ flex: 1 }} />
            ) : (
              <>
                <Text style={styles.startButtonText}>Start Flow</Text>
                <Text style={styles.startButtonArrow}>›</Text>
              </>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleRefresh}
            activeOpacity={hasDiff ? 0.7 : 1}
            style={[styles.refreshButton, !hasDiff && styles.refreshButtonDisabled]}
            disabled={!hasDiff || isGenerating}
          >
            <Ionicons
              name="refresh"
              size={20}
              color={hasDiff ? colors.accent.primary : 'rgba(255,255,255,0.2)'}
            />
          </TouchableOpacity>
        </View>
      </Animated.View>

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
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
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
    backgroundColor: colors.surface.tertiary,
    borderWidth: 1, borderColor: colors.border.default,
    alignItems: 'center', justifyContent: 'center',
  },
  closeText: { color: colors.text.primary, fontSize: 24, fontWeight: '300' },
  headerTitle: { color: colors.text.primary, fontSize: 20, fontWeight: '700', letterSpacing: 0.5 },

  // ─── Centered overlay ───────────────────────────────────────────────────────
  overlayBackdrop: {
  },
  overlayContent: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 120,
  },
  focusPrompt: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.2,
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 28,
    paddingHorizontal: _H_PAD,
  },
  // ───────────────────────────────────────────────────────────────────────────

  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: _H_PAD, paddingTop: 8 },
  section: { marginBottom: 32 },
  sectionLabel: {
    color: colors.text.primary, fontSize: 16, fontWeight: '600',
    letterSpacing: 0.3, marginBottom: 14,
  },
  routineHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14,
  },
  editLink: { color: colors.accent.primary, fontSize: 14, fontWeight: '600' },
  loader: { paddingVertical: 20 },
  routineList: { gap: 12 },
  routineSectionGroup: {
    gap: 6,
  },
  routineSectionHeader: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  routineItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 14, paddingHorizontal: 16,
    backgroundColor: colors.surface.tertiary, borderRadius: 14, gap: 12,
  },
  routineToggleItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 10, paddingLeft: 16, paddingRight: 8,
    backgroundColor: colors.surface.tertiary, borderRadius: 14, gap: 12,
    borderWidth: 1, borderColor: colors.border.subtle, borderStyle: 'dashed',
  },
  routineItemIndex: {
    width: 26, height: 26, borderRadius: 13,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  routineItemIndexText: { color: colors.text.muted, fontSize: 12, fontWeight: '600' },
  routineItemName: { flex: 1, color: colors.text.primary, fontSize: 15, fontWeight: '500' },
  routineItemNameDisabled: { color: colors.text.muted },
  routineItemEmoji: { fontSize: 16 },
  routineSwitch: { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] },
  noBlocksText: {
    color: colors.text.muted, fontSize: 14, fontWeight: '500',
    textAlign: 'center', paddingVertical: 20,
  },
  stickyBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: _H_PAD, paddingBottom: 40, paddingTop: 16,
    backgroundColor: colors.background.primary + 'F0',
  },
  startRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  startButton: {
    flex: 1,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  startButtonText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  startButtonArrow: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 28,
    fontWeight: '300',
  },
  refreshButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: colors.accent.primary + '50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  refreshButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.1)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  whyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  whyButtonIcon: {
    color: colors.accent.primary,
    fontSize: 14,
  },
  whyButtonText: {
    flex: 1,
    color: 'rgba(255,255,255,0.5)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  reasoningOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  reasoningSheet: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 52,
    paddingHorizontal: 24,
  },
  reasoningHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 24,
  },
  reasoningTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
    letterSpacing: 0.2,
  },
  reasoningBody: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 15,
    lineHeight: 24,
    fontWeight: '400',
    marginBottom: 28,
  },
  reasoningDismiss: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  reasoningDismissText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
    fontWeight: '600',
  },
  toast: {
    position: 'absolute',
    top: 60,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(28,28,30,0.97)',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  toastIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toastText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.1,
    flex: 1,
  },
})
