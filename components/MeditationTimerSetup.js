import { useState } from 'react'
import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'

const INTERVAL_OPTIONS = [
  { id: 'none', label: 'No Interval Bell', value: null },
  { id: '1min', label: 'Every Minute', value: 60 },
  { id: '2min', label: 'Every 2 Minutes', value: 120 },
  { id: '5min', label: 'Every 5 Minutes', value: 300 },
  { id: '10min', label: 'Every 10 Minutes', value: 600 },
  { id: '15min', label: 'Every 15 Minutes', value: 900 },
  { id: 'halfway', label: 'Halfway', value: 'halfway' },
]

export default function MeditationTimerSetup({ navigation }) {
  const [selectedMinutes, setSelectedMinutes] = useState(10)
  const [selectedInterval, setSelectedInterval] = useState('halfway')

  const handleMinutesChange = (minutes) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedMinutes(minutes)
  }

  const handleIntervalSelect = (intervalValue) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedInterval(intervalValue)
  }

  const handleBegin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    navigation.navigate('MeditationTimerActive', {
      totalMinutes: selectedMinutes,
      intervalSetting: selectedInterval,
    })
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Minutes Display */}
        <View style={styles.minutesDisplay}>
          <TouchableOpacity
            onPress={() => handleMinutesChange(Math.max(1, selectedMinutes - 1))}
            style={styles.minutesButton}
            activeOpacity={0.7}
          >
            <Text style={styles.minutesButtonText}>−</Text>
          </TouchableOpacity>

          <View style={styles.minutesCenter}>
            <Text style={styles.minutesNumber}>{selectedMinutes}</Text>
          </View>

          <TouchableOpacity
            onPress={() => handleMinutesChange(Math.min(60, selectedMinutes + 1))}
            style={styles.minutesButton}
            activeOpacity={0.7}
          >
            <Text style={styles.minutesButtonText}>+</Text>
          </TouchableOpacity>
        </View>

        {/* Interval Selection */}
        <View style={styles.intervalSection}>
          <TouchableOpacity
            onPress={() => navigation.navigate('IntervalTimeSelector', {
              currentInterval: selectedInterval,
              onSelect: setSelectedInterval,
            })}
            activeOpacity={0.85}
            style={styles.intervalSelector}
          >
            <BlurView intensity={15} tint="dark" style={styles.intervalBlur}>
              <Text style={styles.intervalLabel}>Interval</Text>
              <View style={styles.intervalValueRow}>
                <Text style={styles.intervalValue}>
                  {INTERVAL_OPTIONS.find(opt => opt.value === selectedInterval)?.label || 'Halfway'}
                </Text>
                <Text style={styles.intervalChevron}>›</Text>
              </View>
            </BlurView>
          </TouchableOpacity>
        </View>

        {/* Timer finish info */}
        <Text style={styles.finishText}>
          Timer finishes at {getFinishTime(selectedMinutes)}
        </Text>
      </ScrollView>

      {/* Begin Button */}
      <View style={styles.bottomSection}>
        <TouchableOpacity
          onPress={handleBegin}
          style={styles.beginButton}
          activeOpacity={0.8}
        >
          <Text style={styles.beginButtonText}>Begin</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

function getFinishTime(minutes) {
  const now = new Date()
  const finish = new Date(now.getTime() + minutes * 60000)
  const hours = finish.getHours()
  const mins = finish.getMinutes()
  const ampm = hours >= 12 ? 'PM' : 'AM'
  const displayHours = hours % 12 || 12
  return `${displayHours}:${mins.toString().padStart(2, '0')} ${ampm}`
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    alignItems: 'flex-start',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '300',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  minutesDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
    gap: 40,
  },
  minutesButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  minutesButtonText: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '300',
  },
  minutesCenter: {
    alignItems: 'center',
  },
  minutesNumber: {
    color: colors.text.primary,
    fontSize: 96,
    fontWeight: '700',
    letterSpacing: -4,
  },
  intervalSection: {
    marginBottom: 40,
  },
  intervalSelector: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  intervalBlur: {
    paddingVertical: 20,
    paddingHorizontal: 24,
  },
  intervalLabel: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  intervalValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  intervalValue: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  intervalChevron: {
    color: colors.text.muted,
    fontSize: 28,
    fontWeight: '300',
  },
  finishText: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
  },
  beginButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  beginButtonText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
