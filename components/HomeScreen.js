import { useState, useCallback } from 'react'
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { somiChainService, supabase } from '../supabase'
import { useFocusEffect } from '@react-navigation/native'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { getRoutineConfig } from '../services/routineConfig'
import SettingsModal from './SettingsModal'
import EmbodimentSlider from './EmbodimentSlider'

// Polyvagal states with colors and emojis (new code-based system)
const POLYVAGAL_STATES = {
  0: { label: 'SOS', color: '#ff6b9d', emoji: '🆘' },
  1: { label: 'Drained', color: '#4A5F8C', emoji: '🌧' },
  2: { label: 'Foggy', color: '#5B7BB4', emoji: '🌫' },
  3: { label: 'Wired', color: '#6B9BD1', emoji: '🌪' },
  4: { label: 'Steady', color: '#7DBCE7', emoji: '🌤' },
  5: { label: 'Glowing', color: '#90DDF0', emoji: '☀️' },
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

  // Calculate stats from latest chain (flexible - works with any chain type)
  const getChainStats = () => {
    if (!latestChain) {
      return null
    }

    // Calculate total minutes from entries (blocks)
    const totalSeconds = (latestChain.somi_chain_entries || []).reduce((sum, entry) => sum + (entry.seconds_elapsed || 0), 0)
    const totalMinutes = totalSeconds > 0 ? Math.max(1, Math.ceil(totalSeconds / 60)) : 0

    const checks = latestChain.embodiment_checks || []

    // If we have 2+ checks, show transformation
    if (checks.length >= 2) {
      const firstCheck = checks[0]
      const lastCheck = checks[checks.length - 1]

      const fromStateCode = firstCheck.polyvagal_state_code !== undefined ? firstCheck.polyvagal_state_code : 1
      const toStateCode = lastCheck.polyvagal_state_code !== undefined ? lastCheck.polyvagal_state_code : 1

      return {
        fromState: POLYVAGAL_STATES[fromStateCode] || POLYVAGAL_STATES[1],
        toState: POLYVAGAL_STATES[toStateCode] || POLYVAGAL_STATES[1],
        totalMinutes,
        hasTransformation: true,
      }
    }

    // If we have 1 check, show single state
    if (checks.length === 1) {
      const stateCode = checks[0].polyvagal_state_code !== undefined ? checks[0].polyvagal_state_code : 1
      return {
        fromState: POLYVAGAL_STATES[stateCode] || POLYVAGAL_STATES[1],
        toState: null,
        totalMinutes,
        hasTransformation: false,
      }
    }

    // If no checks but has blocks (e.g., just body scan or single video)
    if ((latestChain.somi_chain_entries || []).length > 0) {
      return {
        fromState: null,
        toState: null,
        totalMinutes,
        hasTransformation: false,
      }
    }

    return null
  }

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 0 && hour < 5) return 'Hey there, night owl'
    if (hour >= 5 && hour < 12) return 'Good morning'
    if (hour >= 12 && hour < 18) return 'Good afternoon'
    return 'Good evening'
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

  const [lastQuickCheckInState, setLastQuickCheckInState] = useState(null)
  const [showQuickCheckInModal, setShowQuickCheckInModal] = useState(false)
  const [quickSliderValue, setQuickSliderValue] = useState(50)
  const [quickPolyvagalState, setQuickPolyvagalState] = useState(null)
  const [showSettingsModal, setShowSettingsModal] = useState(false)

  const handleOpenQuickCheckIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setQuickSliderValue(50)
    setQuickPolyvagalState(null)
    setShowQuickCheckInModal(true)
  }

  const handleQuickStateSelect = (stateId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setQuickPolyvagalState(stateId)
  }

  const handleQuickCheckInSave = async () => {
    if (!quickPolyvagalState) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Save embodiment check
    try {
      const chainId = await somiChainService.getOrCreateActiveChain()
      await somiChainService.saveEmbodimentCheck(quickSliderValue, quickPolyvagalState, null)

      // Update last state and close modal
      setLastQuickCheckInState(quickPolyvagalState)
      setShowQuickCheckInModal(false)

      // Refresh home data to show the new check-in
      fetchHomeData()
    } catch (err) {
      console.error('Error saving quick check-in:', err)
    }
  }

  const handleClearQuickCheckIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setLastQuickCheckInState(null)
  }

  const handleOpenTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate('MeditationTimerSetup')
  }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowSettingsModal(true)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)
  }

  const handleQuickRoutine = async (routineType, blockCount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Build the custom queue for this routine
    const canonicalNames = getRoutineConfig(routineType, blockCount)
    if (!canonicalNames) {
      console.error('Failed to get routine config')
      return
    }

    // Fetch blocks from database
    const { data: fetchedBlocks, error } = await supabase
      .from('somi_blocks')
      .select('id, canonical_name, name, description, state_target, media_url')
      .in('canonical_name', canonicalNames)

    if (error) {
      console.error('Error fetching blocks:', error)
      return
    }

    // Sort blocks to match canonical names order
    const sortedBlocks = canonicalNames.map(canonicalName =>
      fetchedBlocks.find(block => block.canonical_name === canonicalName)
    ).filter(Boolean)

    // Convert to queue format
    const customQueue = sortedBlocks.map((block, index) => ({
      somi_block_id: block.id,
      name: block.name,
      canonical_name: block.canonical_name,
      url: block.media_url,
      type: 'video',
      order: index,
      description: block.description,
      state_target: block.state_target,
    }))

    // Navigate directly to routine with default values (no initial check-in)
    navigation.navigate('Flow', {
      screen: 'SoMiRoutine',
      params: {
        polyvagalState: 4, // Default to "Steady"
        sliderValue: 50,
        savedInitialValue: 50,
        savedInitialState: 4,
        totalBlocks: blockCount,
        customQueue: customQueue,
        isQuickRoutine: true,
      },
    })
  }

  return (
    <View style={styles.container}>
      {/* Background Image - Hero Section */}
      <Image
        source={{ uri: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/home%20screen%20backgrounds/water_1.jpg' }}
        style={styles.heroImage}
        resizeMode="cover"
      />

      {/* Gradient overlay for better text readability */}
      <LinearGradient
        colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.3)', colors.background.primary]}
        locations={[0, 0.5, 1]}
        style={styles.heroGradient}
      />

      {/* Settings Icon - Upper Left */}
      <TouchableOpacity
        onPress={handleOpenSettings}
        style={styles.settingsButton}
        activeOpacity={0.7}
      >
        <Text style={styles.settingsIcon}>⚙️</Text>
      </TouchableOpacity>

      {/* Meditation Timer Bell Icon - Upper Right */}
      <TouchableOpacity
        onPress={handleOpenTimer}
        style={styles.timerBellButton}
        activeOpacity={0.7}
      >
        <Text style={styles.timerBellIcon}>🔔</Text>
      </TouchableOpacity>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* SoMi Logo at top - overlaid on image */}
        <View style={styles.logoSection}>
          <Text style={styles.logoText}>SoMi</Text>
        </View>

        {/* Welcome section */}
        <View style={styles.welcomeSection}>
        <View style={styles.welcomeContent}>
          <Text style={styles.welcomeText}>Hi Aylan.</Text>
          <Text style={styles.welcomeSubtext}>{getGreeting()}</Text>

          {chainStats ? (
            <BlurView intensity={20} tint="dark" style={styles.statsCard}>
              <View style={styles.statsContent}>
                <Text style={styles.statsLabel}>Last session</Text>

                {chainStats.hasTransformation ? (
                  <>
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
                  </>
                ) : chainStats.fromState ? (
                  <>
                    {/* Single check-in state */}
                    <View style={styles.stateTransition}>
                      <View style={[styles.stateCircle, { backgroundColor: chainStats.fromState.color + '33', borderColor: chainStats.fromState.color }]}>
                        <Text style={styles.stateEmoji}>{chainStats.fromState.emoji}</Text>
                      </View>
                    </View>
                    <View style={styles.stateLabels}>
                      <Text style={[styles.stateLabelText, { color: chainStats.fromState.color }]}>
                        {chainStats.fromState.label}
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    {/* No check-ins, just practice */}
                    <Text style={styles.statsDetail}>Practice session</Text>
                  </>
                )}

                {/* Minutes spent */}
                {chainStats.totalMinutes > 0 && (
                  <View style={styles.minutesRow}>
                    <Text style={styles.minutesLabel}>{chainStats.totalMinutes} {chainStats.totalMinutes === 1 ? 'minute' : 'minutes'}</Text>
                  </View>
                )}
              </View>
            </BlurView>
          ) : (
            <BlurView intensity={20} tint="dark" style={styles.statsCard}>
              <View style={styles.statsContent}>
                <Text style={styles.statsLabel}>No sessions yet</Text>
                <Text style={styles.statsDetail}>Start your first SoMi session</Text>
              </View>
            </BlurView>
          )}
        </View>
      </View>

        {/* Quick Check-In Card (Calm-style) */}
        <View style={styles.quickCheckInSection}>
          <TouchableOpacity
            onPress={handleOpenQuickCheckIn}
            activeOpacity={0.85}
            style={styles.quickCheckInCard}
          >
            <BlurView intensity={20} tint="dark" style={styles.quickCheckInBlur}>
              {lastQuickCheckInState ? (
                <View style={styles.quickCheckInSelected}>
                  <Text style={styles.quickCheckInSelectedLabel}>You're feeling:</Text>
                  <View style={styles.quickCheckInSelectedBadge}>
                    <Text style={styles.quickCheckInSelectedEmoji}>
                      {POLYVAGAL_STATES[lastQuickCheckInState]?.emoji}
                    </Text>
                    <Text style={[
                      styles.quickCheckInSelectedText,
                      { color: POLYVAGAL_STATES[lastQuickCheckInState]?.color }
                    ]}>
                      {POLYVAGAL_STATES[lastQuickCheckInState]?.label}
                    </Text>
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation()
                        handleClearQuickCheckIn()
                      }}
                      style={styles.quickCheckInClear}
                    >
                      <Text style={styles.quickCheckInClearText}>✕</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={styles.quickCheckInPrompt}>
                  <Text style={styles.quickCheckInEmoji}>🌤</Text>
                  <Text style={styles.quickCheckInText}>How are you feeling?</Text>
                  <Text style={styles.quickCheckInChevron}>›</Text>
                </View>
              )}
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Quick Routine Carousel */}
        <View style={styles.quickRoutineSection}>
          <Text style={styles.quickRoutineTitle}>Quick Start</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickRoutineScroll}
          >
            <TouchableOpacity
              onPress={() => handleQuickRoutine('morning', 2)}
              activeOpacity={0.85}
              style={styles.quickRoutineCard}
            >
              <BlurView intensity={20} tint="dark" style={styles.quickRoutineBlur}>
                <Text style={styles.quickRoutineEmoji}>☀️</Text>
                <Text style={styles.quickRoutineLabel}>Morning</Text>
                <Text style={styles.quickRoutineDuration}>5 min</Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickRoutine('morning', 6)}
              activeOpacity={0.85}
              style={styles.quickRoutineCard}
            >
              <BlurView intensity={20} tint="dark" style={styles.quickRoutineBlur}>
                <Text style={styles.quickRoutineEmoji}>☀️</Text>
                <Text style={styles.quickRoutineLabel}>Morning</Text>
                <Text style={styles.quickRoutineDuration}>10 min</Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickRoutine('night', 2)}
              activeOpacity={0.85}
              style={styles.quickRoutineCard}
            >
              <BlurView intensity={20} tint="dark" style={styles.quickRoutineBlur}>
                <Text style={styles.quickRoutineEmoji}>🌙</Text>
                <Text style={styles.quickRoutineLabel}>Night</Text>
                <Text style={styles.quickRoutineDuration}>5 min</Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickRoutine('night', 6)}
              activeOpacity={0.85}
              style={styles.quickRoutineCard}
            >
              <BlurView intensity={20} tint="dark" style={styles.quickRoutineBlur}>
                <Text style={styles.quickRoutineEmoji}>🌙</Text>
                <Text style={styles.quickRoutineLabel}>Night</Text>
                <Text style={styles.quickRoutineDuration}>10 min</Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickRoutine('morning', 10)}
              activeOpacity={0.85}
              style={styles.quickRoutineCard}
            >
              <BlurView intensity={20} tint="dark" style={styles.quickRoutineBlur}>
                <Text style={styles.quickRoutineEmoji}>☀️</Text>
                <Text style={styles.quickRoutineLabel}>Morning</Text>
                <Text style={styles.quickRoutineDuration}>15 min</Text>
              </BlurView>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => handleQuickRoutine('night', 10)}
              activeOpacity={0.85}
              style={styles.quickRoutineCard}
            >
              <BlurView intensity={20} tint="dark" style={styles.quickRoutineBlur}>
                <Text style={styles.quickRoutineEmoji}>🌙</Text>
                <Text style={styles.quickRoutineLabel}>Night</Text>
                <Text style={styles.quickRoutineDuration}>15 min</Text>
              </BlurView>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Quick Check-In Modal */}
        <Modal
          visible={showQuickCheckInModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowQuickCheckInModal(false)}
        >
          <View style={styles.quickCheckInModalOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.quickCheckInModalContainer}>
              {/* Header with close button */}
              <View style={styles.quickCheckInModalHeader}>
                <TouchableOpacity
                  onPress={() => setShowQuickCheckInModal(false)}
                  style={styles.quickCheckInModalClose}
                >
                  <Text style={styles.quickCheckInModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Title */}
              <Text style={styles.quickCheckInModalTitle}>
                {quickPolyvagalState ? 'how present are those\nfeelings in the body?' : 'how do you feel\nright now?'}
              </Text>

              {/* EmbodimentSlider Component - Smaller */}
              <View style={styles.quickCheckInModalSliderWrapper}>
                <EmbodimentSlider
                  value={quickSliderValue}
                  onValueChange={(value) => setQuickSliderValue(value)}
                  question={null}
                  showStateLabel={false}
                  showChips={true}
                  states={Object.entries(POLYVAGAL_STATES)
                    .filter(([code]) => code !== '0')
                    .map(([code, state]) => ({
                      id: parseInt(code),
                      label: state.label,
                      color: state.color,
                      emoji: state.emoji,
                    }))}
                  selectedStateId={quickPolyvagalState}
                  onStateChange={handleQuickStateSelect}
                  isConfirmed={false}
                  onConfirm={null}
                  helpMode={false}
                />
              </View>

              {/* Save Button - Always visible when state selected */}
              {quickPolyvagalState !== null && (
                <View style={styles.quickCheckInModalButtonWrapper}>
                  <TouchableOpacity
                    onPress={handleQuickCheckInSave}
                    activeOpacity={0.7}
                    style={styles.quickCheckInModalSaveButton}
                  >
                    <Text style={styles.quickCheckInModalSaveButtonText}>
                      Save
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </BlurView>
          </View>
        </Modal>

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

      {/* Settings Modal */}
      <SettingsModal visible={showSettingsModal} onClose={handleCloseSettings} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  heroImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 400,
    width: '100%',
  },
  heroGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 450,
    width: '100%',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  logoSection: {
    paddingTop: 100,
    paddingBottom: 50,
    alignItems: 'center',
  },
  logoText: {
    color: colors.text.primary,
    fontSize: 48,
    fontWeight: '700',
    letterSpacing: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
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
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  welcomeSubtext: {
    color: colors.text.muted,
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
    borderColor: colors.border.subtle,
    width: '100%',
  },
  statsContent: {
    padding: 28,
    alignItems: 'center',
  },
  statsLabel: {
    color: colors.text.muted,
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  minutesRow: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: `${colors.accent.teal}26`, // 15% opacity
    borderRadius: 16,
  },
  minutesLabel: {
    color: colors.accent.teal,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  statsDetail: {
    color: colors.text.secondary,
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
  quickCheckInSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  quickCheckInCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  quickCheckInBlur: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  quickCheckInPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickCheckInEmoji: {
    fontSize: 32,
  },
  quickCheckInText: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  quickCheckInChevron: {
    color: colors.text.muted,
    fontSize: 28,
    fontWeight: '300',
  },
  quickCheckInSelected: {
    gap: 10,
  },
  quickCheckInSelectedLabel: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  quickCheckInSelectedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface.secondary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 10,
    alignSelf: 'flex-start',
  },
  quickCheckInSelectedEmoji: {
    fontSize: 24,
  },
  quickCheckInSelectedText: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  quickCheckInClear: {
    marginLeft: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCheckInClearText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  quickCheckInModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  quickCheckInModalContainer: {
    height: '60%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border.default,
  },
  quickCheckInModalHeader: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 12,
    alignItems: 'flex-end',
  },
  quickCheckInModalClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCheckInModalCloseText: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '300',
  },
  quickCheckInModalTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 26,
    letterSpacing: 0.3,
    paddingHorizontal: 24,
  },
  quickCheckInModalSliderWrapper: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickCheckInModalButtonWrapper: {
    paddingHorizontal: 32,
    paddingBottom: 32,
    paddingTop: 16,
  },
  quickCheckInModalSaveButton: {
    paddingVertical: 16,
    borderRadius: 24,
    alignItems: 'center',
    backgroundColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  quickCheckInModalSaveButtonText: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: colors.text.primary,
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
    borderColor: colors.border.subtle,
    padding: 32,
    alignItems: 'center',
  },
  minutesLabel: {
    color: colors.text.muted,
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  minutesNumber: {
    color: colors.accent.teal,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: -2,
  },
  minutesUnit: {
    color: colors.accent.teal,
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  minutesSubtext: {
    color: colors.text.secondary,
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
  settingsButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  settingsIcon: {
    fontSize: 24,
  },
  timerBellButton: {
    position: 'absolute',
    top: 60,
    right: 24,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  timerBellIcon: {
    fontSize: 24,
  },
  quickRoutineSection: {
    paddingTop: 32,
    paddingBottom: 20,
  },
  quickRoutineTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    paddingHorizontal: 24,
    marginBottom: 16,
    letterSpacing: 0.5,
  },
  quickRoutineScroll: {
    paddingHorizontal: 24,
    gap: 12,
  },
  quickRoutineCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    width: 120,
  },
  quickRoutineBlur: {
    paddingVertical: 20,
    paddingHorizontal: 16,
    alignItems: 'center',
    gap: 8,
  },
  quickRoutineEmoji: {
    fontSize: 36,
  },
  quickRoutineLabel: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  quickRoutineDuration: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
})
