import { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import Slider from '@react-native-community/slider'
import * as Haptics from 'expo-haptics'
import { MEDIA, getMediaForSliderValue } from '../constants/media'

// Polyvagal state labels (embodiment-focused, neutral/positive)
const STATE_LABELS = [
  { range: [0, 20], label: 'Withdrawn' },      // Dorsal Vagal - Shutdown
  { range: [20, 40], label: 'Stirring' },      // Dorsal → Sympathetic transition
  { range: [40, 60], label: 'Activated' },     // Sympathetic - Fight/Flight
  { range: [60, 80], label: 'Settling' },      // Sympathetic → Ventral transition
  { range: [80, 100], label: 'Connected' },    // Ventral Vagal - Social Engagement
]

export default function MainScreen({ navigation }) {
  const [sliderValue, setSliderValue] = useState(50)

  // Get current state label based on slider value
  const getCurrentLabel = () => {
    const currentState = STATE_LABELS.find(state =>
      sliderValue >= state.range[0] && sliderValue < state.range[1]
    )
    return currentState ? currentState.label : STATE_LABELS[STATE_LABELS.length - 1].label
  }

  const handleSOSPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleSOSRelease = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    navigation.navigate('Player', { media: MEDIA.SOS })
  }

  const handleSoMiTimePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleSoMiTimeRelease = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const media = getMediaForSliderValue(sliderValue)
    navigation.navigate('Player', { media })
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.question}>
          how in your body{'\n'}do you feel right now?
        </Text>

        <View style={styles.sliderContainer}>
          <View style={styles.stateLabelContainer}>
            <Text style={styles.stateLabel}>
              {getCurrentLabel()}
            </Text>
          </View>

          <View style={styles.sliderWrapper}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={100}
              value={sliderValue}
              onValueChange={setSliderValue}
              minimumTrackTintColor="#ffffff"
              maximumTrackTintColor="#ffffff"
              thumbTintColor="#ffffff"
            />
          </View>

          <View style={styles.labelsContainer}>
            <Text style={styles.label}>0%</Text>
            <Text style={styles.label}>100%</Text>
          </View>
        </View>
      </View>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.somiTimeButton}
          onPressIn={handleSoMiTimePress}
          onPressOut={handleSoMiTimeRelease}
          activeOpacity={0.7}
        >
          <Text style={styles.somiTimeText}>regulate</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.sosButton}
          onPressIn={handleSOSPress}
          onPressOut={handleSOSRelease}
          activeOpacity={0.7}
        >
          <Text style={styles.sosText}>sos</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 60,
    paddingBottom: 80,
    paddingHorizontal: 30,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  question: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '400',
    marginBottom: 60,
    textAlign: 'left',
    lineHeight: 36,
  },
  sliderContainer: {
    width: '100%',
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
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    marginTop: 40,
  },
  somiTimeButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#4a90e2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  somiTimeText: {
    color: '#4a90e2',
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 24,
  },
  sosButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: '#ff6b6b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sosText: {
    color: '#ff6b6b',
    fontSize: 24,
    fontWeight: '400',
  },
})
