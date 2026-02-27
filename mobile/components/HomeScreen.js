import { useState, useCallback, useRef, useEffect } from 'react'
import { StyleSheet, View, Text, Image, TouchableOpacity, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Svg, { Circle } from 'react-native-svg'
import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import CustomizationModal from './CustomizationModal'
import { useAuthStore } from '../stores/authStore'
import { useWeeklyFlows } from '../hooks/useSupabaseQueries'
import { Ionicons } from '@expo/vector-icons'

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
const FLOW_TARGET_SECONDS = 300 // 5 minutes = full circle

function WeekDay({ label, percentage, isToday, isFuture }) {
  const SIZE = 38
  const RADIUS = 15
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS
  const progressLength = (percentage / 100) * CIRCUMFERENCE

  return (
    <View style={styles.dayItem}>
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFillObject}>
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            stroke={isToday ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={2}
            fill={isToday ? 'rgba(255,255,255,0.08)' : 'none'}
          />
          {percentage > 0 && (
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              stroke={isToday ? '#FFFFFF' : colors.accent.primary}
              strokeWidth={2}
              fill="none"
              strokeDasharray={`${progressLength} ${CIRCUMFERENCE}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            />
          )}
        </Svg>
        <Text style={[
          styles.dayLabel,
          isToday && styles.dayLabelToday,
          isFuture && !isToday && styles.dayLabelFuture,
        ]}>
          {label}
        </Text>
      </View>
      {isToday && <View style={styles.todayDot} />}
    </View>
  )
}

export default function HomeScreen() {
  const glowAnim = useRef(new Animated.Value(0)).current
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const user = useAuthStore((state) => state.user)
  const { data: weeklyChains, refetch: refetchWeekly } = useWeeklyFlows()

  useFocusEffect(
    useCallback(() => {
      refetchWeekly()
    }, [refetchWeekly])
  )

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  const getFirstName = () => {
    if (!user) return ''
    const name =
      user.user_metadata?.given_name ||
      user.user_metadata?.full_name?.split(' ')[0] ||
      user.email?.split('@')[0] ||
      ''
    return name.charAt(0).toUpperCase() + name.slice(1)
  }

  const getTimeOfDay = () => {
    const hour = new Date().getHours()
    if (hour >= 5 && hour < 12) return 'this morning'
    if (hour >= 12 && hour < 17) return 'this afternoon'
    if (hour >= 17 && hour < 21) return 'this evening'
    return 'tonight'
  }

  const getWeekData = () => {
    const today = new Date()
    const dayOfWeek = today.getDay()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - dayOfWeek)
    startOfWeek.setHours(0, 0, 0, 0)

    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)

      const dayChains = (weeklyChains || []).filter((chain) => {
        const chainDate = new Date(chain.created_at)
        return chainDate.toDateString() === date.toDateString()
      })

      const totalSeconds = dayChains.reduce((sum, chain) => {
        return sum + (chain.somi_chain_entries || []).reduce((s, entry) => s + (entry.seconds_elapsed || 0), 0)
      }, 0)

      return {
        isToday: i === dayOfWeek,
        isFuture: i > dayOfWeek,
        percentage: Math.min(100, (totalSeconds / FLOW_TARGET_SECONDS) * 100),
      }
    })
  }

  const weekData = getWeekData()
  const firstName = getFirstName()
  const timeOfDay = getTimeOfDay()

  const handleStartFlow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/DailyFlowSetup')
  }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowSettingsModal(true)
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] })
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] })

  return (
    <View style={styles.container}>
      {/* Water background */}
      <Image
        source={{ uri: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/home%20screen%20backgrounds/water_1.jpg' }}
        style={StyleSheet.absoluteFillObject}
        resizeMode="cover"
      />

      {/* Gradient overlay — darker at bottom for button contrast */}
      <LinearGradient
        colors={['rgba(0,0,0,0.08)', 'rgba(0,0,0,0.18)', 'rgba(0,0,0,0.72)']}
        locations={[0, 0.45, 1]}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIconBtn}>
          <Ionicons name="musical-notes-outline" size={16} color="rgba(255,255,255,0.7)" />
        </View>
        <Text style={styles.logoText}>SoMi</Text>
        <TouchableOpacity style={styles.headerIconBtn} onPress={handleOpenSettings} activeOpacity={0.7}>
          <Ionicons name="person-circle-outline" size={18} color="rgba(255,255,255,0.7)" />
        </TouchableOpacity>
      </View>

      {/* Week streak strip */}
      <View style={styles.weekStripContainer}>
        <BlurView intensity={18} tint="dark" style={styles.weekStrip}>
          {weekData.map((day, i) => (
            <WeekDay
              key={i}
              label={DAY_LABELS[i]}
              percentage={day.percentage}
              isToday={day.isToday}
              isFuture={day.isFuture}
            />
          ))}
        </BlurView>
      </View>

      {/* Greeting — centered in remaining space */}
      <View style={styles.greetingContainer}>
        <Text style={styles.greetingText}>
          Hi {firstName},{'\n'}it's time to flow{'\n'}{timeOfDay}.
        </Text>
      </View>

      {/* Action row — Flow button + flanking side buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)}
          activeOpacity={0.75}
        >
          <Ionicons name="musical-notes" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>

        {/* Glowing Flow button */}
        <View style={styles.flowBtnWrapper}>
          <Animated.View
            style={[styles.flowBtnGlow, { opacity: glowOpacity, transform: [{ scale: glowScale }] }]}
          />
          <TouchableOpacity style={styles.flowBtn} onPress={handleStartFlow} activeOpacity={0.88}>
            <Text style={styles.flowBtnText}>Flow</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.sideBtn} onPress={handleOpenSettings} activeOpacity={0.75}>
          <Ionicons name="options-outline" size={20} color="rgba(255,255,255,0.75)" />
        </TouchableOpacity>
      </View>

      <CustomizationModal visible={showSettingsModal} onClose={() => setShowSettingsModal(false)} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },

  // ── Header ──────────────────────────────────────────────
  header: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    zIndex: 10,
  },
  headerIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.28)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    fontSize: 21,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 1.8,
  },

  // ── Week streak strip ────────────────────────────────────
  weekStripContainer: {
    position: 'absolute',
    top: 104,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  weekStrip: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  dayItem: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    height: 48,
  },
  dayLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  dayLabelFuture: {
    color: 'rgba(255,255,255,0.22)',
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.accent.primary,
  },

  // ── Greeting text ────────────────────────────────────────
  greetingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
    paddingTop: 185,
    paddingBottom: 190,
  },
  greetingText: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 46,
    letterSpacing: -0.3,
  },

  // ── Action row ───────────────────────────────────────────
  actionRow: {
    position: 'absolute',
    bottom: 116,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 26,
  },
  sideBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowBtnWrapper: {
    width: 118,
    height: 118,
    alignItems: 'center',
    justifyContent: 'center',
  },
  flowBtnGlow: {
    position: 'absolute',
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: 'rgba(255,255,255,0.3)',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 40,
  },
  flowBtn: {
    width: 118,
    height: 118,
    borderRadius: 59,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FFFFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
  },
  flowBtnText: {
    color: '#000000',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
