import { useState, useCallback, useRef } from 'react'
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, Modal, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Svg, { Circle } from 'react-native-svg'
import { api } from '../services/api'
import { useFocusEffect } from '@react-navigation/native'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import SettingsModal from './SettingsModal'
import EmbodimentSlider from './EmbodimentSlider'
import { useSettingsStore } from '../stores/settingsStore'
import { useRoutineStore } from '../stores/routineStore'
import { useLatestChain, useLatestDailyFlow, useSaveEmbodimentCheck } from '../hooks/useSupabaseQueries'

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
  // Animated scroll value for header fade effect
  const scrollY = useRef(new Animated.Value(0)).current
  const scrollViewRef = useRef(null)

  // Use React Query for latest chain data
  const { data: latestChain, isLoading: loading, refetch } = useLatestChain()

  // Use React Query for latest daily flow (for completion check)
  const { data: latestDailyFlow, refetch: refetchDailyFlow } = useLatestDailyFlow()

  // Mutation for saving quick check-ins
  const saveEmbodimentCheck = useSaveEmbodimentCheck()

  // Fetch data and scroll to top when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch()
      refetchDailyFlow()
      // Scroll to top when tab is focused
      scrollViewRef.current?.scrollTo({ y: 0, animated: false })
    }, [refetch, refetchDailyFlow])
  )

  // Interpolate scroll position to opacity for header fade effect
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

  const backgroundOpacity = scrollY.interpolate({
    inputRange: [0, 150],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  })

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

  // Check if daily flow was completed today
  const isDailyFlowComplete = () => {
    if (!latestDailyFlow) return false

    const chainDate = new Date(latestDailyFlow.created_at)
    const today = new Date()

    // Check if chain is from today
    const isToday = chainDate.getDate() === today.getDate() &&
                    chainDate.getMonth() === today.getMonth() &&
                    chainDate.getFullYear() === today.getFullYear()

    if (!isToday) return false

    // Check if it has at least 2 check-ins (start and end)
    const hasCheckIns = latestDailyFlow.embodiment_checks && latestDailyFlow.embodiment_checks.length >= 2

    return hasCheckIns
  }

  // Get time-based greeting
  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour >= 0 && hour < 5) return 'Hey there, night owl'
    if (hour >= 5 && hour < 12) return 'Good morning'
    if (hour >= 12 && hour < 18) return 'Good afternoons'
    return 'Good evenings'
  }

  const chainStats = getChainStats()

  // Get the most recent embodiment check from database (from any source: quick check-in or Daily Flow)
  const getLastCheckIn = () => {
    if (!latestChain?.embodiment_checks || latestChain.embodiment_checks.length === 0) {
      return { state: null, sliderValue: null }
    }

    const lastCheck = latestChain.embodiment_checks[latestChain.embodiment_checks.length - 1]
    return {
      state: lastCheck.polyvagal_state_code,
      sliderValue: lastCheck.slider_value
    }
  }

  const lastCheckIn = getLastCheckIn()
  const lastQuickCheckInState = lastCheckIn.state
  const lastQuickCheckInSliderValue = lastCheckIn.sliderValue

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

    // Save embodiment check using React Query mutation
    saveEmbodimentCheck.mutate({
      sliderValue: quickSliderValue,
      polyvagalStateCode: quickPolyvagalState,
      journalEntry: null,
    }, {
      onSuccess: () => {
        // Refetch latest chain to update the UI with the new check-in
        refetch()
      }
    })

    setShowQuickCheckInModal(false)
  }

  const handleClearQuickCheckIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    // Note: This doesn't actually delete from database, just a UI placeholder
    // To truly clear, we'd need a delete API endpoint
    // For now, this button can be hidden or removed
  }

  // MEDITATION TIMER FEATURE ARCHIVED - see /archived-features/
  // const handleOpenTimer = () => {
  //   Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
  //   navigation.navigate('MeditationTimerSetup')
  // }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowSettingsModal(true)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)
  }

  const handleQuickRoutine = async (routineType, blockCount) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    try {
      // Generate routine via API
      const { queue } = await api.generateRoutine(routineType, blockCount)

      if (!queue || queue.length === 0) {
        console.error('Failed to generate routine')
        return
      }

      // Initialize routine in store
      useRoutineStore.getState().initializeRoutine({
        totalBlocks: blockCount,
        routineType: routineType,
        savedInitialValue: 50,
        savedInitialState: 4,
        customQueue: queue,
        isQuickRoutine: true,
        flowType: 'quick_routine',
      })

      // Navigate directly to routine
      navigation.navigate('Flow', {
        screen: 'SoMiRoutine',
      })
    } catch (error) {
      console.error('Error generating routine:', error)
    }
  }

  return (
    <View style={styles.container}>
      {/* Background Image - Hero Section */}
      <Animated.Image
        source={{ uri: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/home%20screen%20backgrounds/water_1.jpg' }}
        style={[styles.heroImage, { opacity: backgroundOpacity }]}
        resizeMode="cover"
      />

      {/* Gradient overlay for better text readability */}
      <Animated.View style={{ opacity: backgroundOpacity }}>
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.3)', colors.background.primary]}
          locations={[0, 0.5, 1]}
          style={styles.heroGradient}
        />
      </Animated.View>

      {/* Header Row - Settings, Logo, (Future: Notifications) */}
      <Animated.View style={[styles.headerRow, { opacity: headerOpacity }]}>
        <TouchableOpacity
          onPress={handleOpenSettings}
          style={styles.headerIconButton}
          activeOpacity={0.7}
        >
          <Text style={styles.headerIcon}>🎵</Text>
        </TouchableOpacity>

        <Text style={styles.headerLogoText}>SoMi</Text>

        {/* Placeholder for future notification icon */}
        <View style={styles.headerIconButton} />
      </Animated.View>

      <Animated.ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
        scrollEventThrottle={16}
      >

        {/* Welcome section */}
        <View style={styles.welcomeSection}>
          <Text style={styles.greetingText}>Hi Aylan, {getGreeting().toLowerCase()}</Text>
        </View>

        {/* Daily SoMi Flow Card */}
        <View style={styles.dailyFlowSection}>
          <TouchableOpacity
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
              navigation.navigate('Flow')
            }}
            activeOpacity={0.85}
            style={styles.dailyFlowCard}
          >
            <BlurView intensity={20} tint="dark" style={styles.dailyFlowBlur}>
              <View style={styles.dailyFlowHeader}>
                <View style={styles.dailyFlowTextContainer}>
                  <Text style={styles.dailyFlowTitle}>My Daily Flow</Text>
                  <Text style={styles.dailyFlowSubtitle}>
                    complete practice with check-ins
                  </Text>
                </View>

                <View style={[
                  styles.dailyFlowCompletionBadge,
                  chainStats && isDailyFlowComplete() && styles.dailyFlowCompletionBadgeComplete
                ]}>
                  {chainStats && isDailyFlowComplete() ? (
                    <Text style={styles.dailyFlowCompletionCheckmark}>✓</Text>
                  ) : (
                    <Text style={styles.dailyFlowCompletionCircle}>○</Text>
                  )}
                </View>
              </View>

              <View style={styles.dailyFlowFooter}>
                <Text style={styles.dailyFlowFooterText}>
                  {chainStats && isDailyFlowComplete() ? 'completed today' : 'start your practice'}
                </Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* MVP: Quick Check-In hidden for now
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
                  <View style={styles.quickCheckInRow}>
                    <View style={styles.quickCheckInSelectedBadge}>
                      <Text style={styles.quickCheckInSelectedEmoji}>
                        {POLYVAGAL_STATES[lastQuickCheckInState]?.emoji}
                      </Text>
                      <Text style={styles.quickCheckInSelectedText}>
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

                    {lastQuickCheckInSliderValue !== null && (
                      <View style={styles.embodimentCircleContainer}>
                        <Svg width={50} height={50}>
                          <Circle
                            cx={25}
                            cy={25}
                            r={22}
                            stroke="rgba(255, 255, 255, 0.15)"
                            strokeWidth={3}
                            fill="none"
                          />
                          <Circle
                            cx={25}
                            cy={25}
                            r={22}
                            stroke={POLYVAGAL_STATES[lastQuickCheckInState]?.color || colors.accent.teal}
                            strokeWidth={3}
                            fill="none"
                            strokeDasharray={`${(lastQuickCheckInSliderValue / 100) * 138.23} 138.23`}
                            strokeLinecap="round"
                            transform="rotate(-90 25 25)"
                          />
                        </Svg>
                      </View>
                    )}
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
        */}

        {/* MVP: Quick Check-In Modal hidden
        <Modal
          visible={showQuickCheckInModal}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowQuickCheckInModal(false)}
        >
          <View style={styles.quickCheckInModalOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.quickCheckInModalContainer}>
              <View style={styles.quickCheckInModalHeader}>
                <TouchableOpacity
                  onPress={() => setShowQuickCheckInModal(false)}
                  style={styles.quickCheckInModalClose}
                >
                  <Text style={styles.quickCheckInModalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.quickCheckInModalTitle}>
                {quickPolyvagalState ? 'how present are those\nfeelings in the body?' : 'how do you feel\nright now?'}
              </Text>

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
        */}

      </Animated.ScrollView>

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
  welcomeSection: {
    paddingHorizontal: 24,
    paddingTop: 220,
    paddingBottom: 20,
  },
  welcomeContent: {
    alignItems: 'center',
    width: '100%',
  },
  greetingText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 20,
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
  quickCheckInRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  embodimentCircleContainer: {
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
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
    color: colors.text.primary,
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
  headerRow: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    zIndex: 10,
  },
  headerIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerIcon: {
    fontSize: 24,
  },
  headerLogoText: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 2,
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
  dailyFlowSection: {
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 20,
  },
  dailyFlowCard: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.accent.primary,
  },
  dailyFlowBlur: {
    padding: 24,
  },
  dailyFlowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  dailyFlowTextContainer: {
    flex: 1,
  },
  dailyFlowTitle: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  dailyFlowSubtitle: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  dailyFlowCompletionBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 2,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 16,
  },
  dailyFlowCompletionBadgeComplete: {
    backgroundColor: colors.accent.primary + '33',
    borderColor: colors.accent.primary,
  },
  dailyFlowCompletionCheckmark: {
    color: colors.accent.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  dailyFlowCompletionCircle: {
    color: colors.text.muted,
    fontSize: 32,
    fontWeight: '300',
  },
  dailyFlowFooter: {
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.border.subtle,
  },
  dailyFlowFooterText: {
    color: colors.accent.primary,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
    textAlign: 'center',
  },
})
