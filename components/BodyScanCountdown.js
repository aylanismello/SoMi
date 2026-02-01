import { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, TouchableOpacity, Text, Animated, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { somiChainService } from '../supabase'
import { useSettingsStore } from '../stores/settingsStore'
import { useFlowMusicStore } from '../stores/flowMusicStore'
import SettingsModal from './SettingsModal'

const COUNTDOWN_DURATION_SECONDS = 60

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export default function BodyScanCountdown({ route, navigation }) {
  const {
    isInitial, // true = before first check-in, false = after last block
    savedInitialValue,
    savedInitialState,
    skipToRoutine, // If true, skip directly to Step 2 after body scan
    fromCheckIn, // If true, show back button instead of skip
  } = route.params

  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION_SECONDS)
  const countdownIntervalRef = useRef(null)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [infinityMode, setInfinityMode] = useState(false)
  const infinityModeRef = useRef(false)
  const savedCountdownRef = useRef(COUNTDOWN_DURATION_SECONDS)
  const startTimeRef = useRef(null)

  // Pulsing animation for infinity symbol
  const infinityPulseAnim = useRef(new Animated.Value(1)).current

  const { isMusicEnabled, showTime } = useSettingsStore()
  const { startFlowMusic, stopFlowMusic, updateMusicSetting, audioPlayer } = useFlowMusicStore()

  // Animated value for smooth progress
  const progressAnim = useRef(new Animated.Value(0)).current

  // Initialize start time and start flow music on mount
  useEffect(() => {
    // Reset start time
    startTimeRef.current = Date.now()

    // Start the flow music at the VERY FIRST body scan (if this is initial)
    if (isInitial && audioPlayer) {
      console.log('BodyScanCountdown: Starting flow music for initial body scan')
      startFlowMusic(isMusicEnabled)
    }

    return () => {
      // Don't stop music on unmount - it should continue through the flow
      console.log('BodyScanCountdown: Unmounting but keeping audio player alive')
    }
  }, [isInitial, audioPlayer])

  // Handle music toggle
  useEffect(() => {
    updateMusicSetting(isMusicEnabled)
  }, [isMusicEnabled])

  // Smooth animation for progress circle (runs once on mount)
  useEffect(() => {
    progressAnim.setValue(0)

    const runAnimation = () => {
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: COUNTDOWN_DURATION_SECONDS * 1000,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          if (infinityModeRef.current) {
            // In infinity mode, reset and loop
            progressAnim.setValue(0)
            runAnimation()
          } else {
            // Normal mode, complete the body scan
            handleComplete()
          }
        }
      })
    }

    runAnimation()

    return () => {
      progressAnim.stopAnimation()
    }
  }, [])

  // Timer for display (countdown in normal mode, count up in infinity mode)
  useEffect(() => {
    // Single interval that runs continuously, direction controlled by ref
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (infinityModeRef.current) {
          // Infinity mode: count up
          return prev + 1
        } else {
          // Normal mode: count down
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current)
            return 0
          }
          return prev - 1
        }
      })
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  const handleComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Don't stop music - it continues through the flow

    // Save body scan as a completed block
    // Use active chain if exists (from check-in), otherwise create new one
    const elapsedMs = Date.now() - startTimeRef.current
    const elapsedSeconds = Math.round(elapsedMs / 1000)
    const BODY_SCAN_BLOCK_ID = 20 // From somi_blocks table
    const chainId = await somiChainService.getOrCreateActiveChain()
    await somiChainService.saveCompletedBlock(BODY_SCAN_BLOCK_ID, elapsedSeconds, 0, chainId)
    console.log(`Body scan completed and saved: ${elapsedSeconds}s, chain: ${chainId}`)

    if (skipToRoutine) {
      // Skip check-in, go directly to Step 2 (selection)
      navigation.replace('SoMiCheckIn', {
        fromBodyScan: true,
        skipToStep2: true,
      })
    } else if (isInitial) {
      // After initial body scan, go to first check-in
      navigation.replace('SoMiCheckIn', {
        fromBodyScan: true,
      })
    } else {
      // After final body scan, go to final check-in
      navigation.replace('SoMiCheckIn', {
        fromPlayer: true,
        savedInitialValue,
        savedInitialState,
      })
    }
  }

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Stop animations
    progressAnim.stopAnimation()
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    handleComplete()
  }

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Stop animations
    progressAnim.stopAnimation()
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    // Don't stop music - it continues through the flow
    // Go back to check-in
    navigation.goBack()
  }

  const handleClosePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowExitModal(true)
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)

    // Stop animations
    progressAnim.stopAnimation()
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    // Stop flow music when exiting early
    stopFlowMusic()

    // End the active chain when exiting early
    await somiChainService.endActiveChain()

    // Go directly to home
    navigation.navigate('Home')
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
  }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowSettingsModal(true)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)
  }

  const handleToggleInfinity = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const newMode = !infinityMode
    setInfinityMode(newMode)
    infinityModeRef.current = newMode

    if (newMode) {
      // Toggling to infinity mode - save current countdown value and stop the animation
      savedCountdownRef.current = countdown
      progressAnim.stopAnimation()

      // Start pulsing animation for infinity symbol
      Animated.loop(
        Animated.sequence([
          Animated.timing(infinityPulseAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(infinityPulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      // Toggling back to normal mode from infinity
      // Restore countdown to saved value (where it was when infinity was enabled)
      const resumeCountdown = savedCountdownRef.current
      setCountdown(resumeCountdown)

      // Stop pulsing animation
      infinityPulseAnim.stopAnimation()
      infinityPulseAnim.setValue(1)

      // Calculate how much time has elapsed and resume animation from there
      const elapsedTime = COUNTDOWN_DURATION_SECONDS - resumeCountdown
      const remainingTime = resumeCountdown * 1000
      const initialProgress = elapsedTime / COUNTDOWN_DURATION_SECONDS

      // Stop and restart the animation from where we left off
      progressAnim.stopAnimation()
      progressAnim.setValue(initialProgress)

      Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingTime,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !infinityModeRef.current) {
          handleComplete()
        }
      })
    }
  }

  const message = isInitial
    ? "how do you feel in the body?\nnotice any sensations\ngoing into this flow"
    : "how do you feel those sensations\ncoming out of this flow"

  // Calculate progress for circular indicator
  const radius = 100
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius

  // Interpolate strokeDashoffset smoothly
  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  })

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      {/* Header with Settings, Skip/Back and Close buttons */}
      <View style={styles.header}>
        {fromCheckIn ? (
          <TouchableOpacity
            onPress={handleBackPress}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleOpenSettings}
            style={styles.settingsButton}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        )}
        {!fromCheckIn && (
          <TouchableOpacity
            onPress={handleSkip}
            style={styles.skipButtonLeft}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
        )}
        <View style={{ flex: 1 }} />
        {fromCheckIn ? (
          <TouchableOpacity
            onPress={handleOpenSettings}
            style={styles.settingsButton}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            onPress={handleClosePress}
            style={styles.closeButton}
            activeOpacity={0.7}
          >
            <Text style={styles.closeButtonText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Body Scan Content */}
      <View style={styles.contentContainer}>
        <Text style={styles.title}>Body Scan</Text>

        <Text style={styles.message}>{message}</Text>

        {/* Circular Progress Indicator */}
        <View style={styles.circleContainer}>
          <Svg width={radius * 2 + strokeWidth * 2} height={radius * 2 + strokeWidth * 2}>
            {/* Background circle */}
            <Circle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {/* Progress circle - animated */}
            <AnimatedCircle
              cx={radius + strokeWidth}
              cy={radius + strokeWidth}
              r={radius}
              stroke={infinityMode ? '#9D7CFF' : colors.accent.primary}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
            />
          </Svg>
          <TouchableOpacity
            style={styles.circleCenter}
            onPress={handleToggleInfinity}
            activeOpacity={0.8}
          >
            {infinityMode ? (
              <Animated.Text
                style={[
                  styles.infinitySymbol,
                  { transform: [{ scale: infinityPulseAnim }] }
                ]}
              >
                ∞
              </Animated.Text>
            ) : (
              <>
                <Text style={styles.circleText}>SoMi</Text>
                {showTime && (
                  <Text style={styles.countdownText}>
                    {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                  </Text>
                )}
                <Text style={styles.infinityHint}>tap for ∞</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

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
              <Text style={styles.exitModalTitle}>End Session Early?</Text>
              <Text style={styles.exitModalMessage}>
                Are you sure you want to end this body scan early?
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

      <SettingsModal visible={showSettingsModal} onClose={handleCloseSettings} />
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    marginBottom: 20,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '300',
  },
  settingsButtonText: {
    fontSize: 24,
  },
  skipButtonLeft: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  skipButtonText: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '400',
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '300',
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  title: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 40,
    letterSpacing: 0.5,
  },
  message: {
    color: colors.text.secondary,
    fontSize: 18,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 26,
    marginBottom: 60,
    paddingHorizontal: 20,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 4,
  },
  countdownText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    opacity: 0.5,
    marginTop: 4,
    marginBottom: 4,
  },
  infinityHint: {
    color: colors.text.secondary,
    fontSize: 11,
    fontWeight: '400',
    letterSpacing: 0.5,
    opacity: 0.6,
  },
  infinitySymbol: {
    color: '#9D7CFF',
    fontSize: 48,
    fontWeight: '300',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
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
