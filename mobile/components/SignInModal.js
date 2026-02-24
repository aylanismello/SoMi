import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Alert, KeyboardAvoidingView, Platform } from 'react-native'
import { BlurView } from 'expo-blur'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../stores/authStore'
import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'

export default function SignInModal({ visible, onClose }) {
  const signInWithEmail = useAuthStore((state) => state.signInWithEmail)
  const signUpWithEmail = useAuthStore((state) => state.signUpWithEmail)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleContinue = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password')
      return
    }

    if (isSignUp && password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters')
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)

    if (isSignUp) {
      const result = await signUpWithEmail(email, password)
      setLoading(false)
      if (result.success) {
        Alert.alert(
          'Check your email',
          'We sent you a confirmation link to verify your account.',
          [{ text: 'OK', onPress: handleClose }]
        )
      } else {
        Alert.alert('Sign Up Failed', result.error || 'Please try again')
      }
    } else {
      const result = await signInWithEmail(email, password)
      setLoading(false)
      if (result.success) {
        handleClose()
      } else {
        Alert.alert('Sign In Failed', result.error || 'Please check your credentials and try again')
      }
    }
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setEmail('')
    setPassword('')
    setIsSignUp(false)
    onClose()
  }

  const toggleMode = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setIsSignUp((prev) => !prev)
    setPassword('')
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <BlurView intensity={40} tint="dark" style={styles.modalContainer}>
          <View style={styles.handleBar} />

          <View style={styles.header}>
            <Text style={styles.title}>{isSignUp ? 'Create account' : 'Sign in'}</Text>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton} activeOpacity={0.7}>
              <Ionicons name="close" size={18} color={colors.text.primary} />
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
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
                autoComplete={isSignUp ? 'password-new' : 'password'}
              />

              <TouchableOpacity
                onPress={handleContinue}
                style={[styles.continueButton, loading && styles.continueButtonDisabled]}
                activeOpacity={0.8}
                disabled={loading}
              >
                <Text style={styles.continueButtonText}>
                  {loading
                    ? (isSignUp ? 'Creating account...' : 'Signing in...')
                    : 'Continue'}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
              <Text style={styles.toggleText}>
                {isSignUp ? 'Already have an account? ' : 'New to SoMi? '}
                <Text style={styles.toggleLink}>
                  {isSignUp ? 'Sign in' : 'Create account'}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </KeyboardAvoidingView>
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
    paddingBottom: 44,
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
    paddingBottom: 28,
    position: 'relative',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  closeButton: {
    position: 'absolute',
    right: 24,
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 28,
    gap: 20,
  },
  form: {
    gap: 14,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 14,
    paddingVertical: 15,
    paddingHorizontal: 18,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  continueButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 30,
    alignItems: 'center',
    marginTop: 4,
  },
  continueButtonDisabled: {
    opacity: 0.6,
  },
  continueButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#000000',
    letterSpacing: 0.3,
  },
  toggleText: {
    fontSize: 15,
    fontWeight: '500',
    color: colors.text.muted,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  toggleLink: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
})
