import { View, Text, TouchableOpacity, StyleSheet, Modal, Image, TextInput, Alert } from 'react-native'
import { BlurView } from 'expo-blur'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../stores/authStore'
import { useState } from 'react'

const APPLE_SIGN_IN_IMAGE = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20images/sign_in_with_apple.png'

export default function SignInModal({ visible, onClose, navigation }) {
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail)
  const signInWithApple = useAuthStore((state) => state.signInWithApple)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password')
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)

    const result = await signInWithEmail(email, password)

    setLoading(false)

    if (result.success) {
      onClose()
    } else {
      Alert.alert('Sign In Failed', result.error || 'Please check your credentials and try again')
    }
  }

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const result = await signInWithApple()
    if (result.success) {
      onClose()
    }
  }

  const handleCreateAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
    setTimeout(() => {
      navigation.navigate('CreateAccount')
    }, 300)
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <BlurView intensity={40} tint="dark" style={styles.modalContainer}>
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Sign In</Text>
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Sign-in content */}
          <View style={styles.content}>
            {/* Email/Password Form */}
            <View style={styles.form}>
              <TextInput
                style={styles.input}
                placeholder="Email"
                placeholderTextColor={colors.text.muted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                autoCorrect={false}
              />

              <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={colors.text.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoComplete="password"
              />

              <TouchableOpacity
                onPress={handleEmailSignIn}
                style={[styles.signInButton, loading && styles.signInButtonDisabled]}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.signInButtonText}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Apple Sign In */}
            <TouchableOpacity
              onPress={handleAppleSignIn}
              style={styles.appleButton}
              activeOpacity={0.8}
            >
              <Image
                source={{ uri: APPLE_SIGN_IN_IMAGE }}
                style={styles.appleButtonImage}
                resizeMode="contain"
              />
            </TouchableOpacity>

            {/* Create Account Link */}
            <TouchableOpacity onPress={handleCreateAccount} activeOpacity={0.7}>
              <Text style={styles.createAccountText}>
                Don't have an account? <Text style={styles.createAccountLink}>Create one</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.border.default,
    paddingBottom: 40,
  },
  handleBar: {
    width: 40,
    height: 5,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 24,
    position: 'relative',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    color: colors.text.primary,
    fontSize: 20,
    fontWeight: '300',
  },
  content: {
    paddingHorizontal: 32,
  },
  form: {
    gap: 16,
    marginBottom: 24,
  },
  input: {
    backgroundColor: colors.surface.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  signInButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  signInButtonDisabled: {
    opacity: 0.6,
  },
  signInButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.muted,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text.primary,
    paddingVertical: 16,
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
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.text.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border.default,
    height: 56,
  },
  appleButtonImage: {
    width: '100%',
    height: '100%',
  },
  createAccountText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.secondary,
    textAlign: 'center',
    letterSpacing: 0.3,
    marginTop: 8,
  },
  createAccountLink: {
    color: colors.accent.primary,
    fontWeight: '700',
  },
})
