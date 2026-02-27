import { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, Modal, ScrollView } from 'react-native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useRoutineStore } from '../stores/routineStore'
import { useSettingsStore } from '../stores/settingsStore'
import { deriveStateFromDeltas } from '../constants/polyvagalStates'

// Polyvagal state emojis for the queue display (new 2D model)
const STATE_EMOJIS = {
  shutdown: '🌑',
  restful:  '🌦',
  wired:    '🌪',
  glowing:  '☀️',
  steady:   '⛅',
}

const SECTION_LABELS = {
  'warm-up': 'WARM UP',
  'main': 'MAIN',
  'integration': 'INTEGRATION',
}

function getSectionLabel(name) {
  return SECTION_LABELS[name] || name.toUpperCase()
}

export default function FlowProgressHeader() {
  // Use individual selectors for proper Zustand reactivity
  const currentCycle = useRoutineStore(state => state.currentCycle)
  const totalBlocks = useRoutineStore(state => state.totalBlocks)
  const hardcodedQueue = useRoutineStore(state => state.hardcodedQueue)
  const phase = useRoutineStore(state => state.phase)
  const remainingSeconds = useRoutineStore(state => state.remainingSeconds)
  const { bodyScanStart, bodyScanEnd } = useSettingsStore()
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

  const handleViewPlan = () => {
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
          <TouchableOpacity onPress={handleViewPlan} activeOpacity={0.7}>
            <Text style={styles.viewPlanText}>VIEW PLAN</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Plan Bottom Sheet */}
      <Modal
        visible={showPlanSheet}
        transparent={true}
        animationType="slide"
        onRequestClose={handleClosePlan}
      >
        <View style={styles.sheetOverlay}>
          {/* Tap-to-dismiss: fills space above the sheet */}
          <TouchableOpacity
            style={styles.sheetDismissArea}
            activeOpacity={1}
            onPress={handleClosePlan}
          />
          <View style={styles.sheetContainer}>
            <BlurView intensity={40} tint="dark" style={styles.sheetBlur}>
              {/* Handle */}
              <View style={styles.sheetHandle} />

              <Text style={styles.sheetTitle}>Your Plan</Text>
              <Text style={styles.sheetSubtitle}>
                {displayCompleted} of {totalBlocks} completed
              </Text>

              <ScrollView
                style={styles.sheetScroll}
                showsVerticalScrollIndicator={false}
              >
                {(() => {
                  // Group queue into sections if section metadata is present
                  const hasSections = hardcodedQueue.length > 0 && hardcodedQueue[0].section
                  const renderBlock = (block, globalIndex) => {
                    const isCompleted = globalIndex < displayCompleted
                    const isCurrent = globalIndex === displayCompleted
                    const derivedState = deriveStateFromDeltas(block.energy_delta, block.safety_delta)
                    const stateEmoji = STATE_EMOJIS[derivedState?.name] || ''
                    return (
                      <View
                        key={`${block.somi_block_id}-${globalIndex}`}
                        style={[
                          styles.planItem,
                          isCurrent && styles.planItemCurrent,
                          isCompleted && styles.planItemCompleted,
                        ]}
                      >
                        <View style={styles.planItemNumber}>
                          <Text style={[
                            styles.planItemNumberText,
                            isCompleted && styles.planItemNumberTextCompleted,
                            isCurrent && styles.planItemNumberTextCurrent,
                          ]}>
                            {isCompleted ? '✓' : globalIndex + 1}
                          </Text>
                        </View>
                        <Text style={[
                          styles.planItemName,
                          isCompleted && styles.planItemNameCompleted,
                          isCurrent && styles.planItemNameCurrent,
                        ]}>
                          {block.name}
                        </Text>
                        {stateEmoji ? (
                          <Text style={styles.planItemEmoji}>{stateEmoji}</Text>
                        ) : null}
                      </View>
                    )
                  }

                  const renderBodyScanItem = () => (
                    <View style={[styles.planItem, styles.bodyScanItem]}>
                      <View style={[styles.planItemNumber, styles.bodyScanNumber]}>
                        <Text style={styles.bodyScanNumberText}>~</Text>
                      </View>
                      <Text style={styles.bodyScanItemName}>Body Scan</Text>
                      <Text style={styles.lockEmoji}>🔒</Text>
                    </View>
                  )

                  if (hasSections) {
                    // Build section groups
                    const groups = []
                    let currentName = null
                    hardcodedQueue.forEach((block, i) => {
                      const name = block.section || 'main'
                      if (name !== currentName) {
                        currentName = name
                        groups.push({ name, items: [] })
                      }
                      groups[groups.length - 1].items.push({ block, globalIndex: i })
                    })

                    return groups.map((group, groupIdx) => (
                      <View key={group.name}>
                        <Text style={styles.sectionHeader}>{getSectionLabel(group.name)}</Text>
                        {groupIdx === 0 && bodyScanStart && renderBodyScanItem()}
                        {group.items.map(({ block, globalIndex }) => renderBlock(block, globalIndex))}
                        {groupIdx === groups.length - 1 && bodyScanEnd && renderBodyScanItem()}
                      </View>
                    ))
                  }

                  // Flat list fallback (hardcoded path — no section metadata)
                  return (
                    <>
                      {bodyScanStart && renderBodyScanItem()}
                      {hardcodedQueue.map((block, index) => renderBlock(block, index))}
                      {bodyScanEnd && renderBodyScanItem()}
                    </>
                  )
                })()}
              </ScrollView>

              <TouchableOpacity
                onPress={handleClosePlan}
                style={styles.sheetCloseButton}
                activeOpacity={0.7}
              >
                <Text style={styles.sheetCloseText}>Close</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      </Modal>
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
  viewPlanText: {
    color: colors.accent.primary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    flexDirection: 'column',
  },
  sheetDismissArea: {
    flex: 1, // fills all space above the sheet
  },
  sheetContainer: {
    maxHeight: '70%',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: 'hidden',
  },
  sheetBlur: {
    paddingTop: 12,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  sheetTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sheetSubtitle: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 20,
  },
  sheetScroll: {
    maxHeight: 400,
  },
  sectionHeader: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 12,
  },
  planItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 4,
    gap: 12,
  },
  planItemCurrent: {
    backgroundColor: 'rgba(0, 217, 163, 0.12)',
    borderWidth: 1,
    borderColor: colors.accent.primary,
  },
  planItemCompleted: {
    opacity: 0.5,
  },
  planItemNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planItemNumberText: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '600',
  },
  planItemNumberTextCompleted: {
    color: colors.accent.primary,
  },
  planItemNumberTextCurrent: {
    color: colors.accent.primary,
    fontWeight: '700',
  },
  planItemName: {
    flex: 1,
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '500',
  },
  planItemNameCompleted: {
    textDecorationLine: 'line-through',
    color: colors.text.muted,
  },
  planItemNameCurrent: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
  planItemEmoji: {
    fontSize: 16,
  },
  bodyScanItem: {
    opacity: 0.6,
  },
  bodyScanNumber: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  bodyScanNumberText: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '600',
  },
  bodyScanItemName: {
    flex: 1,
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  lockEmoji: {
    fontSize: 14,
  },
  sheetCloseButton: {
    marginTop: 16,
    paddingVertical: 14,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
  },
  sheetCloseText: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '600',
  },
})
