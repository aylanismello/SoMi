import { StyleSheet, Text, View } from 'react-native'
import Slider from '@react-native-community/slider'

// Polyvagal state labels (embodiment-focused, neutral/positive)
const STATE_LABELS = [
  { range: [0, 20], label: 'Withdrawn' },      // Dorsal Vagal - Shutdown
  { range: [20, 40], label: 'Stirring' },      // Dorsal → Sympathetic transition
  { range: [40, 60], label: 'Activated' },     // Sympathetic - Fight/Flight
  { range: [60, 80], label: 'Settling' },      // Sympathetic → Ventral transition
  { range: [80, 100], label: 'Connected' },    // Ventral Vagal - Social Engagement
]

export default function EmbodimentSlider({
  value,
  onValueChange,
  showLabels = true,
  showStateLabel = true,
  question = null,
}) {
  // Get current state label based on slider value
  const getCurrentLabel = () => {
    const currentState = STATE_LABELS.find(state =>
      value >= state.range[0] && value < state.range[1]
    )
    return currentState ? currentState.label : STATE_LABELS[STATE_LABELS.length - 1].label
  }

  return (
    <View style={styles.container}>
      {question && (
        <Text style={styles.question}>
          {question}
        </Text>
      )}

      {showStateLabel && (
        <View style={styles.stateLabelContainer}>
          <Text style={styles.stateLabel}>
            {getCurrentLabel()}
          </Text>
        </View>
      )}

      <View style={styles.sliderWrapper}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor="#ffffff"
          maximumTrackTintColor="#ffffff"
          thumbTintColor="#ffffff"
        />
      </View>

      {showLabels && (
        <View style={styles.labelsContainer}>
          <Text style={styles.label}>0%</Text>
          <Text style={styles.label}>100%</Text>
        </View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  question: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '400',
    marginBottom: 60,
    textAlign: 'left',
    lineHeight: 36,
  },
  sliderWrapper: {
    paddingHorizontal: 10,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  label: {
    color: '#ffffff',
    fontSize: 32,
    fontWeight: '400',
  },
  stateLabelContainer: {
    height: 40,
    marginBottom: 15,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  stateLabel: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '300',
  },
})
