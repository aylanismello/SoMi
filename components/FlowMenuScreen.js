import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { useCallback } from 'react'
import { useFocusEffect } from '@react-navigation/native'
import { supabase } from '../supabase'
import { getRoutineConfig } from '../services/routineConfig'
import { useRoutineStore } from '../stores/routineStore'
import { useLatestChain } from '../hooks/useSupabaseQueries'

export default function FlowMenuScreen({ navigation }) {
  // Check if daily flow was completed today
  const { data: latestChain, refetch } = useLatestChain()

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch()
    }, [refetch])
  )

  // Check if the latest chain was created today and has both check-ins
  const isDailyFlowComplete = () => {
    if (!latestChain) return false

    const chainDate = new Date(latestChain.created_at)
    const today = new Date()

    // Check if chain is from today
    const isToday = chainDate.getDate() === today.getDate() &&
                    chainDate.getMonth() === today.getMonth() &&
                    chainDate.getFullYear() === today.getFullYear()

    if (!isToday) return false

    // Check if it has at least 2 check-ins (start and end)
    const hasCheckIns = latestChain.embodiment_checks && latestChain.embodiment_checks.length >= 2

    return hasCheckIns
  }

  const isComplete = isDailyFlowComplete()

  const handleDailyFlow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Navigate to SoMiCheckIn with flag indicating it's the daily flow (check-ins mandatory)
    navigation.navigate('SoMiCheckIn', { isDailyFlow: true })
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

    // Initialize routine in store
    useRoutineStore.getState().initializeRoutine({
      totalBlocks: blockCount,
      routineType: routineType,
      savedInitialValue: 50,
      savedInitialState: 4,
      customQueue: customQueue,
      isQuickRoutine: true,
    })

    // Navigate directly to routine
    navigation.navigate('SoMiRoutine')
  }

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Flow</Text>
        <Text style={styles.headerSubtitle}>choose your practice</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Daily SoMi Flow - Featured */}
        <TouchableOpacity
          onPress={handleDailyFlow}
          activeOpacity={0.85}
          style={styles.dailyFlowCard}
        >
          <BlurView intensity={20} tint="dark" style={styles.dailyFlowBlur}>
            <View style={styles.dailyFlowHeader}>
              <View style={styles.dailyFlowTextContainer}>
                <Text style={styles.dailyFlowTitle}>Daily SoMi Flow</Text>
                <Text style={styles.dailyFlowSubtitle}>
                  complete practice with check-ins
                </Text>
              </View>

              <View style={[
                styles.completionBadge,
                isComplete && styles.completionBadgeComplete
              ]}>
                {isComplete ? (
                  <Text style={styles.completionCheckmark}>✓</Text>
                ) : (
                  <Text style={styles.completionCircle}>○</Text>
                )}
              </View>
            </View>

            <View style={styles.dailyFlowFooter}>
              <Text style={styles.dailyFlowFooterText}>
                {isComplete ? 'completed today' : 'start your practice'}
              </Text>
            </View>
          </BlurView>
        </TouchableOpacity>

        {/* Morning Routines */}
        <Text style={styles.sectionTitle}>morning routines</Text>
        <View style={styles.routineGrid}>
          <TouchableOpacity
            onPress={() => handleQuickRoutine('morning', 2)}
            activeOpacity={0.85}
            style={styles.routineCard}
          >
            <BlurView intensity={15} tint="dark" style={styles.routineBlur}>
              <Text style={styles.routineEmoji}>☀️</Text>
              <Text style={styles.routineLabel}>Morning</Text>
              <Text style={styles.routineDuration}>5 min</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleQuickRoutine('morning', 6)}
            activeOpacity={0.85}
            style={styles.routineCard}
          >
            <BlurView intensity={15} tint="dark" style={styles.routineBlur}>
              <Text style={styles.routineEmoji}>☀️</Text>
              <Text style={styles.routineLabel}>Morning</Text>
              <Text style={styles.routineDuration}>10 min</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleQuickRoutine('morning', 10)}
            activeOpacity={0.85}
            style={styles.routineCard}
          >
            <BlurView intensity={15} tint="dark" style={styles.routineBlur}>
              <Text style={styles.routineEmoji}>☀️</Text>
              <Text style={styles.routineLabel}>Morning</Text>
              <Text style={styles.routineDuration}>15 min</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Night Routines */}
        <Text style={styles.sectionTitle}>night routines</Text>
        <View style={styles.routineGrid}>
          <TouchableOpacity
            onPress={() => handleQuickRoutine('night', 2)}
            activeOpacity={0.85}
            style={styles.routineCard}
          >
            <BlurView intensity={15} tint="dark" style={styles.routineBlur}>
              <Text style={styles.routineEmoji}>🌙</Text>
              <Text style={styles.routineLabel}>Night</Text>
              <Text style={styles.routineDuration}>5 min</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleQuickRoutine('night', 6)}
            activeOpacity={0.85}
            style={styles.routineCard}
          >
            <BlurView intensity={15} tint="dark" style={styles.routineBlur}>
              <Text style={styles.routineEmoji}>🌙</Text>
              <Text style={styles.routineLabel}>Night</Text>
              <Text style={styles.routineDuration}>10 min</Text>
            </BlurView>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => handleQuickRoutine('night', 10)}
            activeOpacity={0.85}
            style={styles.routineCard}
          >
            <BlurView intensity={15} tint="dark" style={styles.routineBlur}>
              <Text style={styles.routineEmoji}>🌙</Text>
              <Text style={styles.routineLabel}>Night</Text>
              <Text style={styles.routineDuration}>15 min</Text>
            </BlurView>
          </TouchableOpacity>
        </View>

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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 100,
  },
  dailyFlowCard: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
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
  completionBadge: {
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
  completionBadgeComplete: {
    backgroundColor: colors.accent.primary + '33',
    borderColor: colors.accent.primary,
  },
  completionCheckmark: {
    color: colors.accent.primary,
    fontSize: 28,
    fontWeight: '700',
  },
  completionCircle: {
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
  sectionTitle: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  routineGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 32,
  },
  routineCard: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  routineBlur: {
    paddingVertical: 24,
    paddingHorizontal: 12,
    alignItems: 'center',
    gap: 8,
  },
  routineEmoji: {
    fontSize: 36,
  },
  routineLabel: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  routineDuration: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  bottomSpacer: {
    height: 40,
  },
})
