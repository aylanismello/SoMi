import { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useRoutineStore } from '../stores/routineStore'
import FlowPlanSheet from './FlowPlanSheet'

export default function FlowProgressHeader() {
  // Use individual selectors for proper Zustand reactivity
  const currentCycle = useRoutineStore(state => state.currentCycle)
  const totalBlocks = useRoutineStore(state => state.totalBlocks)
  const segments = useRoutineStore(state => state.segments)
  const phase = useRoutineStore(state => state.phase)
  const remainingSeconds = useRoutineStore(state => state.remainingSeconds)

  // Derive body scan presence from segments array (source of truth)
  const bodyScanStart = segments.length > 0 && segments[0]?.type === 'body_scan'
  const bodyScanEnd = segments.length > 0 && segments[segments.length - 1]?.type === 'body_scan' && segments[segments.length - 1]?.section === 'integration'
  const [showPlanSheet, setShowPlanSheet] = useState(false)

  // Progress: blocks completed / total
  // During interstitial for cycle N, we've completed N-1 blocks
  // During video for cycle N, we're working on block N (count it as partially done)
  const completedBlocks = phase === 'video' ? currentCycle - 0.5 : Math.max(0, currentCycle - 1)
  const displayCompleted = Math.floor(completedBlocks)
  const progress = totalBlocks > 0 ? completedBlocks / totalBlocks : 0

  // Live time display from store (updated every second by SoMiRoutineScreen)
  const minutesLeft = remainingSeconds > 0
    ? Math.max(1, Math.ceil(remainingSeconds / 60))
    : Math.max(1, Math.ceil((Math.max(0, totalBlocks - displayCompleted) * 80) / 60))

  const handleViewFlow = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowPlanSheet(true)
  }

  const handleClosePlan = () => {
    setShowPlanSheet(false)
  }

  return (
    <>
      <View style={styles.container}>
        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
        </View>

        {/* Info row */}
        <View style={styles.infoRow}>
          <Text style={styles.timeText}>{minutesLeft} MIN LEFT</Text>
          <TouchableOpacity onPress={handleViewFlow} activeOpacity={0.7}>
            <Text style={styles.viewFlowText}>VIEW FLOW</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlowPlanSheet
        visible={showPlanSheet}
        onClose={handleClosePlan}
        queue={segments.filter(s => s.type === 'somi_block')}
        fullSegments={segments}
        title="Your Flow"
        subtitle={`${displayCompleted} of ${totalBlocks} completed`}
        completedIndex={displayCompleted}
        closeLabel="Close"
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
  },
  progressBarContainer: {
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.accent.primary,
    borderRadius: 1.5,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  timeText: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
  },
  viewFlowText: {
    color: colors.accent.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
})
