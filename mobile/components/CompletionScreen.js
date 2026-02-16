import { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Animated, Dimensions, Easing } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { Video } from 'expo-av'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useLatestChain } from '../hooks/useSupabaseQueries'
import { useFlowMusicStore } from '../stores/flowMusicStore'

const { width, height } = Dimensions.get('window')

// Polyvagal states
const POLYVAGAL_STATES = {
  1: { label: 'Drained', color: '#4A5F8C', emoji: '🌧' },
  2: { label: 'Foggy', color: '#5B7BB4', emoji: '🌫' },
  3: { label: 'Wired', color: '#6B9BD1', emoji: '🌪' },
  4: { label: 'Steady', color: '#7DBCE7', emoji: '🌤' },
  5: { label: 'Glowing', color: '#90DDF0', emoji: '☀️' },
}

// Generate random confetti particles
const generateConfetti = (count) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    emoji: ['✨', '🎉', '⭐', '💫', '🌟'][Math.floor(Math.random() * 5)],
    x: Math.random() * width,
    delay: Math.random() * 600,
    duration: 1500 + Math.random() * 1000,
    rotation: Math.random() * 360,
  }))
}

export default function CompletionScreen({ route, navigation }) {
  console.log('🎉🎉🎉 COMPLETION SCREEN RENDERING 🎉🎉🎉')
  const { data: latestChain } = useLatestChain()
  const [confetti] = useState(generateConfetti(20))
  const { stopFlowMusic } = useFlowMusicStore()

  // Animated values for staged reveal
  const badgeScale = useRef(new Animated.Value(0)).current
  const badgeRotate = useRef(new Animated.Value(0)).current
  const titleFade = useRef(new Animated.Value(0)).current
  const stat1Slide = useRef(new Animated.Value(50)).current
  const stat1Fade = useRef(new Animated.Value(0)).current
  const stat2Slide = useRef(new Animated.Value(50)).current
  const stat2Fade = useRef(new Animated.Value(0)).current
  const stat3Slide = useRef(new Animated.Value(50)).current
  const stat3Fade = useRef(new Animated.Value(0)).current
  const buttonSlide = useRef(new Animated.Value(30)).current
  const buttonFade = useRef(new Animated.Value(0)).current

  // Confetti animations
  const confettiAnims = useRef(
    confetti.map(() => ({
      translateY: new Animated.Value(-100),
      opacity: new Animated.Value(1),
      rotate: new Animated.Value(0),
    }))
  ).current

  useEffect(() => {
    // Initial success haptic
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Stage 1: Badge pop-in (0ms)
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
      Animated.parallel([
        Animated.spring(badgeScale, {
          toValue: 1,
          friction: 6,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(badgeRotate, {
          toValue: 360,
          duration: 800,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start()
    }, 100)

    // Stage 2: Title fade (400ms)
    setTimeout(() => {
      Animated.timing(titleFade, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }).start()
    }, 400)

    // Stage 3: Confetti explosion (500ms)
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
      confettiAnims.forEach((anim, i) => {
        Animated.parallel([
          Animated.timing(anim.translateY, {
            toValue: height + 100,
            duration: confetti[i].duration,
            delay: confetti[i].delay,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(anim.opacity, {
            toValue: 0,
            duration: confetti[i].duration,
            delay: confetti[i].delay + confetti[i].duration * 0.6,
            useNativeDriver: true,
          }),
          Animated.timing(anim.rotate, {
            toValue: 360,
            duration: confetti[i].duration,
            delay: confetti[i].delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]).start()
      })
    }, 500)

    // Stage 4: First stat (transformation) - 900ms
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      Animated.parallel([
        Animated.spring(stat1Slide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(stat1Fade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }, 900)

    // Stage 5: Second stat (practice stats) - 1300ms
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      Animated.parallel([
        Animated.spring(stat2Slide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(stat2Fade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }, 1300)

    // Stage 6: Third stat (streak) - 1700ms
    setTimeout(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
      Animated.parallel([
        Animated.spring(stat3Slide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(stat3Fade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }, 1700)

    // Stage 7: Button appears - 2200ms
    setTimeout(() => {
      Animated.parallel([
        Animated.spring(buttonSlide, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }),
        Animated.timing(buttonFade, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start()
    }, 2200)
  }, [])

  // Calculate stats
  const getStats = () => {
    if (!latestChain) return null

    const totalSeconds = (latestChain.somi_chain_entries || []).reduce(
      (sum, entry) => sum + (entry.seconds_elapsed || 0),
      0
    )
    const totalMinutes = totalSeconds > 0 ? Math.max(1, Math.ceil(totalSeconds / 60)) : 0
    const blockCount = latestChain.somi_chain_entries?.length || 0

    const checks = latestChain.embodiment_checks || []
    const fromStateCode = checks[0]?.polyvagal_state_code || 4
    const toStateCode = checks[checks.length - 1]?.polyvagal_state_code || 4

    return {
      totalMinutes,
      blockCount,
      fromState: POLYVAGAL_STATES[fromStateCode],
      toState: POLYVAGAL_STATES[toStateCode],
      hasTransformation: fromStateCode !== toStateCode,
    }
  }

  // Calculate streak (simple: just check if completed yesterday)
  const getStreak = () => {
    // TODO: Implement proper streak calculation from backend
    // For now, return placeholder
    return 1
  }

  const stats = getStats()
  const streak = getStreak()

  const handleContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Fade out flow music when user presses Continue
    console.log('🎵 CompletionScreen: Fading out flow music on Continue...')
    stopFlowMusic()

    // Reset Flow stack and navigate to Home
    navigation.reset({
      index: 0,
      routes: [{ name: 'FlowMenu' }],
    })

    const tabNavigator = navigation.getParent()
    if (tabNavigator) {
      tabNavigator.navigate('Home')
    }
  }

  const badgeRotateInterpolate = badgeRotate.interpolate({
    inputRange: [0, 360],
    outputRange: ['0deg', '360deg'],
  })

  if (!stats) {
    return (
      <LinearGradient
        colors={['#000000', '#1a0a0a', '#000000']}
        style={styles.container}
      >
        <Text style={styles.loadingText}>Loading...</Text>
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={['#000000', '#1a0a0a', '#000000']}
      style={styles.container}
    >
      {/* Background ocean video */}
      <Video
        source={{ uri: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20videos/ocean_loop_final.mp4' }}
        style={styles.backgroundVideo}
        resizeMode="cover"
        shouldPlay
        isLooping
        isMuted
      />

      {/* Confetti particles */}
      {confetti.map((particle, i) => {
        const rotateInterpolate = confettiAnims[i].rotate.interpolate({
          inputRange: [0, 360],
          outputRange: ['0deg', '360deg'],
        })

        return (
          <Animated.Text
            key={particle.id}
            style={[
              styles.confettiParticle,
              {
                left: particle.x,
                opacity: confettiAnims[i].opacity,
                transform: [
                  { translateY: confettiAnims[i].translateY },
                  { rotate: rotateInterpolate },
                ],
              },
            ]}
          >
            {particle.emoji}
          </Animated.Text>
        )
      })}

      <View style={styles.content}>
        {/* Giant celebration badge */}
        <Animated.View
          style={[
            styles.badgeContainer,
            {
              transform: [
                { scale: badgeScale },
                { rotate: badgeRotateInterpolate },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={[colors.accent.teal, colors.accent.secondary, colors.accent.teal]}
            style={styles.badgeGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.badgeInner}>
              <Text style={styles.badgeEmoji}>🌊</Text>
              <Text style={styles.badgeText}>FLOW</Text>
              <Text style={styles.badgeSubtext}>COMPLETE</Text>
            </View>
          </LinearGradient>
        </Animated.View>

        {/* Title */}
        <Animated.View style={[styles.titleContainer, { opacity: titleFade }]}>
          <Text style={styles.mainTitle}>Incredible!</Text>
          <Text style={styles.subtitle}>You completed your Daily Flow</Text>
        </Animated.View>

        {/* Stats reveal */}
        <View style={styles.statsContainer}>
          {/* Transformation stat */}
          <Animated.View
            style={[
              styles.statRow,
              {
                opacity: stat1Fade,
                transform: [{ translateY: stat1Slide }],
              },
            ]}
          >
            <BlurView intensity={15} tint="dark" style={styles.statBlur}>
              <View style={styles.statContent}>
                {stats.hasTransformation ? (
                  <View style={styles.transformationStat}>
                    <View style={styles.stateRow}>
                      <View style={[styles.miniStateCircle, { backgroundColor: stats.fromState.color }]}>
                        <Text style={styles.miniStateEmoji}>{stats.fromState.emoji}</Text>
                      </View>
                      <Text style={styles.statArrow}>→</Text>
                      <View style={[styles.miniStateCircle, { backgroundColor: stats.toState.color }]}>
                        <Text style={styles.miniStateEmoji}>{stats.toState.emoji}</Text>
                      </View>
                    </View>
                    <Text style={styles.transformationLabel}>
                      {stats.fromState.label} → {stats.toState.label}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.transformationStat}>
                    <View style={[styles.miniStateCircle, { backgroundColor: stats.toState.color }]}>
                      <Text style={styles.miniStateEmoji}>{stats.toState.emoji}</Text>
                    </View>
                    <Text style={styles.transformationLabel}>{stats.toState.label}</Text>
                  </View>
                )}
              </View>
            </BlurView>
          </Animated.View>

          {/* Time & exercises stat */}
          <Animated.View
            style={[
              styles.statRow,
              {
                opacity: stat2Fade,
                transform: [{ translateY: stat2Slide }],
              },
            ]}
          >
            <BlurView intensity={15} tint="dark" style={styles.statBlur}>
              <View style={styles.statContent}>
                <View style={styles.dualStat}>
                  <View style={styles.statBox}>
                    <Text style={styles.bigNumber}>{stats.totalMinutes}</Text>
                    <Text style={styles.statLabel}>minutes</Text>
                  </View>
                  <View style={styles.statDivider} />
                  <View style={styles.statBox}>
                    <Text style={styles.bigNumber}>{stats.blockCount}</Text>
                    <Text style={styles.statLabel}>exercises</Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </Animated.View>

          {/* Streak stat */}
          <Animated.View
            style={[
              styles.statRow,
              {
                opacity: stat3Fade,
                transform: [{ translateY: stat3Slide }],
              },
            ]}
          >
            <BlurView intensity={15} tint="dark" style={styles.statBlur}>
              <View style={styles.statContent}>
                <View style={styles.streakStat}>
                  <Text style={styles.streakEmoji}>🔥</Text>
                  <View style={styles.streakInfo}>
                    <Text style={styles.streakNumber}>
                      {streak} {streak === 1 ? 'day' : 'days'}
                    </Text>
                    <Text style={styles.streakLabel}>
                      {streak === 1 ? 'Keep it going!' : 'On fire!'}
                    </Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </Animated.View>
        </View>

        {/* Continue button */}
        <Animated.View
          style={[
            styles.buttonContainer,
            {
              opacity: buttonFade,
              transform: [{ translateY: buttonSlide }],
            },
          ]}
        >
          <TouchableOpacity
            onPress={handleContinue}
            activeOpacity={0.8}
            style={styles.continueButton}
          >
            <LinearGradient
              colors={[colors.accent.primary, colors.accent.secondary]}
              style={styles.continueGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.continueText}>Continue</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.4,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 18,
    textAlign: 'center',
    marginTop: 100,
  },
  confettiParticle: {
    position: 'absolute',
    fontSize: 30,
    top: -100,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 80,
    paddingBottom: 40,
  },
  badgeContainer: {
    marginBottom: 28,
  },
  badgeGradient: {
    width: 155,
    height: 155,
    borderRadius: 78,
    padding: 3,
    shadowColor: colors.accent.teal,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 11,
  },
  badgeInner: {
    flex: 1,
    backgroundColor: '#000000',
    borderRadius: 75,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: colors.accent.teal,
  },
  badgeEmoji: {
    fontSize: 48,
    marginBottom: 3,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: 1.8,
  },
  badgeSubtext: {
    color: colors.accent.teal,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  titleContainer: {
    alignItems: 'center',
    marginBottom: 28,
  },
  mainTitle: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  statsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 20,
  },
  statRow: {
    width: '100%',
  },
  statBlur: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statContent: {
    padding: 16,
  },
  transformationStat: {
    alignItems: 'center',
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  miniStateCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniStateEmoji: {
    fontSize: 20,
  },
  statArrow: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 20,
    fontWeight: '600',
  },
  transformationLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  dualStat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  bigNumber: {
    color: colors.accent.teal,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1.5,
    marginBottom: 2,
  },
  statLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  streakStat: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  streakEmoji: {
    fontSize: 40,
  },
  streakInfo: {
    alignItems: 'flex-start',
  },
  streakNumber: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  streakLabel: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  buttonContainer: {
    width: '100%',
    marginTop: 'auto',
    marginBottom: 50,
    paddingTop: 8,
  },
  continueButton: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: colors.accent.teal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  continueGradient: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  continueText: {
    color: '#ffffff',
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: 1,
  },
})
