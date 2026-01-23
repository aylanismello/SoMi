import { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, TouchableOpacity, Text, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { useAudioPlayer } from 'expo-audio'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'

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
  const [isMuted, setIsMuted] = useState(false)

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

  // Control audio muting
  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.muted = isMuted
    }
  }, [isMuted, audioPlayer])

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

  const handleToggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setIsMuted(!isMuted)
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
      {/* Header with Mute and Skip buttons */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleToggleMute}
          style={styles.muteButton}
          activeOpacity={0.7}
        >
          <Text style={styles.muteButtonText}>{isMuted ? '🔇' : '🔊'}</Text>
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        <TouchableOpacity
          onPress={handleSkip}
          style={styles.skipButton}
          activeOpacity={0.7}
        >
          <Text style={styles.skipButtonIcon}>⏭</Text>
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
  muteButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  muteButtonText: {
    fontSize: 20,
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  skipButtonText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  skipButtonIcon: {
    fontSize: 20,
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
})
