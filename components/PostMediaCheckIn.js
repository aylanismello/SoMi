import { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import EmbodimentSlider from './EmbodimentSlider'

export default function PostMediaCheckIn({ navigation, route }) {
  const { initialValue } = route.params
  const [currentState, setCurrentState] = useState('check-in')
  const [sliderValue, setSliderValue] = useState(50)

  const handleSkip = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Return to main screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    })
  }

  const handleOK = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Move to feedback state
    setCurrentState('feedback')
  }

  const handleDone = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Return to main screen
    navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    })
  }

  // Calculate dummy percentage difference
  const calculatePercentage = () => {
    const difference = sliderValue - initialValue
    return Math.abs(Math.round(difference))
  }

  if (currentState === 'feedback') {
    return (
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.header}>Practice Complete</Text>

          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackText}>
              You are {calculatePercentage()}% more embodied
            </Text>
          </View>

          <TouchableOpacity
            style={styles.doneButton}
            onPress={handleDone}
            activeOpacity={0.7}
          >
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.header}>Practice Complete</Text>

        <EmbodimentSlider
          value={sliderValue}
          onValueChange={setSliderValue}
          question="how do you feel now?"
        />

        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkip}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.okButton}
            onPress={handleOK}
            activeOpacity={0.7}
          >
            <Text style={styles.okButtonText}>OK</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '300',
    textAlign: 'center',
    marginBottom: 80,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 30,
    marginTop: 80,
  },
  skipButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 8,
  },
  skipButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '400',
  },
  okButton: {
    paddingVertical: 15,
    paddingHorizontal: 40,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
  },
  okButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '400',
  },
  feedbackContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 100,
  },
  feedbackText: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 36,
  },
  doneButton: {
    alignSelf: 'center',
    paddingVertical: 15,
    paddingHorizontal: 60,
    backgroundColor: '#ff6b6b',
    borderRadius: 8,
  },
  doneButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '400',
  },
})
