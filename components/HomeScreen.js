import { useState, useCallback } from 'react'
import { StyleSheet, View, Text, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { somiChainService } from '../supabase'
import { useFocusEffect } from '@react-navigation/native'
import { POLYVAGAL_STATE_MAP } from './EmbodimentSlider'

// Polyvagal states with colors and emojis (new code-based system)
const POLYVAGAL_STATES = {
  0: { label: 'SOS', color: '#ff6b9d', emoji: '🆘' },
  1: { label: 'Drained', color: '#7b68ee', emoji: '🌧' },
  2: { label: 'Foggy', color: '#9d7be8', emoji: '🌫' },
  3: { label: 'Wired', color: '#b88ddc', emoji: '🌪' },
  4: { label: 'Steady', color: '#68c9ba', emoji: '🌤' },
  5: { label: 'Glowing', color: '#4ecdc4', emoji: '☀️' },
}

export default function HomeScreen({ navigation }) {
  const [latestChain, setLatestChain] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      fetchHomeData()
    }, [])
  )

  const fetchHomeData = async () => {
    setLoading(true)
    const chain = await somiChainService.getLatestChain()
    setLatestChain(chain)
    setLoading(false)
  }

  // Calculate stats from latest chain
  const getChainStats = () => {
    if (!latestChain || !latestChain.embodiment_checks || latestChain.embodiment_checks.length < 2) {
      return null
    }

    const checks = latestChain.embodiment_checks
    const firstCheck = checks[0]
    const lastCheck = checks[checks.length - 1]

    // Calculate percentage change
    const change = lastCheck.embodiment_level - firstCheck.embodiment_level
    const changePercent = change > 0 ? `+${change}%` : `${change}%`

    const fromStateCode = firstCheck.polyvagal_state_code !== undefined ? firstCheck.polyvagal_state_code : 1
    const toStateCode = lastCheck.polyvagal_state_code !== undefined ? lastCheck.polyvagal_state_code : 1

    // Calculate total minutes from entries
    const totalSeconds = (latestChain.somi_chain_entries || []).reduce((sum, entry) => sum + (entry.seconds_elapsed || 0), 0)
    const totalMinutes = Math.round(totalSeconds / 60)

    return {
      changePercent,
      change,
      fromState: POLYVAGAL_STATES[fromStateCode] || POLYVAGAL_STATES[1],
      toState: POLYVAGAL_STATES[toStateCode] || POLYVAGAL_STATES[1],
      totalMinutes,
    }
  }

  const chainStats = getChainStats()

  // Compassionate messages based on minutes spent
  const getCompassionateMessage = (minutes) => {
    if (minutes === 0) return 'way to show up for yourself'
    if (minutes < 5) return 'every moment counts'
    if (minutes < 10) return 'beautiful way to reconnect'
    if (minutes < 20) return 'what a gift you gave yourself'
    return 'deeply honoring your embodiment'
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SoMi Logo at top */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>SoMi</Text>
        </View>

        {/* Welcome section */}
        <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>Hi there.</Text>
          <Text style={styles.welcomeSubtext}>Welcome back</Text>

          {chainStats ? (
            <BlurView intensity={20} tint="dark" style={styles.statsCard}>
              <View style={styles.statsContent}>
                <Text style={styles.statsLabel}>Last check-in</Text>

                {/* State transition with emojis */}
                <View style={styles.stateTransition}>
                  <View style={[styles.stateCircle, { backgroundColor: chainStats.fromState.color + '33', borderColor: chainStats.fromState.color }]}>
                    <Text style={styles.stateEmoji}>{chainStats.fromState.emoji}</Text>
                  </View>

                  <View style={styles.transitionArrow}>
                    <Text style={styles.arrowText}>→</Text>
                  </View>

                  <View style={[styles.stateCircle, { backgroundColor: chainStats.toState.color + '33', borderColor: chainStats.toState.color }]}>
                    <Text style={styles.stateEmoji}>{chainStats.toState.emoji}</Text>
                  </View>
                </View>

                {/* Percentage change indicator */}
                <View style={styles.statRow}>
                  <LinearGradient
                    colors={chainStats.change >= 0 ? ['#4ecdc4', '#44a08d'] : ['#7b68ee', '#6a5acd']}
                    style={styles.progressIndicator}
                  >
                    <Text style={styles.statsChange}>{chainStats.changePercent}</Text>
                  </LinearGradient>
                </View>

                {/* State labels */}
                <View style={styles.stateLabels}>
                  <Text style={[styles.stateLabelText, { color: chainStats.fromState.color }]}>
                    {chainStats.fromState.label}
                  </Text>
                  <Text style={styles.stateLabelArrow}>→</Text>
                  <Text style={[styles.stateLabelText, { color: chainStats.toState.color }]}>
                    {chainStats.toState.label}
                  </Text>
                </View>
              </View>
            </BlurView>
          ) : (
            <BlurView intensity={20} tint="dark" style={styles.statsCard}>
              <View style={styles.statsContent}>
                <Text style={styles.statsLabel}>No check-ins yet</Text>
                <Text style={styles.statsDetail}>Start your first SoMi session</Text>
              </View>
            </BlurView>
          )}
        </View>
      </View>

        {/* Compassionate minutes message */}
        {chainStats && chainStats.totalMinutes >= 0 && (
          <View style={styles.minutesSection}>
            <BlurView intensity={20} tint="dark" style={styles.minutesCard}>
              <Text style={styles.minutesLabel}>you spent</Text>
              <Text style={styles.minutesNumber}>{chainStats.totalMinutes}</Text>
              <Text style={styles.minutesUnit}>minutes</Text>
              <Text style={styles.minutesSubtext}>reconnecting to yourself</Text>
              <Text style={styles.compassionateText}>{getCompassionateMessage(chainStats.totalMinutes)}</Text>
            </BlurView>
          </View>
        )}
      </ScrollView>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  logoSection: {
    paddingTop: 70,
    paddingBottom: 20,
    alignItems: 'center',
  },
  logoText: {
    color: '#f7f9fb',
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 2,
  },
  welcomeSection: {
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  welcomeContent: {
    alignItems: 'center',
    width: '100%',
  },
  welcomeText: {
    color: '#f7f9fb',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtext: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 18,
    fontWeight: '400',
    marginBottom: 32,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  statsCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    width: '100%',
  },
  statsContent: {
    padding: 28,
    alignItems: 'center',
  },
  statsLabel: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressIndicator: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 16,
  },
  statsChange: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statsDetail: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  stateTransition: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateEmoji: {
    fontSize: 28,
  },
  transitionArrow: {
    marginHorizontal: 16,
  },
  arrowText: {
    fontSize: 24,
    color: 'rgba(247, 249, 251, 0.5)',
  },
  stateLabels: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
  },
  stateLabelText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  stateLabelArrow: {
    fontSize: 14,
    color: 'rgba(247, 249, 251, 0.5)',
  },
  minutesSection: {
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 20,
  },
  minutesCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    padding: 32,
    alignItems: 'center',
  },
  minutesLabel: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  minutesNumber: {
    color: '#4ecdc4',
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
  },
  minutesUnit: {
    color: '#4ecdc4',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  minutesSubtext: {
    color: 'rgba(247, 249, 251, 0.8)',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 16,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  compassionateText: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 14,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
})
