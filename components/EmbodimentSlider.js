import { StyleSheet, Text, View } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import Slider from '@react-native-community/slider'

// Polyvagal state labels (embodiment-focused, neutral/positive)
const STATE_LABELS = [
  { range: [0, 20], label: 'Withdrawn', color: '#7b68ee' },      // Dorsal Vagal - Shutdown
  { range: [20, 40], label: 'Stirring', color: '#9d7be8' },      // Dorsal → Sympathetic transition
  { range: [40, 60], label: 'Activated', color: '#b88ddc' },     // Sympathetic - Fight/Flight
  { range: [60, 80], label: 'Settling', color: '#68c9ba' },      // Sympathetic → Ventral transition
  { range: [80, 100], label: 'Connected', color: '#4ecdc4' },    // Ventral Vagal - Social Engagement
]

export default function EmbodimentSlider({
  value,
  onValueChange,
  showLabels = true,
  showStateLabel = true,
  question = null,
}) {
  // Get current state label and color based on slider value
  const getCurrentState = () => {
    const currentState = STATE_LABELS.find(state =>
      value >= state.range[0] && value < state.range[1]
    )
    return currentState || STATE_LABELS[STATE_LABELS.length - 1]
  }

  const currentState = getCurrentState()

  return (
    <View style={styles.container}>
      {question && (
        <Text style={styles.question}>
          {question}
        </Text>
      )}

      {showStateLabel && (
        <View style={styles.stateLabelContainer}>
          <View style={[styles.stateLabelBadge, { backgroundColor: currentState.color + '30' }]}>
            <View style={[styles.stateIndicator, { backgroundColor: currentState.color }]} />
            <Text style={[styles.stateLabel, { color: currentState.color }]}>
              {currentState.label}
            </Text>
          </View>
        </View>
      )}

      <View style={styles.sliderWrapper}>
        <LinearGradient
          colors={['#7b68ee', '#9d7be8', '#b88ddc', '#68c9ba', '#4ecdc4']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.gradientTrack}
        />
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={100}
          value={value}
          onValueChange={onValueChange}
          minimumTrackTintColor="transparent"
          maximumTrackTintColor="transparent"
          thumbTintColor="#ffffff"
        />
      </View>

      {showLabels && (
        <View style={styles.labelsContainer}>
          <Text style={styles.label}>Dysregulated</Text>
          <Text style={styles.label}>Regulated</Text>
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
    color: '#f7f9fb',
    fontSize: 26,
    fontWeight: '500',
    marginBottom: 50,
    textAlign: 'left',
    lineHeight: 34,
    letterSpacing: 0.3,
  },
  stateLabelContainer: {
    marginBottom: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateLabelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    gap: 10,
  },
  stateIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  stateLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  sliderWrapper: {
    position: 'relative',
    paddingHorizontal: 10,
    height: 40,
    justifyContent: 'center',
  },
  gradientTrack: {
    position: 'absolute',
    left: 10,
    right: 10,
    height: 6,
    borderRadius: 3,
    top: '50%',
    marginTop: -3,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  labelsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingHorizontal: 5,
  },
  label: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
})
