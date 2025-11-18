import { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import * as Haptics from 'expo-haptics'
import { getMediaForSliderValue, getSOSMedia } from '../constants/media'
import EmbodimentSlider from './EmbodimentSlider'

export default function MainScreen({ navigation }) {
  const [sliderValue, setSliderValue] = useState(50)

  const handleSOSPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleSOSRelease = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    const sosMedia = await getSOSMedia()
    navigation.navigate('Player', { media: sosMedia, initialValue: sliderValue })
  }

  const handleSoMiTimePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleSoMiTimeRelease = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    const media = await getMediaForSliderValue(sliderValue)
    navigation.navigate('Player', { media, initialValue: sliderValue })
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <EmbodimentSlider
          value={sliderValue}
          onValueChange={setSliderValue}
          question={"how in your body\ndo you feel right now?"}
        />
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
