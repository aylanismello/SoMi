import { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, TouchableOpacity, Text, Animated, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { useAudioPlayer, AudioPlayer } from 'expo-audio'
import { Audio } from 'expo-av'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useSettings } from '../contexts/SettingsContext'
import SettingsModal from './SettingsModal'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const BELL_SOUND_URL = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20sounds/meditation_bell_1.wav'

export default function MeditationTimerActive({ route, navigation }) {
  const { totalMinutes, intervalSetting } = route.params
  const totalSeconds = totalMinutes * 60

  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [showExitModal, setShowExitModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const intervalRef = useRef(null)
  const isPausedRef = useRef(false)
  const elapsedRef = useRef(0)
  const lastBellTimeRef = useRef(0)

  const { isMusicEnabled, showTime } = useSettings()
  const bellPlayer = useAudioPlayer(BELL_SOUND_URL)

  // Animated value for smooth progress
  const progressAnim = useRef(new Animated.Value(0)).current
  const animationRef = useRef(null)

  // Configure audio session for background playback
  useEffect(() => {
    const configureAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        })
      } catch (error) {
        console.error('Error configuring audio:', error)
      }
    }
    configureAudio()
  }, [])

  // Set bell volume to 50%
  useEffect(() => {
    if (bellPlayer) {
      bellPlayer.volume = 0.5
    }
  }, [bellPlayer])

  // Start timer on mount
  useEffect(() => {
    // Play bell on start
    playBell()
    startTimer()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
      if (animationRef.current) {
        progressAnim.stopAnimation()
      }
    }
  }, [])

  const startTimer = () => {
    // Start progress animation
    progressAnim.setValue(0)
    animationRef.current = Animated.timing(progressAnim, {
      toValue: 1,
      duration: totalSeconds * 1000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleComplete()
      }
    })

    // Start interval timer
    intervalRef.current = setInterval(() => {
      if (!isPausedRef.current) {
        elapsedRef.current += 1
        setElapsedSeconds(elapsedRef.current)

        // Check if we should play bell
        checkAndPlayBell(elapsedRef.current)

        // Check if timer is complete
        if (elapsedRef.current >= totalSeconds) {
          handleComplete()
        }
      }
    }, 1000)
  }

  const checkAndPlayBell = (elapsed) => {
    if (!intervalSetting || intervalSetting === null) {
      return // No interval bell
    }

    if (intervalSetting === 'halfway') {
      const halfwayPoint = Math.floor(totalSeconds / 2)
      if (elapsed === halfwayPoint && lastBellTimeRef.current !== halfwayPoint) {
        playBell()
        lastBellTimeRef.current = halfwayPoint
      }
    } else {
      // intervalSetting is a number of seconds
      const intervalSeconds = intervalSetting
      if (elapsed % intervalSeconds === 0 && elapsed > 0 && lastBellTimeRef.current !== elapsed) {
        playBell()
        lastBellTimeRef.current = elapsed
      }
    }
  }

  const playBell = async () => {
    try {
      if (bellPlayer) {
        await bellPlayer.seekTo(0)
        await bellPlayer.play()
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    } catch (error) {
      console.error('Error playing bell:', error)
    }
  }

  const handleComplete = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    progressAnim.stopAnimation()

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Play completion bell
    playBell()

    // Navigate back to home after bell finishes playing (give it 4 seconds)
    setTimeout(() => {
      navigation.replace('HomeMain')
    }, 4000)
  }

  const handlePauseResume = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    const newPausedState = !isPaused
    setIsPaused(newPausedState)
    isPausedRef.current = newPausedState

    if (newPausedState) {
      // Pause animation
      progressAnim.stopAnimation((value) => {
        progressAnim.setValue(value)
      })
    } else {
      // Resume animation
      const remainingTime = (totalSeconds - elapsedRef.current) * 1000
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingTime,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          handleComplete()
        }
      })
    }
  }

  const handleClosePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowExitModal(true)
  }

  const handleConfirmExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    setShowExitModal(false)

    // Clear all timers and animations
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    progressAnim.stopAnimation()

    // Stop bell if playing
    if (bellPlayer) {
      bellPlayer.pause()
    }

    // Navigate back to home
    setTimeout(() => {
      navigation.replace('HomeMain')
    }, 100)
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

  // Calculate progress for circular indicator
  const radius = 100
  const strokeWidth = 8
  const circumference = 2 * Math.PI * radius

  const strokeDashoffset = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [circumference, 0],
  })

  const remainingSeconds = totalSeconds - elapsedSeconds
  const displayMinutes = Math.floor(remainingSeconds / 60)
  const displaySeconds = remainingSeconds % 60

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      {/* Header with Settings and Close */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleOpenSettings}
          style={styles.settingsButton}
          activeOpacity={0.7}
        >
          <Text style={styles.settingsButtonText}>⚙️</Text>
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

      {/* Timer Content */}
      <View style={styles.contentContainer}>
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
            {showTime && (
              <Text style={styles.timeText}>
                {displayMinutes}:{String(displaySeconds).padStart(2, '0')}
              </Text>
            )}
          </View>
        </View>

        {/* Pause/Resume Button */}
        <TouchableOpacity
          onPress={handlePauseResume}
          style={styles.pauseButton}
          activeOpacity={0.8}
        >
          <View style={styles.pauseButtonInner}>
            {isPaused ? (
              <Text style={styles.pauseIcon}>▶</Text>
            ) : (
              <View style={styles.pauseIcons}>
                <View style={styles.pauseBar} />
                <View style={styles.pauseBar} />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Timer finish info */}
        <Text style={styles.finishText}>
          Timer finishes at {getFinishTime(totalMinutes)}
        </Text>
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
              <Text style={styles.exitModalTitle}>End Timer?</Text>
              <Text style={styles.exitModalMessage}>
                Are you sure you want to end this timer early?
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

function getFinishTime(minutes) {
  const now = new Date()
  const finish = new Date(now.getTime() + minutes * 60000)
  const hours = finish.getHours()
  const mins = finish.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`
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
  settingsButtonText: {
    fontSize: 24,
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
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: colors.text.primary,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: -2,
  },
  pauseButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0, 217, 163, 0.2)',
    borderWidth: 2,
    borderColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  pauseButtonInner: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseIcon: {
    color: colors.accent.primary,
    fontSize: 32,
    fontWeight: '400',
    marginLeft: 4,
  },
  pauseIcons: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  pauseBar: {
    width: 4,
    height: 24,
    backgroundColor: colors.accent.primary,
    borderRadius: 2,
  },
  finishText: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
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
