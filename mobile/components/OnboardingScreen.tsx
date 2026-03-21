import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { useRouter } from 'expo-router'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Haptics from 'expo-haptics'

const ONBOARDING_KEY = 'somi_onboarding_seen'

export default function OnboardingScreen(): React.JSX.Element {
  const router = useRouter()

  const handleComplete = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace('/(tabs)/Home')
  }

  const handleSkip = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    await AsyncStorage.setItem(ONBOARDING_KEY, 'true')
    router.replace('/(tabs)/Home')
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerSection}>
        <Text style={styles.title}>Bodyfullness</Text>
        <Text style={styles.subtitle}>not just mindfulness. full-body attunement.</Text>
      </View>

      <View style={styles.videoPlaceholder}>
        <Text style={styles.videoPlaceholderText}>video coming soon</Text>
      </View>

      <View style={styles.actionsContainer}>
        <TouchableOpacity onPress={handleSkip} activeOpacity={0.7} style={styles.skipTouchable}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleComplete}
          style={styles.beginButton}
          activeOpacity={0.75}
        >
          <Text style={styles.beginButtonText}>Begin</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: 52,
    paddingHorizontal: 24,
  },
  headerSection: {
    alignItems: 'center',
  },
  title: {
    fontSize: 72,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 4,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.85)',
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  videoPlaceholder: {
    aspectRatio: 9 / 16,
    maxHeight: '45%',
    alignSelf: 'center',
    width: '70%',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoPlaceholderText: {
    fontSize: 15,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.3)',
    letterSpacing: 0.2,
  },
  actionsContainer: {
    gap: 12,
  },
  skipTouchable: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.2,
  },
  beginButton: {
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  beginButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
})
