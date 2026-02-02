import { StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
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

export default function IntervalTimeSelector({ navigation, route }) {
  const { currentInterval, onSelect } = route.params || {}

  const handleSelect = (value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    if (onSelect) {
      onSelect(value)
    }
    navigation.goBack()
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
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Interval Time</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {INTERVAL_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => handleSelect(option.value)}
            style={styles.optionItem}
            activeOpacity={0.7}
          >
            <Text style={styles.optionLabel}>{option.label}</Text>
            {currentInterval === option.value && (
              <View style={styles.selectedIndicator}>
                <View style={styles.selectedDot} />
              </View>
            )}
          </TouchableOpacity>
        ))}
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    marginBottom: 20,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonText: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '300',
  },
  headerTitle: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  optionLabel: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent.primary,
  },
})
