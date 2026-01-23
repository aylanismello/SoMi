import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Animated, Modal, TextInput, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, ScrollView } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import Svg, { Path, Circle } from 'react-native-svg'
import { getSOSMedia, BODY_SCAN_MEDIA } from '../constants/media'
import EmbodimentSlider, { POLYVAGAL_STATE_MAP, STATE_DESCRIPTIONS } from './EmbodimentSlider'
import { supabase, somiChainService } from '../supabase'
import { colors } from '../constants/theme'

// Polyvagal states for chip selection (new code-based system)
const POLYVAGAL_STATES = [
  { id: 1, label: 'Drained', color: '#4A5F8C' },   // Deep slate blue
  { id: 2, label: 'Foggy', color: '#5B7BB4' },     // Medium blue
  { id: 3, label: 'Wired', color: '#6B9BD1' },     // Brighter blue
  { id: 4, label: 'Steady', color: '#7DBCE7' },    // Bright sky blue
  { id: 5, label: 'Glowing', color: '#90DDF0' },   // Bright cyan blue
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
  withdrawn: { id: 'withdrawn', label: 'Withdrawn', color: '#4A5F8C' },
  stirring: { id: 'stirring', label: 'Stirring', color: '#5B7BB4' },
  activated: { id: 'activated', label: 'Activated', color: '#6B9BD1' },
  settling: { id: 'settling', label: 'Settling', color: '#7DBCE7' },
  connected: { id: 'connected', label: 'Connected', color: '#90DDF0' },
}

export default function SoMeCheckIn({ navigation, route }) {
  // Check if we're coming back from player (step 4) or body scan
  const fromPlayer = route?.params?.fromPlayer || false
  const fromBodyScan = route?.params?.fromBodyScan || false

  const [sliderValue, setSliderValue] = useState(0)
  const [sliderChanged, setSliderChanged] = useState(false)
  const [polyvagalState, setPolyvagalState] = useState(null)
  const [currentStep, setCurrentStep] = useState(fromPlayer ? 4 : (fromBodyScan ? 1 : 0)) // 0: body scan, 1: initial check-in, 2: selection, 4: loop check-in
  const [showConfirmMessage, setShowConfirmMessage] = useState(false)
  const [messageOpacity] = useState(new Animated.Value(0))

  // Separate state for loop check-in (Step 4)
  const [loopSliderValue, setLoopSliderValue] = useState(0)
  const [loopPolyvagalState, setLoopPolyvagalState] = useState(null)

  // Store initial values from Step 1 to show transition later
  const [initialSliderValue, setInitialSliderValue] = useState(0)
  const [initialPolyvagalState, setInitialPolyvagalState] = useState(null)

  // Time selection state (Step 2)
  const [selectedBlockCount, setSelectedBlockCount] = useState(null)

  // Transition modal state
  const [showTransitionModal, setShowTransitionModal] = useState(false)
  const [pendingAction, setPendingAction] = useState(null) // 'continue' or 'done'

  // Exit confirmation modal state
  const [showExitModal, setShowExitModal] = useState(false)

  // Journal entry state
  const [journalEntry, setJournalEntry] = useState('')
  const [loopJournalEntry, setLoopJournalEntry] = useState('')
  const [showJournalModal, setShowJournalModal] = useState(false)
  const [journalForStep, setJournalForStep] = useState(1) // Track which step the journal is for
  const journalInputRef = useRef(null)


  // Reset key to force carousel to scroll back to start
  const [resetKey, setResetKey] = useState(0)

  // Help mode state
  const [helpMode, setHelpMode] = useState(false)
  const [helpInfoModal, setHelpInfoModal] = useState({ visible: false, title: '', description: '' })

  // Animation values for step transitions
  const step1Opacity = useRef(new Animated.Value(fromPlayer ? 0 : 1)).current
  const step1TranslateX = useRef(new Animated.Value(fromPlayer ? -50 : 0)).current
  const step2Opacity = useRef(new Animated.Value(0)).current
  const step2TranslateX = useRef(new Animated.Value(50)).current
  const step4Opacity = useRef(new Animated.Value(fromPlayer ? 1 : 0)).current
  const step4TranslateX = useRef(new Animated.Value(fromPlayer ? 0 : 50)).current

  // Ref to track if we just came from player (prevents race condition with useFocusEffect)
  const justCameFromPlayer = useRef(false)

  // Watch for route param changes to handle coming back from Player or Body Scan
  useEffect(() => {
    const isFromPlayer = route?.params?.fromPlayer
    const isFromBodyScan = route?.params?.fromBodyScan
    const skipToStep2 = route?.params?.skipToStep2
    const wasBodyScan = route?.params?.wasBodyScan
    const returnToStep = route?.params?.returnToStep
    const restoredSliderValue = route?.params?.savedSliderValue
    const restoredPolyvagalState = route?.params?.savedPolyvagalState

    if (isFromBodyScan) {
      justCameFromPlayer.current = true

      if (skipToStep2) {
        // Skip directly to Step 2 (selection)
        setCurrentStep(2)
        step1Opacity.setValue(0)
        step1TranslateX.setValue(-50)
        step2Opacity.setValue(1)
        step2TranslateX.setValue(0)
        step4Opacity.setValue(0)
        step4TranslateX.setValue(50)
      } else {
        // Coming back from initial body scan, show Step 1 (first embodiment slider)
        setCurrentStep(1)
        step1Opacity.setValue(1)
        step1TranslateX.setValue(0)
        step2Opacity.setValue(0)
        step2TranslateX.setValue(50)
        step4Opacity.setValue(0)
        step4TranslateX.setValue(50)
      }

      navigation.setParams({ fromBodyScan: false, skipToStep2: false })
    } else if (isFromPlayer) {
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
  }, [route?.params?.fromPlayer, route?.params?.fromBodyScan])

  // Navigate to body scan on first load (when not coming from player)
  useEffect(() => {
    if (currentStep === 0 && !fromPlayer && !fromBodyScan) {
      // Navigate to body scan immediately
      setTimeout(() => {
        navigation.navigate('BodyScanCountdown', {
          isInitial: true,
        })
      }, 100)
    }
  }, [currentStep, fromPlayer, fromBodyScan])

  // Reset to Step 0 (body scan) when screen is focused (only if not coming from Player)
  useFocusEffect(
    React.useCallback(() => {
      if (!justCameFromPlayer.current) {
        // Reset state completely when coming back to check-in (not from player)
        setSliderValue(0)
        setPolyvagalState(null)
        setLoopSliderValue(0)
        setLoopPolyvagalState(null)
        setSliderChanged(false)
        setCurrentStep(0) // Start from Step 0 to trigger body scan
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

    if (helpMode) {
      setHelpInfoModal({
        visible: true,
        title: 'SOS',
        description: 'Feeling overwhelmed? We have expertly crafted SOS exercises designed to help you regulate your nervous system when you need support most.'
      })
      return
    }

    // Save SOS embodiment check (code 0, level 0)
    await saveEmbodimentCheck(0, 0, null)

    const sosMedia = await getSOSMedia()
    navigation.navigate('Player', { media: sosMedia, initialValue: sliderValue })
  }

  const handleSoMiRoutinePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    navigation.navigate('SoMiRoutine', {
      polyvagalState,
      sliderValue,
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


  const handleSliderChange = (value) => {
    setSliderValue(value)
    setSliderChanged(true)
  }

  const handleHelpModeToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setHelpMode(!helpMode)
  }

  const handleJournalPress = (step) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (helpMode) {
      setHelpInfoModal({
        visible: true,
        title: 'Journal Entry',
        description: 'Capture your thoughts, feelings, and observations. Journaling helps you process emotions and track patterns over time.'
      })
      return
    }

    setJournalForStep(step)
    setShowJournalModal(true)
    // Auto-focus keyboard when modal opens
    setTimeout(() => {
      journalInputRef.current?.focus()
    }, 100)
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

      // Transition to Step 2 (time selection)
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

  const handleTimeSelection = (blockCount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setSelectedBlockCount(blockCount)

    // Navigate to SoMi Routine with selected block count
    navigation.navigate('SoMiRoutine', {
      polyvagalState,
      sliderValue,
      savedInitialValue: sliderValue,
      savedInitialState: polyvagalState,
      totalBlocks: blockCount,
    })
  }

  const handleSkipCheckin = () => {
    // Skip check-in - go to time selection (Step 2)
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Set default values for skipped check-in
    const defaultState = 4 // Default to "Steady"
    const defaultValue = 0

    setPolyvagalState(polyvagalState || defaultState)
    setSliderValue(sliderValue || defaultValue)
    setInitialSliderValue(sliderValue || defaultValue)
    setInitialPolyvagalState(polyvagalState || defaultState)

    // Save embodiment check with default values
    saveEmbodimentCheck(sliderValue || defaultValue, polyvagalState || defaultState, null)

    // Transition to Step 2 (time selection)
    transitionToStep2()
  }

  const handleFinish = async () => {
    // Require polyvagal state to be selected before finishing
    if (!loopPolyvagalState) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Save loop check to database
    await saveEmbodimentCheck(loopSliderValue, loopPolyvagalState, loopJournalEntry || null)

    // End the active chain when done
    await somiChainService.endActiveChain()

    // Show transition modal before going home
    if (loopPolyvagalState && initialPolyvagalState) {
      setPendingAction('done')
      setShowTransitionModal(true)
    } else {
      // No transition to show, just go home directly
      navigation.navigate('Home')
    }
  }

  const handleSkipFinalCheckin = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // End the active chain when skipping
    await somiChainService.endActiveChain()

    // Go home without saving or showing transition
    navigation.navigate('Home')
  }

  const handleTransitionModalClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowTransitionModal(false)

    // After transition modal, always go home - flow is DONE
    navigation.navigate('Home')
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
      // On step 1, go back to body scan
      navigation.navigate('BodyScanCountdown', {
        isInitial: true,
      })
    } else if (currentStep === 2) {
      // On step 2, go back to step 1 or step 4 depending on context
      // For now, always go back to step 1
      transitionBackToStep1()
    } else if (currentStep === 4) {
      // On step 4 (loop state), back button does nothing - user must use Continue or Go Home
      return
    }
  }

  const handleClosePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Show exit confirmation modal
    setShowExitModal(true)
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)
    // End the active chain when closing
    await somiChainService.endActiveChain()
    // Go directly to home (no body scan when exiting early from Step 1)
    navigation.navigate('Home')
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
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

    if (helpMode) {
      setHelpInfoModal({
        visible: true,
        title: 'Body Scan',
        description: 'Not sure how you feel? A guided body scan helps you tune into physical sensations and identify your current state with greater clarity.'
      })
      return
    }

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

  // Don't render anything when waiting for body scan navigation (prevents flicker)
  if (currentStep === 0) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
        style={styles.container}
      />
    )
  }

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
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
          <View style={styles.cardContent}>
            {/* Question at top */}
            <View style={styles.questionSection}>
              <TouchableOpacity
                onPress={() => handleJournalPress(1)}
                activeOpacity={0.8}
                style={[
                  styles.journalButtonFloating,
                  helpMode && styles.helpModeHighlight
                ]}
              >
                <Text style={styles.journalIconFloating}>📝</Text>
              </TouchableOpacity>
              <Text style={styles.questionText}>
                {polyvagalState ? 'how present are those\nfeelings in the body?' : 'how do you feel\nin your body right now?'}
              </Text>
            </View>

            {/* Centered slider/chips area */}
            <View style={styles.sliderSection}>
              <EmbodimentSlider
                value={sliderValue}
                onValueChange={handleSliderChange}
                question={null}
                showStateLabel={false}
                showChips={true}
                states={POLYVAGAL_STATES}
                selectedStateId={polyvagalState}
                onStateChange={handleStateChange}
                isConfirmed={false}
                onConfirm={null}
                resetKey={resetKey}
                helpMode={helpMode}
              />
            </View>

            {/* Bottom buttons */}
            {!showConfirmMessage && (
              <View style={styles.bottomButtonsWrapper}>
                {/* SOS and body scan on first row */}
                <View style={styles.sosBodyScanRow}>
                  <TouchableOpacity
                    onPressIn={handleSOSPress}
                    onPressOut={handleSOSRelease}
                    activeOpacity={0.85}
                    style={[
                      styles.sosButtonSmall,
                      helpMode && styles.helpModeHighlightSOS
                    ]}
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
                    style={[
                      styles.bodyScanButton,
                      helpMode && styles.helpModeHighlight
                    ]}
                  >
                    <Text style={styles.bodyScanText}>do a body scan</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleHelpModeToggle}
                    activeOpacity={0.8}
                    style={[styles.helpButtonSmall, helpMode && styles.helpButtonSmallActive]}
                  >
                    <Text style={styles.helpButtonSmallIcon}>?</Text>
                  </TouchableOpacity>
                </View>

                {/* Skip Check-in and Continue on second row */}
                <View style={styles.step1NavigationRow}>
                  <TouchableOpacity
                    onPress={handleSkipCheckin}
                    activeOpacity={0.7}
                    style={styles.step1NevermindButton}
                  >
                    <Text style={styles.step1NevermindButtonText}>Skip Check-in</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleCheckboxPress}
                    activeOpacity={0.7}
                    style={styles.step1ContinueButton}
                  >
                    <Text style={styles.step1ContinueButtonText}>Continue</Text>
                    <View style={styles.step1ContinueCheckmark}>
                      <Svg width={18} height={18} viewBox="0 0 24 24">
                        <Path
                          d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                          fill={colors.accent.primary}
                        />
                      </Svg>
                    </View>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Confirmation message */}
            {showConfirmMessage && (
              <Animated.View style={[styles.confirmMessage, { opacity: messageOpacity }]}>
                <Text style={styles.confirmText}>✓ check-in logged</Text>
              </Animated.View>
            )}
          </View>
      </Animated.View>

      {/* Step 2: Time Selection */}
      <Animated.View
        style={[
          styles.stepContainer,
          currentStep === 2 && styles.stepContainerCentered,
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
        {/* Time selection question */}
        <Text style={styles.timeSelectionQuestion}>
          How much time do you have?
        </Text>

        <View style={styles.timeOptionsContainer}>
          <TouchableOpacity
            onPress={() => handleTimeSelection(2)}
            activeOpacity={0.9}
            style={styles.timeOptionTile}
          >
            <BlurView intensity={15} tint="dark" style={styles.timeOptionBlur}>
              <Text style={styles.timeOptionMinutes}>5</Text>
              <Text style={styles.timeOptionLabel}>minutes</Text>
              <Text style={styles.timeOptionBlocks}>2 blocks</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTimeSelection(6)}
            activeOpacity={0.9}
            style={styles.timeOptionTile}
          >
            <BlurView intensity={15} tint="dark" style={styles.timeOptionBlur}>
              <Text style={styles.timeOptionMinutes}>10</Text>
              <Text style={styles.timeOptionLabel}>minutes</Text>
              <Text style={styles.timeOptionBlocks}>6 blocks</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleTimeSelection(10)}
            activeOpacity={0.9}
            style={styles.timeOptionTile}
          >
            <BlurView intensity={15} tint="dark" style={styles.timeOptionBlur}>
              <Text style={styles.timeOptionMinutes}>15</Text>
              <Text style={styles.timeOptionLabel}>minutes</Text>
              <Text style={styles.timeOptionBlocks}>10 blocks</Text>
            </BlurView>
          </TouchableOpacity>
        </View>
      </Animated.View>

      {/* Step 4: Loop Check-In (Post-Practice) */}
      <Animated.View
        style={[
          styles.stepContainer,
          currentStep === 4 && styles.stepContainerCentered,
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
        <View style={styles.cardContent}>
          {/* Question at top */}
          <View style={styles.questionSection}>
            <TouchableOpacity
              onPress={() => handleJournalPress(4)}
              activeOpacity={0.8}
              style={[
                styles.journalButtonFloating,
                helpMode && styles.helpModeHighlight
              ]}
            >
              <Text style={styles.journalIconFloating}>📝</Text>
            </TouchableOpacity>
            <Text style={styles.questionTextStep4}>
              {loopPolyvagalState ? 'how present are those\nfeelings in the body?' : 'how do you feel\nin your body right now?'}
            </Text>
          </View>

          {/* Centered slider/chips area */}
          <View style={styles.sliderSection}>
            <EmbodimentSlider
              value={loopSliderValue}
              onValueChange={handleLoopSliderChange}
              question={null}
              showStateLabel={false}
              showChips={true}
              states={POLYVAGAL_STATES}
              selectedStateId={loopPolyvagalState}
              onStateChange={handleLoopStateChange}
              isConfirmed={false}
              onConfirm={null}
              resetKey={resetKey}
              helpMode={helpMode}
            />
          </View>

          {/* Bottom buttons */}
          {!showConfirmMessage && (
            <View style={styles.bottomButtonsWrapper}>
              {/* SOS and body scan on first row */}
              <View style={styles.sosBodyScanRow}>
                <TouchableOpacity
                  onPressIn={handleSOSPress}
                  onPressOut={handleSOSRelease}
                  activeOpacity={0.85}
                  style={[
                    styles.sosButtonSmall,
                    helpMode && styles.helpModeHighlightSOS
                  ]}
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
                  style={[
                    styles.bodyScanButton,
                    helpMode && styles.helpModeHighlight
                  ]}
                >
                  <Text style={styles.bodyScanText}>do a body scan</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleHelpModeToggle}
                  activeOpacity={0.8}
                  style={[styles.helpButtonSmall, helpMode && styles.helpButtonSmallActive]}
                >
                  <Text style={styles.helpButtonSmallIcon}>?</Text>
                </TouchableOpacity>
              </View>

              {/* Skip and Finish buttons */}
              <View style={styles.step4NavigationRow}>
                <TouchableOpacity
                  onPress={handleSkipFinalCheckin}
                  activeOpacity={0.7}
                  style={styles.step4SkipButton}
                >
                  <Text style={styles.step4SkipButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleFinish}
                  activeOpacity={0.7}
                  style={styles.step4FinishButton}
                >
                  <Text style={styles.step4FinishButtonText}>Finish</Text>
                  <View style={styles.step4FinishCheckmark}>
                    <Svg width={18} height={18} viewBox="0 0 24 24">
                      <Path
                        d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                        fill={colors.accent.primary}
                      />
                    </Svg>
                  </View>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Confirmation message */}
          {showConfirmMessage && (
            <Animated.View style={[styles.confirmMessage, { opacity: messageOpacity }]}>
              <Text style={styles.confirmText}>✓ check-in logged</Text>
            </Animated.View>
          )}
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
            <View style={styles.journalCard}>
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
                      fill={colors.accent.primary}
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
                      placeholderTextColor="#999999"
                      multiline
                      textAlignVertical="top"
                      autoFocus={true}
                      keyboardType="default"
                      showSoftInputOnFocus={true}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>


      {/* Help Info Modal */}
      <Modal
        visible={helpInfoModal.visible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setHelpInfoModal({ ...helpInfoModal, visible: false })}
      >
        <View style={styles.helpInfoOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.helpInfoContainer}>
            <View style={styles.helpInfoContent}>
              <Text style={styles.helpInfoTitle}>{helpInfoModal.title}</Text>
              <Text style={styles.helpInfoDescription}>{helpInfoModal.description}</Text>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  setHelpInfoModal({ ...helpInfoModal, visible: false })
                }}
                style={styles.helpInfoButton}
                activeOpacity={0.7}
              >
                <Text style={styles.helpInfoButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelExit}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.exitModalContainer}>
            <View style={styles.exitModalContent}>
              <Text style={styles.exitModalTitle}>End Session?</Text>
              <Text style={styles.exitModalMessage}>
                Are you sure you want to end this check-in early?
              </Text>

              <View style={styles.exitModalButtons}>
                <TouchableOpacity
                  onPress={handleCancelExit}
                  style={[styles.exitModalButton, styles.exitModalButtonCancel]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exitModalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirmExit}
                  style={[styles.exitModalButton, styles.exitModalButtonConfirm]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exitModalButtonTextConfirm}>End</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
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
    backgroundColor: colors.overlay.dark,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonText: {
    color: colors.text.primary,
    fontSize: 28,
    fontWeight: '300',
  },
  headerTitle: {
    color: colors.text.primary,
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
    justifyContent: 'flex-start',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  cardContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  questionSection: {
    position: 'relative',
    paddingTop: 8,
  },
  questionText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 32,
    letterSpacing: 0.3,
  },
  questionTextStep4: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 32,
    letterSpacing: 0.3,
  },
  sliderSection: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bodyScanContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingBottom: 8,
  },
  bottomButtonsWrapper: {
    gap: 12,
    paddingBottom: 8,
    alignItems: 'center',
  },
  sosBodyScanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  bodyScanButton: {
    paddingVertical: 14,
    paddingHorizontal: 28,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 26,
    borderWidth: 2,
    borderColor: colors.border.default,
    flex: 1,
  },
  bodyScanText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  step1NavigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  step1NevermindButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border.default,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  step1NevermindButtonText: {
    color: colors.text.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  step1ContinueButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.surface.secondary,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  step1ContinueButtonText: {
    color: colors.accent.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  step1ContinueCheckmark: {
    // Container for the checkmark SVG
  },
  confirmMessage: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(0, 217, 163, 0.2)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: colors.accent.primary,
    alignSelf: 'center',
  },
  confirmText: {
    color: colors.accent.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  disclaimerText: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
    paddingHorizontal: 12,
  },
  timeSelectionQuestion: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 32,
    letterSpacing: 0.5,
  },
  timeOptionsContainer: {
    gap: 16,
    paddingHorizontal: 24,
  },
  timeOptionTile: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  timeOptionBlur: {
    paddingVertical: 20,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  timeOptionMinutes: {
    color: colors.accent.primary,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -1,
  },
  timeOptionLabel: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '500',
    marginTop: 4,
  },
  timeOptionBlocks: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    marginTop: 8,
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
    borderColor: colors.accent.primary,
  },
  step4ButtonSecondary: {
    borderColor: colors.border.default,
  },
  step4ButtonBlur: {
    paddingVertical: 18,
    paddingHorizontal: 24,
  },
  step4ButtonText: {
    color: colors.accent.primary,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  step4ButtonTextSecondary: {
    color: colors.text.muted,
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  step4NavigationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  step4SkipButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.border.default,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  step4SkipButtonText: {
    color: colors.text.muted,
    fontSize: 14,
    fontWeight: '600',
  },
  step4FinishButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: colors.surface.secondary,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  step4FinishButtonText: {
    color: colors.accent.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  step4FinishCheckmark: {
    // Container for the checkmark SVG
  },
  optionTile: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  optionBlur: {
    paddingVertical: 24,
    paddingHorizontal: 24,
  },
  optionTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  optionSubtitle: {
    color: colors.text.muted,
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  sosButtonSmall: {
    shadowColor: '#ff6b9d',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  sosButtonSmallGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosTextSmall: {
    color: '#ffffff',
    fontSize: 10,
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
    borderColor: colors.border.default,
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
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  transitionArrow: {
    color: colors.text.muted,
    fontSize: 24,
    fontWeight: '300',
    marginHorizontal: 8,
    marginTop: -20,
  },
  transitionModalButton: {
    backgroundColor: 'rgba(0, 217, 163, 0.2)',
    borderWidth: 2,
    borderColor: colors.accent.primary,
    borderRadius: 22,
    paddingVertical: 14,
    paddingHorizontal: 48,
  },
  transitionModalButtonText: {
    color: colors.accent.primary,
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  helpButtonSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpButtonSmallActive: {
    backgroundColor: 'rgba(0, 217, 163, 0.2)',
    borderColor: colors.accent.primary,
  },
  helpButtonSmallIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  journalButtonFloating: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  journalIconFloating: {
    fontSize: 20,
  },
  journalFullscreen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  journalNotebook: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  journalCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  journalHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journalCancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E9EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalCancelText: {
    color: '#666666',
    fontSize: 24,
    fontWeight: '300',
  },
  journalDoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalNotebookContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  journalNotebookTitle: {
    color: '#1A1A1A',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  journalNotebookSubtitle: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginBottom: 24,
  },
  journalTextInputWrapper: {
    flex: 1,
  },
  journalTextInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
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
    backgroundColor: colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  exerciseModalCloseText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '300',
  },
  exerciseModalTitle: {
    color: colors.text.primary,
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
    color: colors.text.muted,
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
    borderColor: colors.border.subtle,
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
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  exerciseDescription: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '400',
    lineHeight: 18,
  },
  exercisePlayIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 217, 163, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIconText: {
    color: colors.accent.primary,
    fontSize: 14,
    marginLeft: 2,
  },
  helpModeHighlight: {
    borderColor: colors.accent.primary,
    borderWidth: 2,
    backgroundColor: colors.surface.secondary,
  },
  helpModeHighlightSOS: {
    shadowColor: colors.accent.primary,
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  helpInfoOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  helpInfoContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    maxWidth: 340,
    width: '100%',
  },
  helpInfoContent: {
    padding: 24,
    alignItems: 'center',
  },
  helpInfoTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  helpInfoDescription: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '400',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  helpInfoButton: {
    backgroundColor: colors.surface.secondary,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
  },
  helpInfoButtonText: {
    color: colors.accent.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  exitModalContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    maxWidth: 380,
    width: '100%',
  },
  exitModalContent: {
    padding: 32,
    alignItems: 'center',
  },
  exitModalTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  exitModalMessage: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  exitModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  exitModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  exitModalButtonCancel: {
    backgroundColor: colors.surface.tertiary,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  exitModalButtonConfirm: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  exitModalButtonTextCancel: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  exitModalButtonTextConfirm: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})
