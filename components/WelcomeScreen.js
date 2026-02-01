import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'

export default function WelcomeScreen({ navigation }) {
  const handleGetStarted = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    navigation.navigate('SignIn')
  }

  const handleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.navigate('SignIn')
  }

  return (
    <View style={styles.container}>
      {/* Logo/Branding Area */}
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>SoMi</Text>
        <Text style={styles.tagline}>your embodiment practice partner</Text>
      </View>

      {/* Bottom Actions */}
      <View style={styles.actionsContainer}>
        <TouchableOpacity
          onPress={handleGetStarted}
          style={styles.getStartedButton}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedButtonText}>Get Started</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSignIn} activeOpacity={0.7}>
          <Text style={styles.signInText}>
            Already have an account? <Text style={styles.signInLink}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    justifyContent: 'space-between',
    paddingTop: 120,
    paddingBottom: 60,
    paddingHorizontal: 32,
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
    gap: 20,
  },
  getStartedButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 18,
    borderRadius: 28,
    alignItems: 'center',
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  getStartedButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  signInText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  signInLink: {
    color: colors.accent.primary,
    fontWeight: '700',
  },
})
