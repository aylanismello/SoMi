import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Animated, Modal, TextInput, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, ScrollView, ActivityIndicator } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import Svg, { Path, Circle } from 'react-native-svg'
import { getMediaForSliderValue, getSOSMedia, BODY_SCAN_MEDIA } from '../constants/media'
import EmbodimentSlider, { POLYVAGAL_STATE_MAP, STATE_DESCRIPTIONS } from './EmbodimentSlider'
import { supabase, somiChainService } from '../supabase'

// Polyvagal states for chip selection (new code-based system)
const POLYVAGAL_STATES = [
  { id: 1, label: 'Drained', color: '#7b68ee' },
  { id: 2, label: 'Foggy', color: '#9d7be8' },
  { id: 3, label: 'Wired', color: '#b88ddc' },
  { id: 4, label: 'Steady', color: '#68c9ba' },
  { id: 5, label: 'Glowing', color: '#4ecdc4' },
]

const STATE_EMOJIS = {
  0: '🆘',
  1: '🌧',
  2: '🌫',
  3: '🌪',
  4: '🌤',
  5: '☀️',
}

// Old state_target values from somi_blocks (backwards compatibility)
const OLD_STATE_EMOJIS = {
  withdrawn: '🌧',
  stirring: '🌫',
  activated: '🌪',
  settling: '🌤',
  connected: '☀️',
}

// Old state info for somi_blocks (backwards compatibility)
const OLD_STATE_INFO = {
  withdrawn: { id: 'withdrawn', label: 'Withdrawn', color: '#7b68ee' },
  stirring: { id: 'stirring', label: 'Stirring', color: '#9d7be8' },
  activated: { id: 'activated', label: 'Activated', color: '#b88ddc' },
  settling: { id: 'settling', label: 'Settling', color: '#68c9ba' },
  connected: { id: 'connected', label: 'Connected', color: '#4ecdc4' },
}

export default function SoMeCheckIn({ navigation, route }) {
  // Check if we're coming back from player (step 4)
  const fromPlayer = route?.params?.fromPlayer || false

  const [sliderValue, setSliderValue] = useState(0)
  const [sliderChanged, setSliderChanged] = useState(false)
  const [polyvagalState, setPolyvagalState] = useState(null)
  const [currentStep, setCurrentStep] = useState(fromPlayer ? 4 : 1) // 1: initial check-in, 2: selection, 3: player, 4: loop check-in
  const [showConfirmMessage, setShowConfirmMessage] = useState(false)
  const [messageOpacity] = useState(new Animated.Value(0))

  // Separate state for loop check-in (Step 4)
  const [loopSliderValue, setLoopSliderValue] = useState(0)
  const [loopPolyvagalState, setLoopPolyvagalState] = useState(null)

  // Store initial values from Step 1 to show transition later
  const [initialSliderValue, setInitialSliderValue] = useState(0)
  const [initialPolyvagalState, setInitialPolyvagalState] = useState(null)

  // Transition modal state
  const [showTransitionModal, setShowTransitionModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // 'continue' or 'done'

  // Journal entry state
  const [journalEntry, setJournalEntry] = useState('')
  const [loopJournalEntry, setLoopJournalEntry] = useState('')
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [journalForStep, setJournalForStep] = useState(1) // Track which step the journal is for
  const journalInputRef = useRef(null)

  // Exercise selection modal state
  const [showExerciseModal, setShowExerciseModal] = useState(false)
  const [exerciseList, setExerciseList] = useState([])
  const [loadingExercises, setLoadingExercises] = useState(false)

  // Routine selection modal state
  const [showRoutineModal, setShowRoutineModal] = useState(false)
  const [routineList, setRoutineList] = useState([])
  const [loadingRoutines, setLoadingRoutines] = useState(false)

  // Reset key to force carousel to scroll back to start
  const [resetKey, setResetKey] = useState(0)

  // Animation values for step transitions
  const step1Opacity = useRef(new Animated.Value(fromPlayer ? 0 : 1)).current
  const step1TranslateX = useRef(new Animated.Value(fromPlayer ? -50 : 0)).current
  const step2Opacity = useRef(new Animated.Value(0)).current
  const step2TranslateX = useRef(new Animated.Value(50)).current
  const step4Opacity = useRef(new Animated.Value(fromPlayer ? 1 : 0)).current
  const step4TranslateX = useRef(new Animated.Value(fromPlayer ? 0 : 50)).current

  // Ref to track if we just came from player (prevents race condition with useFocusEffect)
  const justCameFromPlayer = useRef(false)

  // Watch for route param changes to handle coming back from Player
  useEffect(() => {
    const isFromPlayer = route?.params?.fromPlayer
    const wasBodyScan = route?.params?.wasBodyScan
    const returnToStep = route?.params?.returnToStep
    const restoredSliderValue = route?.params?.savedSliderValue
    const restoredPolyvagalState = route?.params?.savedPolyvagalState

    if (isFromPlayer) {
      justCameFromPlayer.current = true

      // If it was just a body scan, stay on the same step
      if (wasBodyScan && returnToStep !== undefined) {
        setCurrentStep(returnToStep)

        // Restore the saved values for the step we're returning to
        if (restoredSliderValue !== undefined) {
          if (returnToStep === 1) {
            setSliderValue(restoredSliderValue)
          } else if (returnToStep === 4) {
            setLoopSliderValue(restoredSliderValue)
          }
        }

        if (restoredPolyvagalState !== undefined) {
          if (returnToStep === 1) {
            setPolyvagalState(restoredPolyvagalState)
          } else if (returnToStep === 4) {
            setLoopPolyvagalState(restoredPolyvagalState)
          }
        }

        // Set animation values based on which step we're returning to
        if (returnToStep === 1) {
          step1Opacity.setValue(1)
          step1TranslateX.setValue(0)
          step2Opacity.setValue(0)
          step2TranslateX.setValue(50)
          step4Opacity.setValue(0)
          step4TranslateX.setValue(50)
        } else if (returnToStep === 4) {
          step1Opacity.setValue(0)
          step1TranslateX.setValue(-50)
          step2Opacity.setValue(0)
          step2TranslateX.setValue(50)
          step4Opacity.setValue(1)
          step4TranslateX.setValue(0)
        }
      } else {
        // Coming from actual exercise - go to Step 4
        setCurrentStep(4)

        // Restore saved initial values if they exist
        const savedInitialValue = route?.params?.savedInitialValue
        const savedInitialState = route?.params?.savedInitialState
        if (savedInitialValue !== undefined && savedInitialState !== undefined) {
          setInitialSliderValue(savedInitialValue)
          setInitialPolyvagalState(savedInitialState)
        }

        // Set Step 4 animation values
        step1Opacity.setValue(0)
        step1TranslateX.setValue(-50)
        step2Opacity.setValue(0)
        step2TranslateX.setValue(50)
        step4Opacity.setValue(1)
        step4TranslateX.setValue(0)
      }

      // Clear the params
      navigation.setParams({ fromPlayer: false, wasBodyScan: false, returnToStep: undefined, savedSliderValue: undefined, savedPolyvagalState: undefined })
    }
  }, [route?.params?.fromPlayer])

  // Reset to Step 1 when screen is focused (only if not coming from Player)
  useFocusEffect(
    React.useCallback(() => {
      if (!justCameFromPlayer.current) {
        // Reset state when coming back to check-in (not from player)
        setSliderValue(0)
        setPolyvagalState(null)
        setLoopSliderValue(0)
        setLoopPolyvagalState(null)
        setSliderChanged(false)
        setCurrentStep(1)
        setResetKey(prev => prev + 1) // Increment to force carousel reset

        step1Opacity.setValue(1)
        step1TranslateX.setValue(0)
        step2Opacity.setValue(0)
        step2TranslateX.setValue(50)
        step4Opacity.setValue(0)
        step4TranslateX.setValue(50)
      }
      // Reset the flag after handling
      justCameFromPlayer.current = false
    }, [])
  )

  const saveEmbodimentCheck = async (value, stateId, journal = null) => {
    try {
      const data = await somiChainService.saveEmbodimentCheck(value, stateId, journal)
      if (data) {
        console.log('Embodiment check saved to chain:', data)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const handleSOSPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleSOSRelease = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)

    // Save SOS embodiment check (code 0, level 0)
    await saveEmbodimentCheck(0, 0, null)

    const sosMedia = await getSOSMedia()
    navigation.navigate('Player', { media: sosMedia, initialValue: sliderValue })
  }

  const handleSoMiRoutinePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Use the algorithm to select next video based on current state
    const media = await getMediaForSliderValue(polyvagalState, sliderValue)
    navigation.navigate('Player', {
      media,
      initialValue: sliderValue,
      savedInitialValue: initialSliderValue,
      savedInitialState: initialPolyvagalState,
    })
  }

  const handleSelfGuidedPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    navigation.navigate('SoMiTimer', {
      initialValue: sliderValue,
      savedInitialState: polyvagalState,
    })
  }

  const handleChooseExercisePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowExerciseModal(true)

    // Fetch individual exercises (is_routine = false or null)
    setLoadingExercises(true)
    try {
      const { data, error } = await supabase
        .from('somi_blocks')
        .select('*')
        .eq('block_type', 'vagal_toning')
        .eq('media_type', 'video')
        .eq('active', true)
        .or('is_routine.is.null,is_routine.eq.false')
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching exercises:', error)
        setExerciseList([])
      } else {
        // Sort by state_target like in CategoryDetailScreen
        const sorted = (data || []).sort((a, b) => {
          const stateOrder = ['withdrawn', 'stirring', 'activated', 'settling', 'connected']
          const aIndex = stateOrder.indexOf(a.state_target)
          const bIndex = stateOrder.indexOf(b.state_target)
          if (aIndex === -1) return 1
          if (bIndex === -1) return -1
          return aIndex - bIndex
        })
        setExerciseList(sorted)
      }
    } catch (err) {
      console.error('Unexpected error fetching exercises:', err)
      setExerciseList([])
    } finally {
      setLoadingExercises(false)
    }
  }

  const handleChooseRoutinePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowRoutineModal(true)

    // Fetch routines (is_routine = true)
    setLoadingRoutines(true)
    try {
      const { data, error } = await supabase
        .from('somi_blocks')
        .select('*')
        .eq('active', true)
        .eq('is_routine', true)
        .order('name', { ascending: true })

      if (error) {
        console.error('Error fetching routines:', error)
        setRoutineList([])
      } else {
        setRoutineList(data || [])
      }
    } catch (err) {
      console.error('Unexpected error fetching routines:', err)
      setRoutineList([])
    } finally {
      setLoadingRoutines(false)
    }
  }

  const handleExerciseSelect = (exercise) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExerciseModal(false)

    navigation.navigate('Player', {
      media: {
        somi_block_id: exercise.id,
        name: exercise.name,
        type: exercise.media_type || 'video',
        url: exercise.media_url,
      },
      initialValue: sliderValue,
      savedInitialValue: initialSliderValue,
      savedInitialState: initialPolyvagalState,
    })
  }

  const closeExerciseModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExerciseModal(false)
  }

  const handleRoutineSelect = (routine) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowRoutineModal(false)

    navigation.navigate('Player', {
      media: {
        somi_block_id: routine.id,
        name: routine.name,
        type: routine.media_type || 'video',
        url: routine.media_url,
      },
      initialValue: sliderValue,
      savedInitialValue: initialSliderValue,
      savedInitialState: initialPolyvagalState,
    })
  }

  const closeRoutineModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowRoutineModal(false)
  }

  const handleSliderChange = (value) => {
    setSliderValue(value)
    setSliderChanged(true)
  }

  const handleJournalPress = (step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setJournalForStep(step)
    setShowJournalModal(true)
  }

  const handleJournalSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowJournalModal(false)
    Keyboard.dismiss()
  }

  const handleCheckboxPress = () => {
    // Require polyvagal state to be selected before proceeding
    if (!polyvagalState) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    saveEmbodimentCheck(sliderValue, polyvagalState, journalEntry || null)

    // Save initial values for later comparison
    setInitialSliderValue(sliderValue)
    setInitialPolyvagalState(polyvagalState)

    // Show confirmation message
    setShowConfirmMessage(true)

    // Animate message in and out
    Animated.sequence([
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1200),
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowConfirmMessage(false)

      // After message fades out, transition to step 2
      transitionToStep2()
    })
  }

  const transitionToStep2 = () => {
    // iOS-style horizontal slide transition
    Animated.parallel([
      // Step 1 slides out to the left and fades
      Animated.timing(step1TranslateX, {
        toValue: -50,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(step1Opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      // Step 2 slides in from the right and fades in
      Animated.timing(step2TranslateX, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(step2Opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(2)
    })
  }

  const handleStateChange = (stateId) => {
    setPolyvagalState(stateId)
  }

  const handleLoopSliderChange = (value) => {
    setLoopSliderValue(value)
  }

  const handleLoopStateChange = (stateId) => {
    setLoopPolyvagalState(stateId)
  }

  const handleLoopCheckboxPress = () => {
    // Require polyvagal state to be selected before proceeding
    if (!loopPolyvagalState) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Show confirmation message briefly (but don't save yet - wait for Continue/Done)
    setShowConfirmMessage(true)

    Animated.sequence([
      Animated.timing(messageOpacity, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(1000),
      Animated.timing(messageOpacity, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowConfirmMessage(false)
    })
  }

  const handleContinueToExercise = () => {
    // Require polyvagal state to be selected before continuing
    if (!loopPolyvagalState) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Save loop check to database before continuing
    saveEmbodimentCheck(loopSliderValue, loopPolyvagalState, loopJournalEntry || null)

    // Show transition modal before continuing
    setPendingAction('continue')
    setShowTransitionModal(true)
  }

  const handleGoHome = async () => {
    // Require polyvagal state to be selected before going home
    if (!loopPolyvagalState) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Save loop check to database before going home
    await saveEmbodimentCheck(loopSliderValue, loopPolyvagalState, loopJournalEntry || null)

    // End the active chain when done
    await somiChainService.endActiveChain()

    // Show transition modal before going home
    setPendingAction('done')
    setShowTransitionModal(true)
  }

  const handleTransitionModalClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowTransitionModal(false)

    // Execute the pending action
    if (pendingAction === 'continue') {
      // Go from Step 4 back to Step 2 (loop!)
      transitionFromStep4ToStep2()
    } else if (pendingAction === 'done') {
      // Exit the loop and go home
      resetStateAndGoHome()
    }

    setPendingAction(null)
  }

  const transitionFromStep4ToStep2 = () => {
    // Animate from Step 4 to Step 2 (the loop!)
    Animated.parallel([
      Animated.timing(step4TranslateX, {
        toValue: -50,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(step4Opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(step2TranslateX, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(step2Opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(2)
    })
  }

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (currentStep === 1) {
      // On step 1, reset and go back to Home tab
      resetStateAndGoHome()
    } else if (currentStep === 2) {
      // On step 2, go back to step 1 or step 4 depending on context
      // For now, always go back to step 1
      transitionBackToStep1()
    } else if (currentStep === 4) {
      // On step 4 (loop state), back button does nothing - user must use Continue or Go Home
      return
    }
  }

  const handleClosePress = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // End the active chain when closing
    await somiChainService.endActiveChain()
    // Close always resets and goes back to Home
    resetStateAndGoHome()
  }

  const resetStateAndGoHome = () => {
    // Reset all state
    setSliderValue(0)
    setPolyvagalState(null)
    setLoopSliderValue(0)
    setLoopPolyvagalState(null)
    setSliderChanged(false)
    setCurrentStep(1)
    setResetKey(prev => prev + 1) // Increment to force carousel reset

    // Reset animation values
    step1Opacity.setValue(1)
    step1TranslateX.setValue(0)
    step2Opacity.setValue(0)
    step2TranslateX.setValue(50)
    step4Opacity.setValue(0)
    step4TranslateX.setValue(50)

    // Navigate to Home
    navigation.navigate('Home')
  }

  const transitionBackToStep1 = () => {
    Animated.parallel([
      Animated.timing(step2TranslateX, {
        toValue: 50,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(step2Opacity, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(step1TranslateX, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(step1Opacity, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCurrentStep(1)
    })
  }

  const handleBodyScanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleBodyScanRelease = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Save current values before navigating to body scan
    const currentSlider = currentStep === 1 ? sliderValue : loopSliderValue
    const currentState = currentStep === 1 ? polyvagalState : loopPolyvagalState

    navigation.navigate('Player', {
      media: BODY_SCAN_MEDIA,
      initialValue: currentSlider,
      isBodyScan: true, // Flag to indicate this is just a body scan, not an exercise
      currentStep: currentStep, // Remember which step we're on
      savedSliderValue: currentSlider, // Save slider value to restore
      savedPolyvagalState: currentState, // Save polyvagal state to restore
    })
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <TouchableOpacity
          onPress={handleBackPress}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Text style={styles.headerButtonText}>←</Text>
        </TouchableOpacity>

        <Text style={styles.headerTitle}>SoMi Check-in</Text>

        <TouchableOpacity
          onPress={handleClosePress}
          style={styles.headerButton}
          activeOpacity={0.7}
        >
          <Text style={styles.headerButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {/* Step 1: Body Feeling */}
        <Animated.View
          style={[
            styles.stepContainer,
            currentStep === 1 && styles.stepContainerCentered,
            {
              opacity: step1Opacity,
              transform: [{ translateX: step1TranslateX }],
              position: currentStep === 1 ? 'relative' : 'absolute',
              width: '100%',
              top: currentStep === 1 ? undefined : 0,
              left: currentStep === 1 ? undefined : 0,
            },
          ]}
          pointerEvents={currentStep === 1 ? 'auto' : 'none'}
        >
        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardContent}>
            {/* Journal button floating near question */}
            <TouchableOpacity
              onPress={() => handleJournalPress(1)}
              activeOpacity={0.8}
              style={styles.journalButtonFloating}
            >
              <Text style={styles.journalIconFloating}>📝</Text>
            </TouchableOpacity>

            <EmbodimentSlider
              value={sliderValue}
              onValueChange={handleSliderChange}
              question={"how in your body\ndo you feel right now?"}
              showStateLabel={false}
              showChips={true}
              states={POLYVAGAL_STATES}
              selectedStateId={polyvagalState}
              onStateChange={handleStateChange}
              isConfirmed={false}
              onConfirm={null}
              resetKey={resetKey}
            />

            {/* Body scan button with checkbox for Step 1 */}
            {!showConfirmMessage && (
              <View style={styles.bodyScanContainer}>
                <TouchableOpacity
                  onPressIn={handleSOSPress}
                  onPressOut={handleSOSRelease}
                  activeOpacity={0.85}
                  style={styles.sosButtonSmall}
                >
                  <LinearGradient
                    colors={['#ff6b9d', '#ffa8b3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sosButtonSmallGradient}
                  >
                    <Text style={styles.sosTextSmall}>SOS</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPressIn={handleBodyScanPress}
                  onPressOut={handleBodyScanRelease}
                  activeOpacity={0.8}
                  style={styles.bodyScanButton}
                >
                  <Text style={styles.bodyScanText}>not sure? do a body scan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleCheckboxPress}
                  activeOpacity={0.7}
                  style={styles.checkboxButton}
                >
                  <View style={styles.checkboxCircle}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                      <Path
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                        fill="#4ecdc4"
                      />
                    </Svg>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Confirmation message */}
            {showConfirmMessage && (
              <Animated.View style={[styles.confirmMessage, { opacity: messageOpacity }]}>
                <Text style={styles.confirmText}>✓ your body check-in has been logged</Text>
              </Animated.View>
            )}
          </View>
        </BlurView>
      </Animated.View>

      {/* Step 2: Selection with Disclaimer */}
      <Animated.View
        style={[
          styles.stepContainer,
          {
            opacity: step2Opacity,
            transform: [{ translateX: step2TranslateX }],
            position: currentStep === 2 ? 'relative' : 'absolute',
            width: '100%',
            top: currentStep === 2 ? undefined : 0,
            left: currentStep === 2 ? undefined : 0,
          },
        ]}
        pointerEvents={currentStep === 2 ? 'auto' : 'none'}
      >
        {/* Disclaimer */}
        <Text style={styles.disclaimerText}>
          SoMi has curated blocks that can help you regulate your nervous system. Let's get started right now if you would like.
        </Text>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            onPress={handleSoMiRoutinePress}
            activeOpacity={0.9}
            style={styles.optionTile}
          >
            <BlurView intensity={15} tint="dark" style={styles.optionBlur}>
              <Text style={styles.optionTitle}>Start SoMi Routine</Text>
              <Text style={styles.optionSubtitle}>Our algorithm guides you</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleChooseExercisePress}
            activeOpacity={0.9}
            style={styles.optionTile}
          >
            <BlurView intensity={15} tint="dark" style={styles.optionBlur}>
              <Text style={styles.optionTitle}>Choose Exercise</Text>
              <Text style={styles.optionSubtitle}>Select from our library</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleChooseRoutinePress}
            activeOpacity={0.9}
            style={styles.optionTile}
          >
            <BlurView intensity={15} tint="dark" style={styles.optionBlur}>
              <Text style={styles.optionTitle}>Choose Routine</Text>
              <Text style={styles.optionSubtitle}>Pre-built exercise sequences</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSelfGuidedPress}
            activeOpacity={0.9}
            style={styles.optionTile}
          >
            <BlurView intensity={15} tint="dark" style={styles.optionBlur}>
              <Text style={styles.optionTitle}>Start SoMi Timer</Text>
              <Text style={styles.optionSubtitle}>Self-guided practice time</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Step 4: Loop Check-In (Post-Practice) */}
      <Animated.View
        style={[
          styles.stepContainer,
          {
            opacity: step4Opacity,
            transform: [{ translateX: step4TranslateX }],
            position: currentStep === 4 ? 'relative' : 'absolute',
            width: '100%',
            top: currentStep === 4 ? undefined : 0,
            left: currentStep === 4 ? undefined : 0,
          },
        ]}
        pointerEvents={currentStep === 4 ? 'auto' : 'none'}
      >

        <BlurView intensity={20} tint="dark" style={styles.card}>
          <View style={styles.cardContent}>
            {/* Journal button floating near question */}
            <TouchableOpacity
              onPress={() => handleJournalPress(4)}
              activeOpacity={0.8}
              style={styles.journalButtonFloating}
            >
              <Text style={styles.journalIconFloating}>📝</Text>
            </TouchableOpacity>

            <EmbodimentSlider
              value={loopSliderValue}
              onValueChange={handleLoopSliderChange}
              question={"after doing those exercises,\nhow in your body do you feel right now?"}
              showStateLabel={false}
              showChips={true}
              states={POLYVAGAL_STATES}
              selectedStateId={loopPolyvagalState}
              onStateChange={handleLoopStateChange}
              isConfirmed={false}
              onConfirm={null}
              resetKey={resetKey}
            />

            {/* Body scan button with checkbox for Step 4 */}
            {!showConfirmMessage && (
              <View style={styles.bodyScanContainer}>
                <TouchableOpacity
                  onPressIn={handleSOSPress}
                  onPressOut={handleSOSRelease}
                  activeOpacity={0.85}
                  style={styles.sosButtonSmall}
                >
                  <LinearGradient
                    colors={['#ff6b9d', '#ffa8b3']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.sosButtonSmallGradient}
                  >
                    <Text style={styles.sosTextSmall}>SOS</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                  onPressIn={handleBodyScanPress}
                  onPressOut={handleBodyScanRelease}
                  activeOpacity={0.8}
                  style={styles.bodyScanButton}
                >
                  <Text style={styles.bodyScanText}>not sure? do a body scan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleLoopCheckboxPress}
                  activeOpacity={0.7}
                  style={styles.checkboxButton}
                >
                  <View style={styles.checkboxCircle}>
                    <Svg width={16} height={16} viewBox="0 0 24 24">
                      <Path
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                        fill="#4ecdc4"
                      />
                    </Svg>
                  </View>
                </TouchableOpacity>
              </View>
            )}

            {/* Confirmation message */}
            {showConfirmMessage && (
              <Animated.View style={[styles.confirmMessage, { opacity: messageOpacity }]}>
                <Text style={styles.confirmText}>✓ check-in logged</Text>
              </Animated.View>
            )}
          </View>
        </BlurView>

        {/* Step 4 Navigation Buttons */}
        <View style={styles.step4ButtonsContainer}>
          <TouchableOpacity
            onPress={handleContinueToExercise}
            activeOpacity={0.9}
            style={[styles.step4Button, styles.step4ButtonPrimary]}
          >
            <BlurView intensity={15} tint="dark" style={styles.step4ButtonBlur}>
              <Text style={styles.step4ButtonText}>Continue</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleGoHome}
            activeOpacity={0.9}
            style={[styles.step4Button, styles.step4ButtonSecondary]}
          >
            <BlurView intensity={15} tint="dark" style={styles.step4ButtonBlur}>
              <Text style={styles.step4ButtonTextSecondary}>I'm Done</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </Animated.View>
      </View>

      {/* Transition Modal */}
      <Modal
        visible={showTransitionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleTransitionModalClose}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.transitionModalContainer}>
            <View style={styles.transitionModalContent}>
              {/* Transition display */}
              <View style={styles.transitionRow}>
                {/* Before state */}
                <View style={styles.transitionState}>
                  <View style={[styles.transitionStateChip, {
                    backgroundColor: POLYVAGAL_STATES.find(s => s.id === initialPolyvagalState)?.color + 'E6',
                    borderColor: POLYVAGAL_STATES.find(s => s.id === initialPolyvagalState)?.color,
                  }]}>
                    <Text style={styles.transitionEmoji}>{STATE_EMOJIS[initialPolyvagalState]}</Text>
                    <Text style={styles.transitionStateLabel}>
                      {POLYVAGAL_STATES.find(s => s.id === initialPolyvagalState)?.label}
                    </Text>
                  </View>
                  <Text style={styles.transitionPercentage}>{Math.round(initialSliderValue)}%</Text>
                </View>

                {/* Arrow */}
                <Text style={styles.transitionArrow}>→</Text>

                {/* After state */}
                <View style={styles.transitionState}>
                  <View style={[styles.transitionStateChip, {
                    backgroundColor: POLYVAGAL_STATES.find(s => s.id === loopPolyvagalState)?.color + 'E6',
                    borderColor: POLYVAGAL_STATES.find(s => s.id === loopPolyvagalState)?.color,
                  }]}>
                    <Text style={styles.transitionEmoji}>{STATE_EMOJIS[loopPolyvagalState]}</Text>
                    <Text style={styles.transitionStateLabel}>
                      {POLYVAGAL_STATES.find(s => s.id === loopPolyvagalState)?.label}
                    </Text>
                  </View>
                  <Text style={styles.transitionPercentage}>{Math.round(loopSliderValue)}%</Text>
                </View>
              </View>

              {/* Got it button */}
              <TouchableOpacity
                onPress={handleTransitionModalClose}
                style={styles.transitionModalButton}
                activeOpacity={0.7}
              >
                <Text style={styles.transitionModalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Journal Entry Modal - Fullscreen Notebook */}
      <Modal
        visible={showJournalModal}
        transparent={false}
        animationType="slide"
        onRequestClose={handleJournalSave}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.journalFullscreen}
        >
          <View style={styles.journalNotebook}>
            {/* Header with buttons */}
            <View style={styles.journalHeader}>
              <TouchableOpacity
                onPress={() => {
                  // Cancel - clear entry and close
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  if (journalForStep === 1) {
                    setJournalEntry('')
                  } else {
                    setLoopJournalEntry('')
                  }
                  setShowJournalModal(false)
                }}
                activeOpacity={0.7}
                style={styles.journalCancelButton}
              >
                <Text style={styles.journalCancelText}>✕</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleJournalSave}
                activeOpacity={0.7}
                style={styles.journalDoneButton}
              >
                <Svg width={24} height={24} viewBox="0 0 24 24">
                  <Path
                    d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                    fill="#936fb7"
                  />
                </Svg>
              </TouchableOpacity>
            </View>

            {/* Notebook Content */}
            <View style={styles.journalNotebookContent}>
              <Text style={styles.journalNotebookTitle}>what's present right now?</Text>
              <Text style={styles.journalNotebookSubtitle}>all feelings welcome, exactly as they are</Text>

              <TouchableWithoutFeedback onPress={() => journalInputRef.current?.focus()}>
                <View style={styles.journalTextInputWrapper}>
                  <TextInput
                    ref={journalInputRef}
                    style={styles.journalTextInput}
                    value={journalForStep === 1 ? journalEntry : loopJournalEntry}
                    onChangeText={journalForStep === 1 ? setJournalEntry : setLoopJournalEntry}
                    placeholder="tap here to begin..."
                    placeholderTextColor="rgba(45, 36, 56, 0.3)"
                    multiline
                    textAlignVertical="top"
                  />
                </View>
              </TouchableWithoutFeedback>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exercise Selection Modal */}
      <Modal
        visible={showExerciseModal}
        transparent={false}
        animationType="slide"
        onRequestClose={closeExerciseModal}
      >
        <LinearGradient
          colors={['#0f0c29', '#302b63', '#24243e']}
          style={styles.exerciseModalContainer}
        >
          {/* Header */}
          <View style={styles.exerciseModalHeader}>
            <TouchableOpacity
              onPress={closeExerciseModal}
              activeOpacity={0.7}
              style={styles.exerciseModalCloseButton}
            >
              <Text style={styles.exerciseModalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.exerciseModalTitle}>Choose Exercise</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Exercise List */}
          <ScrollView
            style={styles.exerciseModalScroll}
            contentContainerStyle={styles.exerciseModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loadingExercises ? (
              <View style={styles.exerciseLoadingContainer}>
                <ActivityIndicator size="large" color="#4ecdc4" />
              </View>
            ) : exerciseList.length === 0 ? (
              <View style={styles.exerciseEmptyContainer}>
                <Text style={styles.exerciseEmptyText}>No exercises available</Text>
              </View>
            ) : (
              exerciseList.map((exercise, index) => {
                const stateInfo = OLD_STATE_INFO[exercise.state_target]
                const showStateHeader =
                  index === 0 || exerciseList[index - 1]?.state_target !== exercise.state_target

                return (
                  <View key={exercise.id}>
                    {showStateHeader && stateInfo && (
                      <View style={styles.exerciseStateHeader}>
                        <Text style={styles.exerciseStateEmoji}>{OLD_STATE_EMOJIS[exercise.state_target]}</Text>
                        <Text style={[styles.exerciseStateLabel, { color: stateInfo.color }]}>
                          {stateInfo.label}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => handleExerciseSelect(exercise)}
                      style={styles.exerciseCard}
                    >
                      <BlurView intensity={15} tint="dark" style={styles.exerciseCardBlur}>
                        <View style={styles.exerciseCardContent}>
                          {stateInfo && (
                            <View style={[styles.exerciseIconContainer, { backgroundColor: stateInfo.color + '20' }]}>
                              <Text style={styles.exerciseIcon}>{OLD_STATE_EMOJIS[exercise.state_target]}</Text>
                            </View>
                          )}
                          <View style={styles.exerciseInfo}>
                            <Text style={styles.exerciseName}>{exercise.name}</Text>
                            {exercise.description && (
                              <Text style={styles.exerciseDescription} numberOfLines={2}>
                                {exercise.description}
                              </Text>
                            )}
                          </View>
                          <View style={styles.exercisePlayIcon}>
                            <Text style={styles.playIconText}>▶</Text>
                          </View>
                        </View>
                      </BlurView>
                    </TouchableOpacity>
                  </View>
                )
              })
            )}
          </ScrollView>
        </LinearGradient>
      </Modal>

      {/* Routine Selection Modal */}
      <Modal
        visible={showRoutineModal}
        transparent={true}
        animationType="fade"
        onRequestClose={closeRoutineModal}
      >
        <LinearGradient
          colors={['rgba(15, 12, 41, 0.95)', 'rgba(48, 43, 99, 0.95)', 'rgba(36, 36, 62, 0.95)']}
          style={styles.exerciseModalContainer}
        >
          {/* Header */}
          <View style={styles.exerciseModalHeader}>
            <TouchableOpacity
              onPress={closeRoutineModal}
              activeOpacity={0.7}
              style={styles.exerciseModalCloseButton}
            >
              <Text style={styles.exerciseModalCloseText}>✕</Text>
            </TouchableOpacity>
            <Text style={styles.exerciseModalTitle}>Choose Routine</Text>
            <View style={{ width: 44 }} />
          </View>

          {/* Routine List */}
          <ScrollView
            style={styles.exerciseModalScroll}
            contentContainerStyle={styles.exerciseModalScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loadingRoutines ? (
              <View style={styles.exerciseLoadingContainer}>
                <ActivityIndicator size="large" color="#4ecdc4" />
              </View>
            ) : routineList.length === 0 ? (
              <View style={styles.exerciseEmptyContainer}>
                <Text style={styles.exerciseEmptyText}>No routines available</Text>
              </View>
            ) : (
              routineList.map((routine) => (
                <TouchableOpacity
                  key={routine.id}
                  activeOpacity={0.85}
                  onPress={() => handleRoutineSelect(routine)}
                  style={styles.exerciseCard}
                >
                  <BlurView intensity={15} tint="dark" style={styles.exerciseCardBlur}>
                    <View style={styles.exerciseCardContent}>
                      <View style={styles.exerciseInfo}>
                        <Text style={styles.exerciseName}>{routine.name}</Text>
                        {routine.description && (
                          <Text style={styles.exerciseDescription} numberOfLines={2}>
                            {routine.description}
                          </Text>
                        )}
                      </View>
                      <View style={styles.exercisePlayIcon}>
                        <Text style={styles.playIconText}>▶</Text>
                      </View>
                    </View>
                  </BlurView>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </LinearGradient>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: -24,
    marginTop: -60,
    marginBottom: 20,
    paddingTop: 60,
    backgroundColor: 'rgba(26, 22, 37, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    color: '#f7f9fb',
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    color: '#f7f9fb',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  stepContainer: {
    width: '100%',
  },
  stepContainerCentered: {
    flex: 1,
    justifyContent: 'center',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    padding: 20,
  },
  bodyScanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  bodyScanButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  bodyScanText: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  checkboxButton: {
    padding: 4,
  },
  checkboxCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
    borderWidth: 2,
    borderColor: '#4ecdc4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmMessage: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#4ecdc4',
    alignSelf: 'center',
  },
  confirmText: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  disclaimerText: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  optionsContainer: {
    gap: 16,
    paddingHorizontal: 0,
  },
  step4ButtonsContainer: {
    marginTop: 24,
    gap: 12,
    flexDirection: 'row',
  },
  step4Button: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
  },
  step4ButtonPrimary: {
    borderColor: '#4ecdc4',
  },
  step4ButtonSecondary: {
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  step4ButtonBlur: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  step4ButtonText: {
    color: '#4ecdc4',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  step4ButtonTextSecondary: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  optionTile: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  optionBlur: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  optionTitle: {
    color: '#f7f9fb',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  optionSubtitle: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  sosButtonSmall: {
    shadowColor: '#ff6b9d',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  sosButtonSmallGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextSmall: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.95,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  transitionModalContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    maxWidth: 380,
    width: '100%',
  },
  transitionModalContent: {
    padding: 32,
    alignItems: 'center',
  },
  transitionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  transitionState: {
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  transitionStateChip: {
    borderRadius: 16,
    borderWidth: 2,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 4,
  },
  transitionEmoji: {
    fontSize: 18,
  },
  transitionStateLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transitionPercentage: {
    color: '#f7f9fb',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transitionArrow: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 24,
    fontWeight: '300',
    marginHorizontal: 8,
    marginTop: -20,
  },
  transitionModalButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    borderWidth: 2,
    borderColor: '#4ecdc4',
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  transitionModalButtonText: {
    color: '#4ecdc4',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  journalButtonFloating: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(147, 112, 219, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  journalIconFloating: {
    fontSize: 20,
  },
  journalFullscreen: {
    flex: 1,
    backgroundColor: '#faf8ff',
  },
  journalNotebook: {
    flex: 1,
    paddingTop: 60,
  },
  journalHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journalCancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(147, 112, 219, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalCancelText: {
    color: 'rgba(147, 112, 219, 0.6)',
    fontSize: 24,
    fontWeight: '300',
  },
  journalDoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(147, 112, 219, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalNotebookContent: {
    flex: 1,
    paddingHorizontal: 32,
  },
  journalNotebookTitle: {
    color: '#2d2438',
    fontSize: 32,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 8,
  },
  journalNotebookSubtitle: {
    color: 'rgba(45, 36, 56, 0.5)',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginBottom: 32,
  },
  journalTextInputWrapper: {
    flex: 1,
  },
  journalTextInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    color: '#2d2438',
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
  },
  exerciseModalContainer: {
    flex: 1,
    paddingTop: 60,
  },
  exerciseModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
  },
  exerciseModalCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseModalCloseText: {
    color: '#f7f9fb',
    fontSize: 24,
    fontWeight: '300',
  },
  exerciseModalTitle: {
    color: '#f7f9fb',
    fontSize: 20,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  exerciseModalScroll: {
    flex: 1,
  },
  exerciseModalScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  exerciseLoadingContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  exerciseEmptyContainer: {
    paddingTop: 60,
    alignItems: 'center',
  },
  exerciseEmptyText: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 16,
    fontWeight: '500',
  },
  exerciseStateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 24,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  exerciseStateEmoji: {
    fontSize: 18,
  },
  exerciseStateLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  exerciseCard: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  exerciseCardBlur: {
    padding: 16,
  },
  exerciseCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  exerciseIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseIcon: {
    fontSize: 24,
  },
  exerciseInfo: {
    flex: 1,
  },
  exerciseName: {
    color: '#f7f9fb',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  exerciseDescription: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  exercisePlayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconText: {
    color: '#4ecdc4',
    fontSize: 14,
    marginLeft: 2,
  },
})
