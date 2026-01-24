import { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, TouchableOpacity, Text, Animated, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useAudioPlayer } from 'expo-audio'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { somiChainService } from '../supabase'

const COUNTDOWN_DURATION_SECONDS = 60

// Body scan audio URLs
const START_BODY_SCAN_AUDIO = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20sounds/body_scan_music_1%20.mp3'
const END_BODY_SCAN_AUDIO = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20sounds/body_scan_music_2.mp3'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

export default function BodyScanCountdown({ route, navigation }) {
  const {
    isInitial, // true = before first check-in, false = after last block
    savedInitialValue,
    savedInitialState,
    skipToRoutine, // If true, skip directly to Step 2 after body scan
  } = route.params

  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION_SECONDS)
  const countdownIntervalRef = useRef(null)
  const [showExitModal, setShowExitModal] = useState(false)

  // Animated value for smooth progress
  const progressAnim = useRef(new Animated.Value(0)).current

  // Audio player for body scan guidance
  const audioUrl = isInitial ? START_BODY_SCAN_AUDIO : END_BODY_SCAN_AUDIO
  const audioPlayer = useAudioPlayer(audioUrl)

  // Auto-play audio on mount
  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.play()
    }

    return () => {
      // Cleanup audio on unmount (with safety check)
      try {
        if (audioPlayer && audioPlayer.playing) {
          audioPlayer.pause()
        }
      } catch (err) {
        // Silent cleanup - audio may already be disposed
        console.log('Audio cleanup on unmount:', err.message)
      }
    }
  }, [audioPlayer])

  // Smooth animation for progress circle
  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: COUNTDOWN_DURATION_SECONDS * 1000,
      useNativeDriver: false,
    }).start(() => {
      handleComplete()
    })

    return () => {
      progressAnim.stopAnimation()
    }
  }, [])

  // Countdown timer for display
  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [])

  const handleComplete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Pause audio before navigating (with safety checks)
    try {
      if (audioPlayer && audioPlayer.playing) {
        audioPlayer.pause()
      }
    } catch (err) {
      console.log('Audio player cleanup warning:', err.message)
    }

    if (skipToRoutine) {
      // Skip check-in, go directly to Step 2 (selection)
      navigation.replace('CheckIn', {
        fromBodyScan: true,
        skipToStep2: true,
      })
    } else if (isInitial) {
      // After initial body scan, go to first check-in
      navigation.replace('CheckIn', {
        fromBodyScan: true,
      })
    } else {
      // After final body scan, go to final check-in
      navigation.replace('CheckIn', {
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

  const handleClosePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowExitModal(true)
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)

    // Stop animations and audio
    progressAnim.stopAnimation()
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    try {
      if (audioPlayer && audioPlayer.playing) {
        audioPlayer.pause()
      }
    } catch (err) {
      console.log('Audio player cleanup warning:', err.message)
    }

    // End the active chain when exiting early
    await somiChainService.endActiveChain()

    // Go directly to home
    navigation.navigate('Home')
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
  }

  const message = isInitial
    ? "how do you feel in the body?\nnotice any sensations\ngoing into this SoMi check-in"
    : "how do you feel those sensations\ncoming out of the SoMi check-in"

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
      {/* Header with Skip and Close buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButtonLeft}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonText}>Skip</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleClosePress}
          style={styles.closeButton}
          activeOpacity={0.7}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
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
              stroke={colors.accent.primary}
              strokeWidth={strokeWidth}
              fill="none"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
            />
          </Svg>
          <View style={styles.circleCenter}>
            <Text style={styles.circleText}>SoMi</Text>
          </View>
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
