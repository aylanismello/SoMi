import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../stores/authStore'
import { Ionicons } from '@expo/vector-icons'

export default function CreateAccountScreen({ navigation }) {
  const login = useAuthStore((state) => state.login)

  const handleGoogleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    login('google')
  }

  const handleAppleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    login('apple')
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  return (
    <View style={styles.container}>
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={32} color={colors.text.primary} />
        </TouchableOpacity>

        {/* Progress bar */}
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBar} />
        </View>
      </View>

      {/* Title */}
      <Text style={styles.title}>Create an account</Text>

      {/* Sign-in buttons */}
      <View style={styles.content}>
        {/* Google Sign In */}
        <TouchableOpacity
          onPress={handleGoogleSignIn}
          style={styles.googleButton}
          activeOpacity={0.8}
        >
          <Text style={styles.googleIcon}>G</Text>
          <Text style={styles.googleButtonText}>Sign In With Google</Text>
        </TouchableOpacity>

        {/* Apple Sign In */}
        <TouchableOpacity
          onPress={handleAppleSignIn}
          style={styles.appleButton}
          activeOpacity={0.8}
        >
          <Text style={styles.appleIcon}></Text>
          <Text style={styles.appleButtonText}>Sign In With Apple</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  header: {
    marginBottom: 40,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -12,
    marginBottom: 20,
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    width: '33%',
    backgroundColor: colors.text.primary,
    borderRadius: 2,
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
    marginBottom: 60,
  },
  content: {
    gap: 16,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text.primary,
    paddingVertical: 18,
    borderRadius: 28,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  googleIcon: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4285F4',
  },
  googleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.background.primary,
    letterSpacing: 0.3,
  },
  appleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    paddingVertical: 18,
    borderRadius: 28,
    gap: 12,
    borderWidth: 1,
    borderColor: colors.text.primary,
  },
  appleIcon: {
    fontSize: 24,
    color: colors.text.primary,
  },
  appleButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
})
