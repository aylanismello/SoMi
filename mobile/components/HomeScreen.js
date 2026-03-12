import { useState, useCallback, useRef, useEffect } from 'react'
import { StyleSheet, View, Text, Image, TouchableOpacity, Animated } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from '../services/api'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Svg, { Circle } from 'react-native-svg'
import { useFocusEffect } from '@react-navigation/native'
import { router } from 'expo-router'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import CustomizationModal from './CustomizationModal'
import MusicPickerModal from './MusicPickerModal'
import { useAuthStore } from '../stores/authStore'
import { useStreaks } from '../hooks/useSupabaseQueries'
import { Ionicons } from '@expo/vector-icons'
import SoMiHeader from './SoMiHeader'
import { WATER_BG_URI } from '../constants/media'

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function WeekDay({ label, percentage, isToday, isFuture }) {
  const SIZE = 40
  const FILL_R = 13   // inner white disk (today only)
  const RING_R = 17   // ring track + progress arc radius
  const SW = 2.5      // stroke width for ring and arc
  const CIRCUMFERENCE = 2 * Math.PI * RING_R
  const progressLength = (percentage / 100) * CIRCUMFERENCE

  return (
    <View style={styles.dayItem}>
      <View style={{ width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' }}>
        <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFillObject}>
          {/* 1. White fill disk — today's persistent circle */}
          {isToday && (
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={FILL_R}
              fill="rgba(255,255,255,0.92)" stroke="none"
            />
          )}
          {/* 2. Ring track — white for today, dim for others */}
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RING_R}
            fill="none"
            stroke={isToday ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.12)'}
            strokeWidth={SW}
          />
          {/* 3. Green progress arc — grows clockwise from top, replacing white ring */}
          {percentage > 0 && (
            <Circle
              cx={SIZE / 2} cy={SIZE / 2} r={RING_R}
              fill="none"
              stroke={colors.accent.primary}
              strokeWidth={SW}
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
    </View>
  )
}

export default function HomeScreen() {
  const glowAnim = useRef(new Animated.Value(0)).current
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showMusicModal, setShowMusicModal] = useState(false)
  const [groundingQuote, setGroundingQuote] = useState(null)
  const [quoteLoading, setQuoteLoading] = useState(true)
  const [cachedWeekData, setCachedWeekData] = useState(null)
  const user = useAuthStore((state) => state.user)
  const { data: streakData, refetch: refetchStreaks } = useStreaks()

  // Load cached streak data immediately so circles never flash empty
  useEffect(() => {
    AsyncStorage.getItem('lastStreakWeek')
      .then((cached) => {
        if (cached) {
          try { setCachedWeekData(JSON.parse(cached)) } catch {}
        }
      })
      .catch(() => {})
  }, [])

  // When fresh data arrives, update state and persist to cache
  useEffect(() => {
    if (streakData?.week?.length) {
      setCachedWeekData(streakData.week)
      AsyncStorage.setItem('lastStreakWeek', JSON.stringify(streakData.week)).catch(() => {})
    }
  }, [streakData])

  useFocusEffect(
    useCallback(() => {
      refetchStreaks()
    }, [refetchStreaks])
  )

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2200, useNativeDriver: true }),
      ])
    ).start()
  }, [])

  useEffect(() => {
    // Load cached quote first so we never flash the filler text
    AsyncStorage.getItem('lastGroundingQuote')
      .then((cached) => {
        if (cached) {
          try { setGroundingQuote(JSON.parse(cached)) } catch {}
        }
      })
      .finally(() => {
        // Then fetch a fresh quote from the API
        api.getRandomGroundingQuote()
          .then(({ quote }) => {
            if (quote) {
              setGroundingQuote(quote)
              AsyncStorage.setItem('lastGroundingQuote', JSON.stringify(quote)).catch(() => {})
            }
          })
          .catch(() => {})
          .finally(() => setQuoteLoading(false))
      })
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

  const weekData = streakData?.week ?? cachedWeekData ?? []
  const firstName = getFirstName()
  const timeOfDay = getTimeOfDay()

  const handleStartFlow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    router.push('/FlowInit')
  }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowSettingsModal(true)
  }

  const glowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.2, 0.6] })
  const glowScale = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.18] })

  return (
    <View style={styles.container}>
      <Image source={{ uri: WATER_BG_URI }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />

      {/* Gradient overlay — deep ocean-blue tint matching Profile screen */}
      <LinearGradient
        colors={[colors.background.primary + 'BF', colors.background.secondary + 'CC', colors.background.primary + 'BF']}
        style={StyleSheet.absoluteFillObject}
      />

      {/* Header */}
      <SoMiHeader
        style={styles.header}
        onRightPress={() => {}}
      />

      {/* Week streak strip */}
      <View style={styles.weekStripContainer}>
        <BlurView intensity={18} tint="dark" style={styles.weekStrip}>
          {weekData.map((day, i) => (
            <WeekDay
              key={i}
              label={day.day ?? DAY_LABELS[i]}
              percentage={day.percentage}
              isToday={day.is_today}
              isFuture={day.is_future}
            />
          ))}
        </BlurView>
      </View>

      {/* Quote or greeting — centered in remaining space */}
      <View style={styles.greetingContainer}>
        {groundingQuote ? (
          <>
            <Text style={styles.quoteText}>"{groundingQuote.quote}"</Text>
            <Text style={styles.quoteAuthor}>— {groundingQuote.author}</Text>
          </>
        ) : !quoteLoading ? (
          <Text style={styles.greetingText}>
            Hi {firstName},{'\n'}it's time to flow{'\n'}{timeOfDay}.
          </Text>
        ) : null}
      </View>

      {/* Action row — Flow button + flanking side buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={styles.sideBtn}
          onPress={() => setShowMusicModal(true)}
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
      <MusicPickerModal visible={showMusicModal} onClose={() => setShowMusicModal(false)} />
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
    zIndex: 10,
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
  },
  dayLabel: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 12,
    fontWeight: '600',
  },
  dayLabelToday: {
    color: '#111111',
    fontWeight: '700',
  },
  dayLabelFuture: {
    color: 'rgba(255,255,255,0.22)',
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
  quoteText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: -0.2,
    marginBottom: 16,
  },
  quoteAuthor: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.2,
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
