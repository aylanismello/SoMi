import React, { useState, useEffect } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { supabase } from '../supabase'

// Match polyvagal states from SoMeCheckIn
const POLYVAGAL_STATES = [
  { id: 'withdrawn', label: 'Withdrawn', color: '#7b68ee' },
  { id: 'stirring', label: 'Stirring', color: '#9d7be8' },
  { id: 'activated', label: 'Activated', color: '#b88ddc' },
  { id: 'settling', label: 'Settling', color: '#68c9ba' },
  { id: 'connected', label: 'Connected', color: '#4ecdc4' },
]

const STATE_EMOJIS = {
  withdrawn: '🌑',
  stirring: '🌘',
  activated: '⚡',
  settling: '🌤',
  connected: '🌕',
}

export default function MySomiScreen() {
  const [loading, setLoading] = useState(true)
  const [checkIns, setCheckIns] = useState([])
  const [stats, setStats] = useState({
    averageScore: 0,
    totalCheckIns: 0,
    mostCommonState: null,
    recentTrend: null,
  })

  useEffect(() => {
    fetchCheckIns()
  }, [])

  const fetchCheckIns = async () => {
    try {
      setLoading(true)

      // Fetch all check-ins, ordered by most recent
      const { data, error } = await supabase
        .from('embodiment_checks')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(30) // Last 30 check-ins

      if (error) {
        console.error('Error fetching check-ins:', error)
        return
      }

      setCheckIns(data || [])
      calculateStats(data || [])
    } catch (err) {
      console.error('Unexpected error:', err)
    } finally {
      setLoading(false)
    }
  }

  const calculateStats = (data) => {
    if (data.length === 0) {
      setStats({
        averageScore: 0,
        totalCheckIns: 0,
        mostCommonState: null,
        recentTrend: null,
      })
      return
    }

    // Calculate average score
    const avgScore = data.reduce((sum, check) => sum + check.slider_value, 0) / data.length

    // Find most common state
    const stateCounts = {}
    data.forEach(check => {
      stateCounts[check.polyvagal_state] = (stateCounts[check.polyvagal_state] || 0) + 1
    })
    const mostCommonState = Object.keys(stateCounts).reduce((a, b) =>
      stateCounts[a] > stateCounts[b] ? a : b
    )

    // Calculate recent trend (last 5 vs previous 5)
    let recentTrend = null
    if (data.length >= 10) {
      const recentAvg = data.slice(0, 5).reduce((sum, c) => sum + c.slider_value, 0) / 5
      const previousAvg = data.slice(5, 10).reduce((sum, c) => sum + c.slider_value, 0) / 5
      const diff = recentAvg - previousAvg

      if (Math.abs(diff) < 5) {
        recentTrend = 'stable'
      } else if (diff > 0) {
        recentTrend = 'improving'
      } else {
        recentTrend = 'fluctuating'
      }
    }

    setStats({
      averageScore: Math.round(avgScore),
      totalCheckIns: data.length,
      mostCommonState,
      recentTrend,
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

  const getStateInfo = (stateId) => {
    return POLYVAGAL_STATES.find(s => s.id === stateId)
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
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.container}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4ecdc4" />
        </View>
      </LinearGradient>
    )
  }

  if (checkIns.length === 0) {
    return (
      <LinearGradient
        colors={['#0f0c29', '#302b63', '#24243e']}
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.headerTitle}>My SoMi</Text>
        </View>
        {renderEmptyState()}
      </LinearGradient>
    )
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My SoMi</Text>
        <Text style={styles.headerSubtitle}>{stats.totalCheckIns} check-ins</Text>
      </View>

      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Overview */}
        <BlurView intensity={20} tint="dark" style={styles.statsCard}>
          <View style={styles.statsGrid}>
            {/* Average Score */}
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{stats.averageScore}%</Text>
              <Text style={styles.statLabel}>average</Text>
            </View>

            {/* Most Common State */}
            <View style={styles.statItem}>
              <View style={styles.stateChipSmall}>
                <Text style={styles.stateEmoji}>
                  {STATE_EMOJIS[stats.mostCommonState]}
                </Text>
                <Text style={[styles.statValue, { fontSize: 16, marginTop: 4 }]}>
                  {getStateInfo(stats.mostCommonState)?.label}
                </Text>
              </View>
              <Text style={styles.statLabel}>most common</Text>
            </View>

            {/* Recent Trend */}
            {stats.recentTrend && (
              <View style={styles.statItem}>
                <Text style={styles.statValue}>
                  {stats.recentTrend === 'improving' ? '↗' :
                   stats.recentTrend === 'stable' ? '→' : '↻'}
                </Text>
                <Text style={styles.statLabel}>
                  {stats.recentTrend}
                </Text>
              </View>
            )}
          </View>
        </BlurView>

        {/* Recent Check-ins Timeline */}
        <Text style={styles.sectionTitle}>recent check-ins</Text>

        {checkIns.map((check, index) => {
          const stateInfo = getStateInfo(check.polyvagal_state)
          return (
            <View key={check.id} style={styles.checkInItem}>
              {/* Timeline dot and line */}
              <View style={styles.timelineContainer}>
                <View style={[styles.timelineDot, { backgroundColor: stateInfo?.color }]} />
                {index < checkIns.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>

              {/* Check-in content */}
              <BlurView intensity={15} tint="dark" style={styles.checkInCard}>
                <View style={styles.checkInHeader}>
                  <View style={[styles.stateChip, {
                    backgroundColor: stateInfo?.color + '33',
                    borderColor: stateInfo?.color,
                  }]}>
                    <Text style={styles.stateEmojiSmall}>
                      {STATE_EMOJIS[check.polyvagal_state]}
                    </Text>
                    <Text style={styles.stateLabel}>
                      {stateInfo?.label}
                    </Text>
                  </View>

                  <Text style={styles.checkInScore}>{check.slider_value}%</Text>
                </View>

                <Text style={styles.checkInTime}>{formatDate(check.created_at)}</Text>
              </BlurView>
            </View>
          )
        })}

        {/* Bottom spacing */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 20,
    paddingTop: 10,
  },
  headerTitle: {
    color: '#f7f9fb',
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    color: 'rgba(247, 249, 251, 0.6)',
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
    color: '#f7f9fb',
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emptyText: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    letterSpacing: 0.2,
  },
  statsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
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
    color: '#4ecdc4',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  statLabel: {
    color: 'rgba(247, 249, 251, 0.6)',
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
  sectionTitle: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
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
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    marginTop: 4,
    minHeight: 40,
  },
  checkInCard: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 16,
  },
  checkInHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  checkInScore: {
    color: '#4ecdc4',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  checkInTime: {
    color: 'rgba(247, 249, 251, 0.5)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 40,
  },
})
