import React, { useState, useRef, useEffect } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Animated } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import Svg, { Path } from 'react-native-svg'
import { MEDIA, getMediaForSliderValue } from '../constants/media'

const BODY_SCAN_MEDIA = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/5%20Min.%20Body%20Scan%20Meditation_CW2%201.mp3',
  type: 'audio',
}
import EmbodimentSlider from './EmbodimentSlider'
import { supabase } from '../supabase'

// Polyvagal states for chip selection
const POLYVAGAL_STATES = [
  { id: 'withdrawn', label: 'Withdrawn', color: '#7b68ee' },
  { id: 'stirring', label: 'Stirring', color: '#9d7be8' },
  { id: 'activated', label: 'Activated', color: '#b88ddc' },
  { id: 'settling', label: 'Settling', color: '#68c9ba' },
  { id: 'connected', label: 'Connected', color: '#4ecdc4' },
]

export default function SoMeCheckIn({ navigation, route }) {
  // Check if we're coming back from player (step 4)
  const fromPlayer = route?.params?.fromPlayer || false

  const [sliderValue, setSliderValue] = useState(50)
  const [sliderChanged, setSliderChanged] = useState(false)
  const [polyvagalState, setPolyvagalState] = useState(POLYVAGAL_STATES[2].id)
  const [currentStep, setCurrentStep] = useState(fromPlayer ? 4 : 1) // 1: initial check-in, 2: selection, 3: player, 4: loop check-in
  const [showConfirmMessage, setShowConfirmMessage] = useState(false)
  const [messageOpacity] = useState(new Animated.Value(0))

  // Separate state for loop check-in (Step 4)
  const [loopSliderValue, setLoopSliderValue] = useState(50)
  const [loopPolyvagalState, setLoopPolyvagalState] = useState(POLYVAGAL_STATES[2].id)

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
    if (isFromPlayer) {
      justCameFromPlayer.current = true
      // Coming from Player - go to Step 4
      setCurrentStep(4)

      // Set Step 4 animation values
      step1Opacity.setValue(0)
      step1TranslateX.setValue(-50)
      step2Opacity.setValue(0)
      step2TranslateX.setValue(50)
      step4Opacity.setValue(1)
      step4TranslateX.setValue(0)

      // Clear the param
      navigation.setParams({ fromPlayer: false })
    }
  }, [route?.params?.fromPlayer])

  // Reset to Step 1 when screen is focused (only if not coming from Player)
  useFocusEffect(
    React.useCallback(() => {
      if (!justCameFromPlayer.current) {
        // Reset state when coming back to check-in (not from player)
        setSliderValue(50)
        setPolyvagalState(POLYVAGAL_STATES[2].id)
        setLoopSliderValue(50)
        setLoopPolyvagalState(POLYVAGAL_STATES[2].id)
        setSliderChanged(false)
        setCurrentStep(1)

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

  const saveEmbodimentCheck = async (value) => {
    try {
      const { data, error } = await supabase
        .from('embodiment_checks')
        .insert({
          slider_value: Math.round(value),
        })

      if (error) {
        console.error('Error saving embodiment check:', error)
      } else {
        console.log('Embodiment check saved:', data)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const handleSOSPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleSOSRelease = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    navigation.navigate('Player', { media: MEDIA.SOS, initialValue: sliderValue })
  }

  const handleSoMiRoutinePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Save to Supabase
    saveEmbodimentCheck(sliderValue)

    const media = getMediaForSliderValue(sliderValue)
    navigation.navigate('Player', { media, initialValue: sliderValue })
  }

  const handleSelfGuidedPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Save to Supabase
    saveEmbodimentCheck(sliderValue)

    // Navigate to player with self-guided option (you can customize this)
    const media = getMediaForSliderValue(sliderValue)
    navigation.navigate('Player', { media, initialValue: sliderValue })
  }

  const handleSliderChange = (value) => {
    setSliderValue(value)
    setSliderChanged(true)
  }

  const handleCheckboxPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

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
    Haptics.notificationAsync(Haptics.NotificationFeedbackStyle.Success)

    // Save loop check to database
    saveEmbodimentCheck(loopSliderValue)

    // Show confirmation message briefly (but don't navigate)
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Go from Step 4 back to Step 2 (loop!)
    transitionFromStep4ToStep2()
  }

  const handleGoHome = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Exit the loop and go home
    resetStateAndGoHome()
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

  const handleClosePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Close always resets and goes back to Home
    resetStateAndGoHome()
  }

  const resetStateAndGoHome = () => {
    // Reset all state
    setSliderValue(50)
    setPolyvagalState(POLYVAGAL_STATES[2].id)
    setLoopSliderValue(50)
    setLoopPolyvagalState(POLYVAGAL_STATES[2].id)
    setSliderChanged(false)
    setCurrentStep(1)

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
    navigation.navigate('Player', { media: BODY_SCAN_MEDIA, initialValue: sliderValue })
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
              <Text style={styles.optionSubtitle}>Guided regulation session</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleSelfGuidedPress}
            activeOpacity={0.9}
            style={styles.optionTile}
          >
            <BlurView intensity={15} tint="dark" style={styles.optionBlur}>
              <Text style={styles.optionTitle}>Self-Guided Regulation</Text>
              <Text style={styles.optionSubtitle}>Explore at your own pace</Text>
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
    overflow: 'visible',
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
})
