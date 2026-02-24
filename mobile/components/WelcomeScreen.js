import { View, Text, TouchableOpacity, StyleSheet, Alert } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEvent } from 'expo'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { useState, useEffect } from 'react'
import { useAuthStore } from '../stores/authStore'
import { Ionicons } from '@expo/vector-icons'
import EmailAuthModal from './SignInModal'

const OCEAN_VIDEO_URI = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20videos/ocean_loop_final.mp4'

export default function WelcomeScreen({ navigation }) {
  const [showOtherOptions, setShowOtherOptions] = useState(false)
  const [showEmailModal, setShowEmailModal] = useState(false)
  const signInWithApple = useAuthStore((state) => state.signInWithApple)

  const oceanPlayer = useVideoPlayer(OCEAN_VIDEO_URI, (player) => {
    player.loop = true
    player.muted = true
    player.play()
  })

  const { isPlaying: oceanIsPlaying } = useEvent(oceanPlayer, 'playingChange', { isPlaying: oceanPlayer.playing })
  useEffect(() => {
    if (!oceanIsPlaying) {
      try { oceanPlayer.play() } catch (e) { /* player released during navigation */ }
    }
  }, [oceanIsPlaying])

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const result = await signInWithApple()
    if (!result.success && !result.cancelled) {
      Alert.alert('Sign In Failed', result.error || 'Please try again')
    }
  }

  const handleOtherOptions = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowOtherOptions(true)
  }

  const handleEmailContinue = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowEmailModal(true)
  }

  return (
    <>
      <View style={styles.container}>
        <VideoView
          player={oceanPlayer}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
        <View style={styles.overlay} />

        <View style={styles.logoContainer}>
          <Text style={styles.logo}>SoMi</Text>
          <Text style={styles.tagline}>your embodiment practice guide</Text>
        </View>

        <View style={styles.actionsContainer}>
          <TouchableOpacity
            onPress={handleAppleSignIn}
            style={styles.authButton}
            activeOpacity={0.75}
          >
            <View style={styles.iconWrap}>
              <Ionicons name="logo-apple" size={22} color="#ffffff" />
            </View>
            <Text style={styles.authButtonText}>Sign in with Apple</Text>
            <View style={styles.iconWrap} />
          </TouchableOpacity>

          {showOtherOptions ? (
            <TouchableOpacity
              onPress={handleEmailContinue}
              style={styles.authButton}
              activeOpacity={0.75}
            >
              <View style={styles.iconWrap}>
                <Ionicons name="mail-outline" size={20} color="#ffffff" />
              </View>
              <Text style={styles.authButtonText}>Continue with Email</Text>
              <View style={styles.iconWrap} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity onPress={handleOtherOptions} activeOpacity={0.7} style={styles.otherOptionsTouchable}>
              <Text style={styles.otherOptionsText}>Other options</Text>
            </TouchableOpacity>
          )}

          <Text style={styles.termsText}>
            By continuing you agree to our{' '}
            <Text style={styles.termsLink}>Terms of Service</Text>
            {' '}and{' '}
            <Text style={styles.termsLink}>Privacy Policy</Text>
          </Text>
        </View>
      </View>

      <EmailAuthModal
        visible={showEmailModal}
        onClose={() => setShowEmailModal(false)}
        navigation={navigation}
      />
    </>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: 52,
    paddingHorizontal: 24,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10,15,30,0.72)',
  },
  logoContainer: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    fontSize: 72,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 4,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    fontWeight: '500',
    color: colors.text.secondary,
    letterSpacing: 0.3,
    textAlign: 'center',
  },
  actionsContainer: {
    gap: 12,
  },
  authButton: {
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.18)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconWrap: {
    width: 28,
    alignItems: 'center',
  },
  authButtonText: {
    flex: 1,
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
    color: '#ffffff',
    letterSpacing: 0.2,
  },
  otherOptionsTouchable: {
    alignItems: 'center',
    paddingVertical: 6,
  },
  otherOptionsText: {
    fontSize: 16,
    fontWeight: '500',
    color: 'rgba(255, 255, 255, 0.5)',
    letterSpacing: 0.2,
  },
  termsText: {
    fontSize: 13,
    fontWeight: '400',
    color: 'rgba(255, 255, 255, 0.4)',
    textAlign: 'center',
    letterSpacing: 0.2,
    lineHeight: 18,
    marginTop: 4,
  },
  termsLink: {
    color: 'rgba(255, 255, 255, 0.65)',
    fontWeight: '500',
  },
})
