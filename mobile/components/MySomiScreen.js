import React, { useState, useCallback, useRef, useMemo } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Animated, Modal } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Svg, { Circle, Line } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { chainService } from '../services/chainService'
import { POLYVAGAL_STATE_MAP, STATE_DESCRIPTIONS } from './EmbodimentSlider'
import { colors } from '../constants/theme'
import { useChains, useDeleteChain } from '../hooks/useSupabaseQueries'
import { useAuthStore } from '../stores/authStore'

// Match polyvagal states from SoMeCheckIn (new code-based system)
const POLYVAGAL_STATES = [
  { id: 0, label: 'SOS', color: '#ff6b9d' },
  { id: 1, label: 'Drained', color: '#4A5F8C' },
  { id: 2, label: 'Foggy', color: '#5B7BB4' },
  { id: 3, label: 'Wired', color: '#6B9BD1' },
  { id: 4, label: 'Steady', color: '#7DBCE7' },
  { id: 5, label: 'Glowing', color: '#90DDF0' },
]

const STATE_EMOJIS = {
  0: '🆘',
  1: '🌧',
  2: '🌫',
  3: '🌪',
  4: '🌤',
  5: '☀️',
}

// Calendar/Streak View Component
function CalendarStreakView({ chains }) {
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()

  // Get first day of month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1)
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0)
  const daysInMonth = lastDayOfMonth.getDate()
  const startingDayOfWeek = firstDayOfMonth.getDay() // 0 = Sunday

  // Create map of days with sessions (only daily flows)
  const daysWithSessions = new Set()
  const sessionsByDay = {}

  // MVP: Only count daily flows
  const dailyFlowChains = chains.filter(chain => chain.flow_type === 'daily_flow')

  dailyFlowChains.forEach(chain => {
    const date = new Date(chain.created_at)
    if (date.getMonth() === currentMonth && date.getFullYear() === currentYear) {
      const day = date.getDate()
      daysWithSessions.add(day)
      sessionsByDay[day] = (sessionsByDay[day] || 0) + 1
    }
  })

  // Calculate streak days (only from daily flows)
  const streakDays = new Set()
  const sortedChains = [...dailyFlowChains].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  let lastDate = null

  for (const chain of sortedChains) {
    const chainDate = new Date(chain.created_at)
    chainDate.setHours(0, 0, 0, 0)

    if (!lastDate) {
      const todayDate = new Date()
      todayDate.setHours(0, 0, 0, 0)
      const yesterday = new Date(todayDate)
      yesterday.setDate(yesterday.getDate() - 1)

      if (chainDate.getTime() === todayDate.getTime() || chainDate.getTime() === yesterday.getTime()) {
        lastDate = chainDate
        if (chainDate.getMonth() === currentMonth && chainDate.getFullYear() === currentYear) {
          streakDays.add(chainDate.getDate())
        }
      } else {
        break
      }
    } else {
      const expectedDate = new Date(lastDate)
      expectedDate.setDate(expectedDate.getDate() - 1)

      if (chainDate.getTime() === expectedDate.getTime()) {
        lastDate = chainDate
        if (chainDate.getMonth() === currentMonth && chainDate.getFullYear() === currentYear) {
          streakDays.add(chainDate.getDate())
        }
      } else if (chainDate.getTime() === lastDate.getTime()) {
        continue
      } else {
        break
      }
    }
  }

  // Generate calendar grid
  const weeks = []
  let currentWeek = []

  // Add empty cells for days before month starts
  for (let i = 0; i < startingDayOfWeek; i++) {
    currentWeek.push(null)
  }

  // Add days of month
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day)

    if (currentWeek.length === 7) {
      weeks.push(currentWeek)
      currentWeek = []
    }
  }

  // Add remaining empty cells
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null)
    }
    weeks.push(currentWeek)
  }

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                      'July', 'August', 'September', 'October', 'November', 'December']
  const dayNames = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

  return (
    <View style={styles.calendarContainer}>
      <Text style={styles.calendarMonthTitle}>{monthNames[currentMonth]}</Text>

      {/* Day names header */}
      <View style={styles.calendarHeader}>
        {dayNames.map((dayName, index) => (
          <Text key={index} style={styles.calendarDayName}>{dayName}</Text>
        ))}
      </View>

      {/* Calendar grid */}
      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} style={styles.calendarWeek}>
          {week.map((day, dayIndex) => {
            const isToday = day === today.getDate()
            const hasSession = day && daysWithSessions.has(day)
            const isStreakDay = day && streakDays.has(day)
            const sessionCount = day ? sessionsByDay[day] || 0 : 0

            return (
              <View key={dayIndex} style={styles.calendarDayCell}>
                {day && (
                  <View style={[
                    styles.calendarDay,
                    hasSession && styles.calendarDayWithSession,
                    isStreakDay && styles.calendarDayStreak,
                    isToday && styles.calendarDayToday,
                  ]}>
                    <Text style={[
                      styles.calendarDayText,
                      hasSession && styles.calendarDayTextActive,
                      isToday && styles.calendarDayTextToday,
                    ]}>
                      {day}
                    </Text>
                    {sessionCount > 1 && (
                      <View style={styles.sessionCountDot}>
                        <Text style={styles.sessionCountText}>{sessionCount}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )
          })}
        </View>
      ))}
    </View>
  )
}

// Floating Orb Component with physics
function FloatingOrb({ check, index, onPress, isSelected, formatDate }) {
  const stateInfo = POLYVAGAL_STATES.find(s => s.id === check.polyvagal_state_code)
  const fillLevel = check.embodiment_level / 100

  // Circle measurements for progress ring
  const circleSize = 52
  const strokeWidth = 4 // Thicker stroke for better visibility
  const radius = (circleSize - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference * (1 - fillLevel)

  // Position: newest at top, oldest at bottom
  const row = Math.floor(index / 3)
  const col = index % 3
  const leftOffset = col === 0 ? 5 : col === 1 ? 40 : 75
  const topOffset = row * 22 + 5

  // Smart tooltip positioning to avoid edges
  const showTooltipBelow = row < 2 // Show below for top rows
  const tooltipAlignment = col === 0 ? 'left' : col === 2 ? 'right' : 'center'

  // Create floating animation for this orb
  const floatY = React.useRef(new Animated.Value(0)).current
  const floatX = React.useRef(new Animated.Value(0)).current

  // Start animation on mount with unique timing per orb
  React.useEffect(() => {
    const duration = 2000 + (index * 200) // Vary duration per orb
    const delay = index * 300 // Stagger start times

    // Vertical floating (bobbing up and down)
    const floatYAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatY, {
          toValue: -8,
          duration: duration,
          delay: delay,
          useNativeDriver: true,
        }),
        Animated.timing(floatY, {
          toValue: 0,
          duration: duration,
          useNativeDriver: true,
        }),
      ])
    )

    // Horizontal drifting (gentle side-to-side)
    const floatXAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(floatX, {
          toValue: 5,
          duration: duration * 1.5,
          delay: delay + 500,
          useNativeDriver: true,
        }),
        Animated.timing(floatX, {
          toValue: -5,
          duration: duration * 1.5,
          useNativeDriver: true,
        }),
        Animated.timing(floatX, {
          toValue: 0,
          duration: duration * 1.5,
          useNativeDriver: true,
        }),
      ])
    )

    floatYAnimation.start()
    floatXAnimation.start()

    return () => {
      floatYAnimation.stop()
      floatXAnimation.stop()
    }
  }, [index, floatY, floatX])

  return (
    <Animated.View
      style={[
        styles.gardenOrb,
        {
          left: `${leftOffset}%`,
          top: `${topOffset}%`,
          transform: [
            { translateY: floatY },
            { translateX: floatX },
          ],
        }
      ]}
    >
      <TouchableOpacity
        onPress={() => onPress(check)}
        activeOpacity={0.8}
        style={styles.orbTouchable}
      >
        {/* SVG Progress Ring */}
        <Svg width={circleSize} height={circleSize} style={styles.gardenOrbSvg}>
          {/* Background ring */}
          <Circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke={stateInfo?.color + '30'}
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress ring */}
          <Circle
            cx={circleSize / 2}
            cy={circleSize / 2}
            r={radius}
            stroke={stateInfo?.color}
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
          />
        </Svg>

        {/* Center content */}
        <View
          style={[
            styles.gardenOrbCenter,
            {
              backgroundColor: stateInfo?.color,
              opacity: 0.4 + (fillLevel * 0.6), // Vary opacity based on fill level
            }
          ]}
        >
          <Text style={[styles.gardenOrbEmoji, { opacity: 1 }]}>
            {STATE_EMOJIS[check.polyvagal_state_code]}
          </Text>
        </View>

        {/* Popup tooltip on selection */}
        {isSelected && (
          <View style={[
            styles.orbTooltip,
            showTooltipBelow ? styles.orbTooltipBelow : styles.orbTooltipAbove,
            tooltipAlignment === 'left' && styles.orbTooltipLeft,
            tooltipAlignment === 'right' && styles.orbTooltipRight,
            tooltipAlignment === 'center' && styles.orbTooltipCenter,
          ]}>
            <Text style={styles.orbTooltipText}>{Math.round(check.embodiment_level)}%</Text>
            <Text style={styles.orbTooltipState}>{stateInfo?.label}</Text>
            <Text style={styles.orbTooltipDate}>{formatDate(check.created_at)}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function MySomiScreen({ navigation }) {
  const scrollViewRef = useRef(null)

  // Use React Query for chains data
  const { data: allChains = [], isLoading: loading, refetch } = useChains(30)
  const deleteChainMutation = useDeleteChain()

  // MVP: Filter to only show daily flows (memoized to prevent infinite loops)
  const somiChains = useMemo(() =>
    allChains.filter(chain => chain.flow_type === 'daily_flow'),
    [allChains]
  )

  // Get user for personalization
  const user = useAuthStore((state) => state.user)

  const [selectedOrb, setSelectedOrb] = useState(null)
  const [expandedChains, setExpandedChains] = useState({}) // Track which chains are expanded
  const [deleteModalVisible, setDeleteModalVisible] = useState(false)
  const [chainToDelete, setChainToDelete] = useState(null)
  const [journalModalVisible, setJournalModalVisible] = useState(false)
  const [selectedJournalEntry, setSelectedJournalEntry] = useState(null)
  const [stats, setStats] = useState({
    averageScore: 0,
    totalCheckIns: 0,
    mostCommonState: null,
    recentTrend: null,
    totalSessions: 0,
    totalMinutes: 0,
    daysActive: 0,
    currentStreak: 0,
  })

  // Fetch fresh data and scroll to top whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch()
      scrollViewRef.current?.scrollTo({ y: 0, animated: false })
    }, [refetch])
  )

  // Calculate stats whenever chains data changes
  React.useEffect(() => {
    if (somiChains.length > 0) {
      const allChecks = somiChains.flatMap(chain => chain.embodiment_checks)
      calculateStats(allChecks, somiChains)
    }
  }, [somiChains])

  const calculateStats = (data, chains) => {
    if (data.length === 0) {
      setStats({
        averageScore: 0,
        totalCheckIns: 0,
        mostCommonState: null,
        recentTrend: null,
        totalSessions: 0,
        totalMinutes: 0,
        daysActive: 0,
        currentStreak: 0,
      })
      return
    }

    // Calculate average score
    const avgScore = data.reduce((sum, check) => sum + check.embodiment_level, 0) / data.length

    // Find most common state
    const stateCounts = {}
    data.forEach(check => {
      stateCounts[check.polyvagal_state_code] = (stateCounts[check.polyvagal_state_code] || 0) + 1
    })
    const mostCommonState = Object.keys(stateCounts).reduce((a, b) =>
      stateCounts[a] > stateCounts[b] ? a : b
    )

    // Calculate recent trend (last 5 vs previous 5)
    let recentTrend = null
    if (data.length >= 10) {
      const recentAvg = data.slice(0, 5).reduce((sum, c) => sum + c.embodiment_level, 0) / 5
      const previousAvg = data.slice(5, 10).reduce((sum, c) => sum + c.embodiment_level, 0) / 5
      const diff = recentAvg - previousAvg

      if (Math.abs(diff) < 5) {
        recentTrend = 'stable'
      } else if (diff > 0) {
        recentTrend = 'improving'
      } else {
        recentTrend = 'fluctuating'
      }
    }

    // Calculate total sessions
    const totalSessions = chains.length

    // Calculate total minutes
    const totalSeconds = chains.reduce((sum, chain) => {
      return sum + chain.somi_chain_entries.reduce((chainSum, entry) => {
        return chainSum + (entry.seconds_elapsed || 0)
      }, 0)
    }, 0)
    const totalMinutes = Math.round(totalSeconds / 60)

    // Calculate days active (unique days with sessions)
    const uniqueDays = new Set()
    chains.forEach(chain => {
      const date = new Date(chain.created_at)
      const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
      uniqueDays.add(dateKey)
    })
    const daysActive = uniqueDays.size

    // Calculate current streak (consecutive days with sessions)
    const sortedChains = [...chains].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    let currentStreak = 0
    let lastDate = null

    for (const chain of sortedChains) {
      const chainDate = new Date(chain.created_at)
      chainDate.setHours(0, 0, 0, 0)

      if (!lastDate) {
        // First chain - check if it's today or yesterday
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const yesterday = new Date(today)
        yesterday.setDate(yesterday.getDate() - 1)

        if (chainDate.getTime() === today.getTime() || chainDate.getTime() === yesterday.getTime()) {
          currentStreak = 1
          lastDate = chainDate
        } else {
          break // Streak is broken
        }
      } else {
        // Check if this chain is from the day before lastDate
        const expectedDate = new Date(lastDate)
        expectedDate.setDate(expectedDate.getDate() - 1)

        if (chainDate.getTime() === expectedDate.getTime()) {
          currentStreak++
          lastDate = chainDate
        } else if (chainDate.getTime() === lastDate.getTime()) {
          // Same day, don't increment streak but continue
          continue
        } else {
          break // Streak is broken
        }
      }
    }

    setStats({
      averageScore: Math.round(avgScore),
      totalCheckIns: data.length,
      mostCommonState,
      recentTrend,
      totalSessions,
      totalMinutes,
      daysActive,
      currentStreak,
    })
  }

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const getChainLabel = (dateString) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now - date
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    // Get time of day (morning, afternoon, evening, night)
    const hours = date.getHours()
    let timeOfDay
    if (hours >= 5 && hours < 12) {
      timeOfDay = 'Morning'
    } else if (hours >= 12 && hours < 17) {
      timeOfDay = 'Afternoon'
    } else if (hours >= 17 && hours < 21) {
      timeOfDay = 'Evening'
    } else {
      timeOfDay = 'Night'
    }

    // Today
    if (diffHours < 24 && date.getDate() === now.getDate()) {
      return `${timeOfDay} Session`
    }

    // Yesterday
    const yesterday = new Date(now)
    yesterday.setDate(yesterday.getDate() - 1)
    if (date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth()) {
      return `Yesterday ${timeOfDay}`
    }

    // This week (show day name)
    if (diffDays < 7) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
      return `${dayName} ${timeOfDay}`
    }

    // Last week
    if (diffDays < 14) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' })
      return `Last ${dayName}`
    }

    // This month (show date)
    if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
      const dayName = date.toLocaleDateString('en-US', { weekday: 'short' })
      const day = date.getDate()
      return `${dayName} ${day}`
    }

    // Older (show month + day)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const getStateInfo = (stateId) => {
    return POLYVAGAL_STATES.find(s => s.id === stateId)
  }

  const handleOrbPress = (check) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedOrb(selectedOrb?.id === check.id ? null : check)
  }

  const toggleChainExpanded = (chainId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setExpandedChains(prev => ({
      ...prev,
      [chainId]: !prev[chainId]
    }))
  }

  const handleDeleteChainPress = (chainId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setChainToDelete(chainId)
    setDeleteModalVisible(true)
  }

  const confirmDeleteChain = async () => {
    if (!chainToDelete) return

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    setDeleteModalVisible(false)

    // Delete using React Query mutation (handles optimistic updates and refetching)
    deleteChainMutation.mutate(chainToDelete, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
      },
      onError: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      },
    })

    setChainToDelete(null)
  }

  const cancelDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setDeleteModalVisible(false)
    setChainToDelete(null)
  }

  const handleViewJournal = (journalEntry) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedJournalEntry(journalEntry)
    setJournalModalVisible(true)
  }

  const closeJournalModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setJournalModalVisible(false)
    setSelectedJournalEntry(null)
  }

  const handlePlayBlock = (block) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (!block.somi_blocks || !block.somi_blocks.media_url) {
      console.error('Block missing media data', block)
      return
    }

    navigation.navigate('Player', {
      media: {
        somi_block_id: block.somi_blocks.id,
        name: block.somi_blocks.name,
        type: block.somi_blocks.media_type || 'video',
        url: block.somi_blocks.media_url,
      },
      fromExplore: true // Mark as à la carte viewing
    })
  }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate('AccountSettings')
  }

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyTitle}>your journey starts here</Text>
      <Text style={styles.emptyText}>
        complete a check-in to start tracking your embodiment over time
      </Text>
    </View>
  )

  if (loading) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent.primary} />
        </View>
      </LinearGradient>
    )
  }

  if (somiChains.length === 0) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
        style={styles.container}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleOpenSettings}
            style={styles.settingsButton}
            activeOpacity={0.7}
          >
            <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>my somi</Text>
          <View style={styles.headerSpacer} />
        </View>
        {renderEmptyState()}
      </LinearGradient>
    )
  }

  // Get all embodiment checks from all chains for the river visualization
  const allChecksForRiver = somiChains.flatMap(chain => chain.embodiment_checks)

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleOpenSettings}
          style={styles.settingsButton}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>my somi</Text>
          <Text style={styles.headerSubtitle}>{stats.totalCheckIns} check-ins</Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Garden Visualization */}
        {/* Temporarily commented out - might bring back later
        <BlurView intensity={20} tint="dark" style={styles.gardenCard}>
          <Text style={styles.gardenTitle}>your embodiment river</Text>
          <View style={styles.gardenContainer}>
            <LinearGradient
              colors={[
                'rgba(42, 74, 111, 0.3)',
                'rgba(74, 95, 140, 0.4)',
                'rgba(0, 217, 163, 0.25)',
                'rgba(74, 95, 140, 0.4)',
                'rgba(42, 74, 111, 0.3)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.riverGradient}
            />

            <Svg style={styles.tetherSvg}>
              {somiChains.slice(0, 10).map((chain, chainIndex) => {
                const checks = chain.embodiment_checks.slice(0, 3)
                if (checks.length < 2) return null

                return checks.slice(0, -1).map((check, checkIndex) => {
                  const currentIndex = chainIndex * 3 + checkIndex
                  const nextIndex = currentIndex + 1

                  const currentRow = Math.floor(currentIndex / 3)
                  const currentCol = currentIndex % 3
                  const nextRow = Math.floor(nextIndex / 3)
                  const nextCol = nextIndex % 3

                  const currentX = (currentCol === 0 ? 5 : currentCol === 1 ? 40 : 75) + 3
                  const currentY = (currentRow * 22 + 5) + 3
                  const nextX = (nextCol === 0 ? 5 : nextCol === 1 ? 40 : 75) + 3
                  const nextY = (nextRow * 22 + 5) + 3

                  return (
                    <Line
                      key={`tether-${chain.id}-${checkIndex}`}
                      x1={`${currentX}%`}
                      y1={`${currentY}%`}
                      x2={`${nextX}%`}
                      y2={`${nextY}%`}
                      stroke="rgba(0, 217, 163, 0.3)"
                      strokeWidth="1"
                      strokeDasharray="3,3"
                    />
                  )
                })
              })}
            </Svg>

            {allChecksForRiver.slice(0, 20).map((check, index) => (
              <FloatingOrb
                key={check.id}
                check={check}
                index={index}
                onPress={handleOrbPress}
                isSelected={selectedOrb?.id === check.id}
                formatDate={formatDate}
              />
            ))}
          </View>
        </BlurView>
        */}

        {/* My Stats - Featured Dashboard */}
        <Text style={styles.myStatsTitle}>my stats</Text>
        <BlurView intensity={20} tint="dark" style={styles.myStatsCard}>
          {/* Featured Stat - Days Active */}
          <View style={styles.featuredStat}>
            <View style={styles.featuredStatBadge}>
              <Text style={styles.featuredStatNumber}>{stats.daysActive}</Text>
            </View>
            <Text style={styles.featuredStatLabel}>days present</Text>
          </View>

          {/* Bottom Stats Grid */}
          <View style={styles.bottomStatsGrid}>
            <View style={styles.bottomStatItem}>
              <Text style={styles.bottomStatIcon}>🔗</Text>
              <Text style={styles.bottomStatValue}>{stats.totalSessions}</Text>
              <Text style={styles.bottomStatLabel}>sessions</Text>
            </View>

            <View style={styles.bottomStatDivider} />

            <View style={styles.bottomStatItem}>
              <Text style={styles.bottomStatIcon}>⏱</Text>
              <Text style={styles.bottomStatValue}>
                {Math.floor(stats.totalMinutes / 60) > 0
                  ? `${Math.floor(stats.totalMinutes / 60)}h ${stats.totalMinutes % 60}m`
                  : `${stats.totalMinutes}m`}
              </Text>
              <Text style={styles.bottomStatLabel}>total time</Text>
            </View>

            <View style={styles.bottomStatDivider} />

            <View style={styles.bottomStatItem}>
              <Text style={styles.bottomStatIcon}>🔥</Text>
              <Text style={styles.bottomStatValue}>
                {stats.currentStreak} {stats.currentStreak === 1 ? 'day' : 'days'}
              </Text>
              <Text style={styles.bottomStatLabel}>streak</Text>
            </View>
          </View>
        </BlurView>

        {/* Calendar/Streak View */}
        <Text style={styles.sectionTitle}>activity calendar</Text>
        <BlurView intensity={20} tint="dark" style={styles.calendarCard}>
          <CalendarStreakView chains={somiChains} />
          <View style={styles.calendarLegend}>
            <View style={styles.calendarLegendItem}>
              <View style={[styles.calendarLegendDot, styles.calendarLegendDotSession]} />
              <Text style={styles.calendarLegendText}>Session</Text>
            </View>
            <View style={styles.calendarLegendItem}>
              <View style={[styles.calendarLegendDot, styles.calendarLegendDotStreak]} />
              <Text style={styles.calendarLegendText}>Streak</Text>
            </View>
            <View style={styles.calendarLegendItem}>
              <View style={[styles.calendarLegendDot, styles.calendarLegendDotToday]} />
              <Text style={styles.calendarLegendText}>Today</Text>
            </View>
          </View>
        </BlurView>

        {/* MVP: Recent Check-Ins hidden for now
        <Text style={styles.sectionTitle}>recent check-ins</Text>
        <BlurView intensity={20} tint="dark" style={styles.checkInsListCard}>
          {allChecksForRiver
            .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
            .slice(0, 8)
            .map((check, index) => {
              const stateInfo = POLYVAGAL_STATES.find(s => s.id === check.polyvagal_state_code)
              const emoji = STATE_EMOJIS[check.polyvagal_state_code] || '❓'
              const fillLevel = check.embodiment_level / 100

              const circleSize = 48
              const strokeWidth = 3
              const radius = (circleSize - strokeWidth) / 2
              const circumference = 2 * Math.PI * radius
              const strokeDashoffset = circumference * (1 - fillLevel)

              return (
                <View key={check.id} style={[
                  styles.checkInListItem,
                  index < 7 && styles.checkInListItemBorder
                ]}>
                  <View style={styles.checkInListLeft}>
                    <View style={styles.checkInStateCircle}>
                      <Svg width={circleSize} height={circleSize}>
                        <Circle
                          cx={circleSize / 2}
                          cy={circleSize / 2}
                          r={radius}
                          stroke={stateInfo?.color + '30'}
                          strokeWidth={strokeWidth}
                          fill="none"
                        />
                        <Circle
                          cx={circleSize / 2}
                          cy={circleSize / 2}
                          r={radius}
                          stroke={stateInfo?.color}
                          strokeWidth={strokeWidth}
                          fill="none"
                          strokeDasharray={circumference}
                          strokeDashoffset={strokeDashoffset}
                          strokeLinecap="round"
                          transform={`rotate(-90 ${circleSize / 2} ${circleSize / 2})`}
                        />
                      </Svg>
                      <Text style={styles.checkInStateEmojiAbsolute}>{emoji}</Text>
                    </View>
                    <View style={styles.checkInListInfo}>
                      <Text style={styles.checkInStateLabel}>{stateInfo?.label || 'Unknown'}</Text>
                      <Text style={styles.checkInListTime}>{formatDate(check.created_at)}</Text>
                    </View>
                  </View>
                </View>
              )
            })}
        </BlurView>
        */}

        {/* My Daily Flows Timeline */}
        <Text style={styles.sectionTitle}>my daily flows</Text>

        {somiChains.map((chain, chainIndex) => {
          const isExpanded = expandedChains[chain.id]
          const checksCount = chain.embodiment_checks.length
          const blocksCount = chain.somi_chain_entries.length

          // Calculate total minutes from seconds_elapsed
          const totalSeconds = chain.somi_chain_entries.reduce((sum, entry) => sum + (entry.seconds_elapsed || 0), 0)
          const totalMinutes = Math.round(totalSeconds / 60)

          return (
            <View key={chain.id} style={styles.checkInItem}>
              {/* Timeline dot and line */}
              <View style={styles.timelineContainer}>
                <View style={[styles.timelineDot, { backgroundColor: colors.accent.primary }]} />
                {chainIndex < somiChains.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>

              {/* Chain card */}
              <BlurView intensity={15} tint="dark" style={styles.checkInCard}>
                <View style={styles.chainHeader}>
                  <TouchableOpacity
                    onPress={() => toggleChainExpanded(chain.id)}
                    activeOpacity={0.7}
                    style={styles.chainHeaderTouchable}
                  >
                    <View style={styles.checkInHeader}>
                      <View style={styles.chainHeaderLeft}>
                        <Text style={styles.chainTitle}>{getChainLabel(chain.created_at)}</Text>
                        <Text style={styles.chainSubtitle}>
                          {checksCount} check-in{checksCount !== 1 ? 's' : ''} • {blocksCount} block{blocksCount !== 1 ? 's' : ''} • {totalMinutes} min
                        </Text>
                      </View>

                      <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    </View>

                    <Text style={styles.checkInTime}>{formatDate(chain.created_at)}</Text>
                  </TouchableOpacity>

                  {/* Delete button (MVP debugging) */}
                  <TouchableOpacity
                    onPress={() => handleDeleteChainPress(chain.id)}
                    activeOpacity={0.7}
                    style={styles.deleteButton}
                  >
                    <Text style={styles.deleteButtonText}>✕</Text>
                  </TouchableOpacity>
                </View>

                {/* Expanded content */}
                {isExpanded && (
                  <View style={styles.chainExpandedContent}>
                    {/* Merged Timeline: Interleave checks and blocks chronologically */}
                    {(() => {
                      // Combine checks and blocks with their timestamps
                      const checks = chain.embodiment_checks.map(c => ({
                        type: 'check',
                        timestamp: new Date(c.created_at),
                        data: c
                      }))
                      const blocks = chain.somi_chain_entries.map(b => ({
                        type: 'block',
                        timestamp: new Date(b.created_at),
                        data: b
                      }))

                      // Merge and sort by timestamp
                      const timeline = [...checks, ...blocks].sort((a, b) => a.timestamp - b.timestamp)

                      return timeline.map((item, index) => {
                        if (item.type === 'check') {
                          const check = item.data
                          const stateInfo = getStateInfo(check.polyvagal_state_code)
                          const fillLevel = check.embodiment_level / 100

                          return (
                            <View key={`check-${check.id}`} style={styles.timelineItem}>
                              <Text style={styles.timelineItemLabel}>Check-in</Text>
                              <View style={styles.chainCheckItem}>
                                <View style={[styles.stateChip, {
                                  backgroundColor: stateInfo?.color + '33',
                                  borderColor: stateInfo?.color,
                                }]}>
                                  <Text style={styles.stateEmojiSmall}>
                                    {STATE_EMOJIS[check.polyvagal_state_code]}
                                  </Text>
                                  <Text style={styles.stateLabel}>
                                    {stateInfo?.label}
                                  </Text>
                                </View>

                                <View style={styles.checkRightSide}>
                                  {check.journal_entry && (
                                    <TouchableOpacity
                                      onPress={() => handleViewJournal(check.journal_entry)}
                                      activeOpacity={0.7}
                                      style={styles.journalIconButton}
                                    >
                                      <Text style={styles.journalIcon}>📝</Text>
                                    </TouchableOpacity>
                                  )}

                                  <Svg width={28} height={28}>
                                    <Circle
                                      cx={14}
                                      cy={14}
                                      r={11}
                                      stroke={stateInfo?.color + '30'}
                                      strokeWidth={3}
                                      fill="none"
                                    />
                                    <Circle
                                      cx={14}
                                      cy={14}
                                      r={11}
                                      stroke={stateInfo?.color}
                                      strokeWidth={3}
                                      fill="none"
                                      strokeDasharray={2 * Math.PI * 11}
                                      strokeDashoffset={2 * Math.PI * 11 * (1 - fillLevel)}
                                      strokeLinecap="round"
                                      transform={`rotate(-90 14 14)`}
                                    />
                                  </Svg>
                                </View>
                              </View>
                            </View>
                          )
                        } else {
                          const block = item.data
                          const blockName = block.somi_blocks?.name || block.somi_blocks?.canonical_name || 'Unknown Block'
                          const minutes = Math.floor(block.seconds_elapsed / 60)
                          const seconds = block.seconds_elapsed % 60
                          const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`

                          return (
                            <View key={`block-${block.id}`} style={styles.timelineItem}>
                              <Text style={styles.timelineItemLabel}>Exercise</Text>
                              <TouchableOpacity
                                style={styles.chainBlockItem}
                                onPress={() => handlePlayBlock(block)}
                                activeOpacity={0.7}
                              >
                                <View style={styles.blockLeftSide}>
                                  <TouchableOpacity
                                    onPress={() => handlePlayBlock(block)}
                                    style={styles.playIconButton}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.playIcon}>▶</Text>
                                  </TouchableOpacity>
                                  <Text style={styles.blockName}>{blockName}</Text>
                                </View>
                                <Text style={styles.blockTime}>{timeStr}</Text>
                              </TouchableOpacity>
                            </View>
                          )
                        }
                      })
                    })()}
                  </View>
                )}
              </BlurView>
            </View>
          )
        })}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDelete}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.deleteModalContainer}>
            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteModalTitle}>Delete SoMi Chain?</Text>
              <Text style={styles.deleteModalText}>
                This will permanently delete this chain and all its check-ins and exercise blocks.
              </Text>

              <View style={styles.deleteModalButtons}>
                <TouchableOpacity
                  onPress={cancelDelete}
                  activeOpacity={0.7}
                  style={styles.deleteModalButtonCancel}
                >
                  <Text style={styles.deleteModalButtonCancelText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={confirmDeleteChain}
                  activeOpacity={0.7}
                  style={styles.deleteModalButtonConfirm}
                >
                  <Text style={styles.deleteModalButtonConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      {/* Journal View Modal (Read-only) - Fullscreen */}
      <Modal
        visible={journalModalVisible}
        transparent={false}
        animationType="slide"
        onRequestClose={closeJournalModal}
      >
        <View style={styles.journalViewFullscreen}>
          <View style={styles.journalViewNotebook}>
            {/* Header with close button */}
            <View style={styles.journalViewHeader}>
              <TouchableOpacity
                onPress={closeJournalModal}
                activeOpacity={0.7}
                style={styles.journalViewCloseButton}
              >
                <Text style={styles.journalViewCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Notebook Content */}
            <View style={styles.journalViewNotebookContent}>
              <Text style={styles.journalViewNotebookTitle}>what was present</Text>

              <View style={styles.journalViewTextWrapper}>
                <Text style={styles.journalViewText}>
                  {selectedJournalEntry || ''}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerSpacer: {
    width: 44,
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: colors.text.muted,
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptyText: {
    color: colors.text.muted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  gardenCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 24,
    minHeight: 300,
  },
  gardenTitle: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'lowercase',
    marginBottom: 20,
    textAlign: 'center',
  },
  gardenContainer: {
    width: '100%',
    height: 240,
    position: 'relative',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
  },
  riverGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  gardenOrb: {
    position: 'absolute',
    width: 52,
    height: 52,
  },
  orbTouchable: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gardenOrbSvg: {
    position: 'absolute',
  },
  gardenOrbCenter: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  gardenOrbEmoji: {
    fontSize: 18,
  },
  orbTooltip: {
    position: 'absolute',
    backgroundColor: colors.overlay.dark,
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
    minWidth: 80,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  orbTooltipAbove: {
    top: -48,
  },
  orbTooltipBelow: {
    top: 56,
  },
  orbTooltipLeft: {
    left: 0,
  },
  orbTooltipCenter: {
    left: '50%',
    transform: [{ translateX: -50 }],
  },
  orbTooltipRight: {
    right: 0,
  },
  orbTooltipText: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  orbTooltipState: {
    color: colors.text.secondary,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  orbTooltipDate: {
    color: colors.text.muted,
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  statsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 24,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: colors.accent.primary,
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  statLabel: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  stateChipSmall: {
    alignItems: 'center',
  },
  stateEmoji: {
    fontSize: 32,
    marginBottom: 4,
  },
  myStatsTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  myStatsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 32,
    marginBottom: 40,
    alignItems: 'center',
  },
  featuredStat: {
    alignItems: 'center',
    marginBottom: 32,
  },
  featuredStatBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.accent.primary + '20',
    borderWidth: 3,
    borderColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  featuredStatNumber: {
    color: colors.accent.primary,
    fontSize: 52,
    fontWeight: '700',
    letterSpacing: -1,
  },
  featuredStatLabel: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  bottomStatsGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  bottomStatItem: {
    alignItems: 'center',
    flex: 1,
  },
  bottomStatIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  bottomStatValue: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  bottomStatLabel: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  bottomStatDivider: {
    width: 1,
    height: 40,
    backgroundColor: colors.border.subtle,
  },
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  checkInsListCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 16,
    marginBottom: 32,
  },
  checkInListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  checkInListItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  checkInListLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  checkInStateCircle: {
    width: 48,
    height: 48,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkInStateEmoji: {
    fontSize: 24,
  },
  checkInStateEmojiAbsolute: {
    position: 'absolute',
    fontSize: 22,
    top: '50%',
    left: '50%',
    transform: [{ translateX: -11 }, { translateY: -11 }],
  },
  checkInListInfo: {
    flex: 1,
  },
  checkInStateLabel: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 2,
  },
  checkInListTime: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  checkInListRight: {
    marginLeft: 12,
  },
  checkInSliderValue: {
    color: colors.accent.teal,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  checkInItem: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 16,
    paddingTop: 8,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.surface.tertiary,
    marginTop: 4,
    minHeight: 40,
  },
  checkInCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 16,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkInHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressCircleSvg: {
    // SVG circle progress indicator
  },
  stateChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  stateEmojiSmall: {
    fontSize: 16,
  },
  stateLabel: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  checkInTime: {
    color: 'rgba(247, 249, 251, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  chainHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  chainHeaderTouchable: {
    flex: 1,
  },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 107, 107, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButtonText: {
    color: '#ff6b6b',
    fontSize: 16,
    fontWeight: '300',
  },
  bottomSpacer: {
    height: 40,
  },
  chainHeaderLeft: {
    flex: 1,
  },
  chainTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  chainSubtitle: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  expandIcon: {
    color: colors.accent.primary,
    fontSize: 14,
    marginLeft: 12,
  },
  chainExpandedContent: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  chainSection: {
    marginBottom: 16,
  },
  chainSectionTitle: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 12,
  },
  timelineItem: {
    marginBottom: 12,
  },
  timelineItemLabel: {
    color: 'rgba(247, 249, 251, 0.5)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 6,
    marginLeft: 4,
  },
  chainCheckItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    marginBottom: 8,
  },
  chainBlockItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(0, 217, 163, 0.08)',
    borderRadius: 12,
    marginBottom: 8,
  },
  blockLeftSide: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  playIconButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 217, 163, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(0, 217, 163, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playIcon: {
    color: colors.accent.primary,
    fontSize: 12,
    marginLeft: 2,
  },
  blockName: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    flex: 1,
  },
  blockTime: {
    color: colors.accent.primary,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginLeft: 12,
  },
  tetherSvg: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  deleteModalContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    maxWidth: 340,
    width: '100%',
  },
  deleteModalContent: {
    padding: 24,
    alignItems: 'center',
  },
  deleteModalTitle: {
    color: '#ff6b6b',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 12,
    textAlign: 'center',
  },
  deleteModalText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  deleteModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  deleteModalButtonCancel: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: colors.border.default,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deleteModalButtonCancelText: {
    color: 'rgba(247, 249, 251, 0.9)',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  deleteModalButtonConfirm: {
    flex: 1,
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 2,
    borderColor: '#ff6b6b',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  deleteModalButtonConfirmText: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  checkRightSide: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  journalIconButton: {
    padding: 4,
  },
  journalIcon: {
    fontSize: 18,
    opacity: 0.8,
  },
  journalViewFullscreen: {
    flex: 1,
    backgroundColor: colors.text.primary,
  },
  journalViewNotebook: {
    flex: 1,
    paddingTop: 60,
  },
  journalViewHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    alignItems: 'flex-end',
  },
  journalViewCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalViewCloseText: {
    color: colors.text.muted,
    fontSize: 24,
    fontWeight: '300',
  },
  journalViewNotebookContent: {
    flex: 1,
    paddingHorizontal: 32,
  },
  journalViewNotebookTitle: {
    color: colors.text.inverse,
    fontSize: 28,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 24,
  },
  journalViewTextWrapper: {
    flex: 1,
  },
  journalViewText: {
    color: colors.text.inverse,
    fontSize: 18,
    fontWeight: '400',
    lineHeight: 28,
    letterSpacing: 0.2,
  },
  calendarCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    padding: 20,
    marginBottom: 32,
  },
  calendarContainer: {
    width: '100%',
  },
  calendarMonthTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
    textAlign: 'center',
    marginBottom: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  calendarDayName: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    textAlign: 'center',
    width: '14.28%',
  },
  calendarWeek: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  calendarDayCell: {
    width: '14.28%',
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDay: {
    width: '90%',
    height: '90%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    position: 'relative',
  },
  calendarDayWithSession: {
    backgroundColor: colors.accent.primary + '30',
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  calendarDayStreak: {
    backgroundColor: colors.accent.primary,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: colors.text.primary,
  },
  calendarDayText: {
    color: colors.text.muted,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  calendarDayTextActive: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  calendarDayTextToday: {
    color: colors.text.primary,
    fontWeight: '700',
  },
  sessionCountDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: colors.accent.teal,
    borderRadius: 6,
    width: 12,
    height: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionCountText: {
    color: colors.background.primary,
    fontSize: 8,
    fontWeight: '700',
  },
  calendarLegend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  calendarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  calendarLegendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  calendarLegendDotSession: {
    backgroundColor: colors.accent.primary + '30',
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  calendarLegendDotStreak: {
    backgroundColor: colors.accent.primary,
  },
  calendarLegendDotToday: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 2,
    borderColor: colors.text.primary,
  },
  calendarLegendText: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
})
