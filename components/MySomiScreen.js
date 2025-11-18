import React, { useState, useCallback } from 'react'
import { StyleSheet, Text, View, ScrollView, ActivityIndicator, TouchableOpacity, Animated } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Svg, { Circle, Line } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { supabase, somiChainService } from '../supabase'

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

// Floating Orb Component with physics
function FloatingOrb({ check, index, onPress, isSelected, formatDate }) {
  const stateInfo = POLYVAGAL_STATES.find(s => s.id === check.polyvagal_state)
  const fillLevel = check.slider_value / 100

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
            {STATE_EMOJIS[check.polyvagal_state]}
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
            <Text style={styles.orbTooltipText}>{Math.round(check.slider_value)}%</Text>
            <Text style={styles.orbTooltipState}>{stateInfo?.label}</Text>
            <Text style={styles.orbTooltipDate}>{formatDate(check.created_at)}</Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  )
}

export default function MySomiScreen() {
  const [loading, setLoading] = useState(true)
  const [somiChains, setSomiChains] = useState([])
  const [selectedOrb, setSelectedOrb] = useState(null)
  const [expandedChains, setExpandedChains] = useState({}) // Track which chains are expanded
  const [stats, setStats] = useState({
    averageScore: 0,
    totalCheckIns: 0,
    mostCommonState: null,
    recentTrend: null,
  })

  // Fetch fresh data whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchSomiChains()
    }, [])
  )

  const fetchSomiChains = async () => {
    try {
      setLoading(true)

      // Fetch all chains with their data
      const chainsData = await somiChainService.fetchChainsWithData(30)

      setSomiChains(chainsData)

      // Calculate stats from all embodiment checks across all chains
      const allChecks = chainsData.flatMap(chain => chain.embodiment_checks)
      calculateStats(allChecks)
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

  if (somiChains.length === 0) {
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

  // Get all embodiment checks from all chains for the river visualization
  const allChecksForRiver = somiChains.flatMap(chain => chain.embodiment_checks)

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
        {/* Garden Visualization */}
        <BlurView intensity={20} tint="dark" style={styles.gardenCard}>
          <Text style={styles.gardenTitle}>your embodiment river</Text>
          <View style={styles.gardenContainer}>
            {/* River gradient background */}
            <LinearGradient
              colors={[
                'rgba(30, 60, 114, 0.3)',
                'rgba(42, 82, 152, 0.4)',
                'rgba(78, 205, 196, 0.25)',
                'rgba(42, 82, 152, 0.4)',
                'rgba(30, 60, 114, 0.3)',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.riverGradient}
            />

            {/* Render tethers between chain groups */}
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
                      stroke="rgba(78, 205, 196, 0.3)"
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

        {/* Stats Overview */}
        <BlurView intensity={20} tint="dark" style={styles.statsCard}>
          <View style={styles.statsGrid}>
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

        {/* SoMi Chains Timeline */}
        <Text style={styles.sectionTitle}>somi chains</Text>

        {somiChains.map((chain, chainIndex) => {
          const isExpanded = expandedChains[chain.id]
          const checksCount = chain.embodiment_checks.length
          const blocksCount = chain.completed_blocks.length

          return (
            <View key={chain.id} style={styles.checkInItem}>
              {/* Timeline dot and line */}
              <View style={styles.timelineContainer}>
                <View style={[styles.timelineDot, { backgroundColor: '#4ecdc4' }]} />
                {chainIndex < somiChains.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
              </View>

              {/* Chain card */}
              <BlurView intensity={15} tint="dark" style={styles.checkInCard}>
                <TouchableOpacity
                  onPress={() => toggleChainExpanded(chain.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.checkInHeader}>
                    <View style={styles.chainHeaderLeft}>
                      <Text style={styles.chainTitle}>SoMi Chain</Text>
                      <Text style={styles.chainSubtitle}>
                        {checksCount} check-in{checksCount !== 1 ? 's' : ''} • {blocksCount} block{blocksCount !== 1 ? 's' : ''}
                      </Text>
                    </View>

                    <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                  </View>

                  <Text style={styles.checkInTime}>{formatDate(chain.created_at)}</Text>
                </TouchableOpacity>

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
                      const blocks = chain.completed_blocks.map(b => ({
                        type: 'block',
                        timestamp: new Date(b.created_at),
                        data: b
                      }))

                      // Merge and sort by timestamp
                      const timeline = [...checks, ...blocks].sort((a, b) => a.timestamp - b.timestamp)

                      return timeline.map((item, index) => {
                        if (item.type === 'check') {
                          const check = item.data
                          const stateInfo = getStateInfo(check.polyvagal_state)
                          const fillLevel = check.slider_value / 100

                          return (
                            <View key={`check-${check.id}`} style={styles.timelineItem}>
                              <Text style={styles.timelineItemLabel}>Check-in</Text>
                              <View style={styles.chainCheckItem}>
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
                              <View style={styles.chainBlockItem}>
                                <Text style={styles.blockName}>{blockName}</Text>
                                <Text style={styles.blockTime}>{timeStr}</Text>
                              </View>
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
  gardenCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 24,
    minHeight: 300,
  },
  gardenTitle: {
    color: 'rgba(247, 249, 251, 0.8)',
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
    backgroundColor: 'rgba(15, 12, 41, 0.95)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
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
    color: '#f7f9fb',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  orbTooltipState: {
    color: 'rgba(247, 249, 251, 0.85)',
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  orbTooltipDate: {
    color: 'rgba(247, 249, 251, 0.6)',
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
    color: '#f7f9fb',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  chainSubtitle: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  expandIcon: {
    color: '#4ecdc4',
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
    color: 'rgba(247, 249, 251, 0.8)',
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
    backgroundColor: 'rgba(78, 205, 196, 0.08)',
    borderRadius: 12,
    marginBottom: 8,
  },
  blockName: {
    color: '#f7f9fb',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
    flex: 1,
  },
  blockTime: {
    color: '#4ecdc4',
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
})
