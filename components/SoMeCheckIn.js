import { useState } from 'react'
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { MEDIA, getMediaForSliderValue } from '../constants/media'

const BODY_SCAN_MEDIA = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/5%20Min.%20Body%20Scan%20Meditation_CW2%201.mp3',
  type: 'audio',
}
import EmbodimentSlider from './EmbodimentSlider'
import { supabase } from '../supabase'

// Polyvagal states for chip selection
const POLYVAGAL_STATES = [
  { id: 'withdrawn', label: 'Withdrawn', color: '#7b68ee' },
  { id: 'stirring', label: 'Stirring', color: '#9d7be8' },
  { id: 'activated', label: 'Activated', color: '#b88ddc' },
  { id: 'settling', label: 'Settling', color: '#68c9ba' },
  { id: 'connected', label: 'Connected', color: '#4ecdc4' },
]

export default function SoMeCheckIn({ navigation }) {
  const [sliderValue, setSliderValue] = useState(50)
  const [polyvagalState, setPolyvagalState] = useState(null)
  const [isChecked, setIsChecked] = useState(false)

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

  const handleStateSelect = (stateId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setPolyvagalState(stateId)
  }

  const handleCheckToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setIsChecked(!isChecked)
  }

  const handleBodyScanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
  }

  const handleBodyScanRelease = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    navigation.navigate('Player', { media: BODY_SCAN_MEDIA, initialValue: sliderValue })
  }

  return (
    <LinearGradient
      colors={['#0f0c29', '#302b63', '#24243e']}
      style={styles.container}
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Return to Yourself</Text>
        <Text style={styles.subtitle}>Check in with your body</Text>

        {/* Small SOS button in upper right */}
        <TouchableOpacity
          onPressIn={handleSOSPress}
          onPressOut={handleSOSRelease}
          activeOpacity={0.85}
          style={styles.sosButtonSmall}
        >
          <LinearGradient
            colors={['#ff6b9d', '#ffa8b3']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.sosButtonSmallGradient}
          >
            <Text style={styles.sosTextSmall}>SOS</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <BlurView intensity={20} tint="dark" style={styles.card}>
        <View style={styles.cardContent}>
          <EmbodimentSlider
            value={sliderValue}
            onValueChange={setSliderValue}
            question={"how in your body\ndo you feel right now?"}
            showStateLabel={false}
            showCheckButton={true}
            isChecked={isChecked}
            onCheckToggle={handleCheckToggle}
          />

          {/* Polyvagal state chips */}
          <View style={styles.stateChipsContainer}>
            {POLYVAGAL_STATES.map((state) => (
              <TouchableOpacity
                key={state.id}
                onPress={() => handleStateSelect(state.id)}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.stateChip,
                  polyvagalState === state.id && styles.stateChipSelected,
                  polyvagalState === state.id && { backgroundColor: state.color + '40' }
                ]}>
                  <Text style={[
                    styles.stateChipText,
                    polyvagalState === state.id && { color: state.color }
                  ]}>
                    {state.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Body scan button */}
          <TouchableOpacity
            onPressIn={handleBodyScanPress}
            onPressOut={handleBodyScanRelease}
            activeOpacity={0.8}
            style={styles.bodyScanButton}
          >
            <Text style={styles.bodyScanText}>not sure? do a body scan</Text>
          </TouchableOpacity>
        </View>
      </BlurView>

      {/* Conditional regulate button */}
      {isChecked && (
        <View style={styles.regulateContainer}>
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
        </View>
      )}
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  header: {
    marginBottom: 25,
    position: 'relative',
  },
  greeting: {
    color: '#f7f9fb',
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  subtitle: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: 0.3,
  },
  sosButtonSmall: {
    position: 'absolute',
    top: 0,
    right: 0,
  },
  sosButtonSmallGradient: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6b9d',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  sosTextSmall: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    marginBottom: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  cardContent: {
    padding: 20,
  },
  stateChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
    marginTop: 20,
    marginBottom: 15,
  },
  stateChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
  },
  stateChipSelected: {
    borderWidth: 2,
  },
  stateChipText: {
    color: 'rgba(247, 249, 251, 0.6)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  bodyScanButton: {
    marginTop: 15,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    alignSelf: 'center',
  },
  bodyScanText: {
    color: 'rgba(247, 249, 251, 0.7)',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  regulateContainer: {
    alignItems: 'center',
    marginTop: 10,
  },
  regulateButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4ecdc4',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  regulateText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
})
