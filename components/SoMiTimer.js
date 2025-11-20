import React, { useState, useEffect, useRef } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Animated, AppState } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import Svg, { Circle } from 'react-native-svg'
import { somiChainService } from '../supabase'
import { soundManager } from '../utils/SoundManager'

export default function SoMiTimer({ navigation, route }) {
  const [seconds, setSeconds] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const intervalRef = useRef(null)
  const startTimeRef = useRef(null) // Track when timer started
  const pausedTimeRef = useRef(0) // Track total paused time
  const pauseStartRef = useRef(null) // Track when pause started

  // Breathing animation
  const breatheScale = useRef(new Animated.Value(1)).current
  const breatheOpacity = useRef(new Animated.Value(0.6)).current

  // Start timer on mount and play start sound
  useEffect(() => {
    startTimer()
    startBreathingAnimation()
    // Play block start sound when timer begins
    soundManager.playBlockStart()

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  // Handle app state changes (background/foreground)
  useEffect(() => {
    const subscription = AppState.addEventListener('change', handleAppStateChange)

    return () => {
      subscription.remove()
    }
  }, [isPaused])

  const handleAppStateChange = (nextAppState) => {
    if (nextAppState === 'active' && !isPaused) {
      // App came to foreground - recalculate elapsed time
      updateElapsedTime()
    }
  }

  const updateElapsedTime = () => {
    if (startTimeRef.current && !isPaused) {
      const now = Date.now()
      const elapsed = Math.floor((now - startTimeRef.current - pausedTimeRef.current) / 1000)
      setSeconds(elapsed)
    }
  }

  const startTimer = () => {
    // Set start time if not already set
    if (!startTimeRef.current) {
      startTimeRef.current = Date.now()
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Update time every second based on elapsed time, not incrementing
    intervalRef.current = setInterval(() => {
      updateElapsedTime()
    }, 1000)
  }

  const startBreathingAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.parallel([
          Animated.timing(breatheScale, {
            toValue: 1.15,
            duration: 3500,
            useNativeDriver: true,
          }),
          Animated.timing(breatheOpacity, {
            toValue: 0.9,
            duration: 3500,
            useNativeDriver: true,
          }),
        ]),
        Animated.parallel([
          Animated.timing(breatheScale, {
            toValue: 1,
            duration: 3500,
            useNativeDriver: true,
          }),
          Animated.timing(breatheOpacity, {
            toValue: 0.6,
            duration: 3500,
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start()
  }

  const handlePauseToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    if (isPaused) {
      // Resuming - add the paused duration to total paused time
      if (pauseStartRef.current) {
        pausedTimeRef.current += Date.now() - pauseStartRef.current
        pauseStartRef.current = null
      }
      startTimer()
    } else {
      // Pausing - record when pause started
      pauseStartRef.current = Date.now()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
    setIsPaused(!isPaused)
  }

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Play block end sound when timer finishes
    soundManager.playBlockEnd()

    // Save timer session as a completed block associated with active chain (check-in flow)
    const TIMER_BLOCK_ID = 15 // Timer block from somi_blocks table
    const chainId = await somiChainService.getOrCreateActiveChain()
    await somiChainService.saveCompletedBlock(TIMER_BLOCK_ID, seconds, 0, chainId)

    // Navigate back to check-in at Step 4
    navigation.navigate('SoMeCheckIn', {
      fromPlayer: true,
      savedInitialValue: route?.params?.initialValue || 0,
      savedInitialState: route?.params?.savedInitialState || null,
    })
  }

  const handleBackPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Play block end sound when user exits timer early
    soundManager.playBlockEnd()

    navigation.goBack()
  }

  const formatTime = (totalSeconds) => {
    const mins = Math.floor(totalSeconds / 60)
    const secs = totalSeconds % 60
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  // Circle measurements for progress ring
  const circleSize = 280
  const strokeWidth = 4
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius

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

        <Text style={styles.headerTitle}>SoMi Time</Text>

        <View style={styles.headerButton} />
      </View>

      <View style={styles.contentContainer}>
        {/* Breathing Circle */}
        <View style={styles.timerContainer}>
          <Animated.View
            style={[
              styles.breathingCircle,
              {
                transform: [{ scale: breatheScale }],
                opacity: breatheOpacity,
              },
            ]}
          >
            <BlurView intensity={30} tint="light" style={styles.breathingCircleBlur}>
              <View style={styles.breathingCircleInner} />
            </BlurView>
          </Animated.View>

          {/* Timer Circle */}
          <View style={styles.timerCircle}>
            <Svg width={circleSize} height={circleSize}>
              {/* Background ring */}
              <Circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke="rgba(78, 205, 196, 0.15)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Animated progress ring */}
              <Circle
                cx={circleSize / 2}
                cy={circleSize / 2}
                r={radius}
                stroke="#4ecdc4"
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * 0.7} // Always show 30% progress as decoration
                strokeLinecap="round"
                transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
              />
            </Svg>

            {/* Time Display */}
            <View style={styles.timeDisplay}>
              <Text style={styles.timeText}>{formatTime(seconds)}</Text>
              <Text style={styles.timeLabel}>minutes of presence</Text>
            </View>
          </View>
        </View>

        {/* Pause/Play Button */}
        <TouchableOpacity
          onPress={handlePauseToggle}
          activeOpacity={0.8}
          style={styles.pauseButton}
        >
          <BlurView intensity={20} tint="dark" style={styles.pauseButtonBlur}>
            <Text style={styles.pauseButtonText}>
              {isPaused ? '▶ Resume' : '⏸ Pause'}
            </Text>
          </BlurView>
        </TouchableOpacity>

        {/* Finish Button */}
        <TouchableOpacity
          onPress={handleFinish}
          activeOpacity={0.9}
          style={styles.finishButton}
        >
          <LinearGradient
            colors={['#4ecdc4', '#44b3aa']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.finishButtonGradient}
          >
            <Text style={styles.finishButtonText}>Finish SoMi Time</Text>
          </LinearGradient>
        </TouchableOpacity>

        {/* Gentle Reminder */}
        <Text style={styles.reminderText}>
          take your time • no rush • you're doing great
        </Text>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 8,
    marginHorizontal: 0,
    marginTop: -60,
    marginBottom: 40,
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 60,
  },
  timerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    position: 'relative',
  },
  breathingCircle: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    overflow: 'hidden',
  },
  breathingCircleBlur: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  breathingCircleInner: {
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(78, 205, 196, 0.2)',
  },
  timerCircle: {
    width: 280,
    height: 280,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  timeDisplay: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeText: {
    color: '#f7f9fb',
    fontSize: 56,
    fontWeight: '300',
    letterSpacing: 2,
    marginBottom: 8,
  },
  timeLabel: {
    color: 'rgba(247, 249, 251, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 1,
    textTransform: 'lowercase',
  },
  pauseButton: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    marginBottom: 16,
    minWidth: 200,
  },
  pauseButtonBlur: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  pauseButtonText: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  finishButton: {
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#4ecdc4',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
    minWidth: 240,
  },
  finishButtonGradient: {
    paddingVertical: 18,
    paddingHorizontal: 40,
    alignItems: 'center',
  },
  finishButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  reminderText: {
    color: 'rgba(247, 249, 251, 0.4)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginTop: 32,
    textTransform: 'lowercase',
  },
})
