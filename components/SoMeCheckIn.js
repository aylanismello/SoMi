import { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { MEDIA, getMediaForSliderValue } from '../constants/media'
import EmbodimentSlider from './EmbodimentSlider'
import { supabase } from '../supabase'

export default function SoMeCheckIn({ navigation }) {
  const [sliderValue, setSliderValue] = useState(50)

  const saveEmbodimentCheck = async (value) => {
    try {
      const { data, error } = await supabase
        .from('embodiment_checks')
        .insert({
          slider_value: Math.round(value),
        })

      if (error) {
        console.error('Error saving embodiment check:', error)
      } else {
        console.log('Embodiment check saved:', data)
      }
    } catch (err) {
      console.error('Unexpected error:', err)
    }
  }

  const handleSOSPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
  }

  const handleSOSRelease = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)
    navigation.navigate('Player', { media: MEDIA.SOS, initialValue: sliderValue })
  }

  const handleSoMiTimePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleSoMiTimeRelease = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    // Save to Supabase
    saveEmbodimentCheck(sliderValue)

    const media = getMediaForSliderValue(sliderValue)
    navigation.navigate('Player', { media, initialValue: sliderValue })
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Return to Yourself</Text>
        <Text style={styles.subtitle}>Check in with your body</Text>
      </View>

      <BlurView intensity={20} tint="dark" style={styles.card}>
        <View style={styles.cardContent}>
          <EmbodimentSlider
            value={sliderValue}
            onValueChange={setSliderValue}
            question={"how in your body\ndo you feel right now?"}
          />
        </View>
      </BlurView>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          onPressIn={handleSoMiTimePress}
          onPressOut={handleSoMiTimeRelease}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#4ecdc4', '#44a08d']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.regulateButton}
          >
            <Text style={styles.regulateText}>Regulate</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          onPressIn={handleSOSPress}
          onPressOut={handleSOSRelease}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={['#ff6b9d', '#ffa8b3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sosButton}
          >
            <Text style={styles.sosText}>SOS</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 70,
    paddingBottom: 50,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 40,
  },
  greeting: {
    color: '#f7f9fb',
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 16,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 40,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    padding: 28,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    marginTop: 20,
  },
  regulateButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4ecdc4',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  regulateText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  sosButton: {
    width: 140,
    height: 140,
    borderRadius: 70,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b9d',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
  sosText: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
})
