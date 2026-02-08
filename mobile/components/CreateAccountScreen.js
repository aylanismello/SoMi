import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../stores/authStore'
import { Ionicons } from '@expo/vector-icons'
import { useState } from 'react'

const APPLE_SIGN_UP_IMAGE = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20images/sign_up_with_apple.png'

export default function CreateAccountScreen({ navigation }) {
  const signUpWithEmail = useAuthStore((state) => state.signUpWithEmail)
  const signInWithApple = useAuthStore((state) => state.signInWithApple)

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEmailSignUp = async () => {
    if (!email || !password) {
      Alert.alert('Missing Info', 'Please enter both email and password')
      return
    }

    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters')
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setLoading(true)

    const result = await signUpWithEmail(email, password)

    setLoading(false)

    if (result.success) {
      Alert.alert(
        'Check your email',
        'We sent you a confirmation link. Please check your email to verify your account.',
        [{ text: 'OK' }]
      )
    } else {
      Alert.alert('Sign Up Failed', result.error || 'Please try again')
    }
  }

  const handleAppleSignIn = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await signInWithApple()
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleBack}
            style={styles.backButton}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={32} color={colors.text.primary} />
          </TouchableOpacity>
        </View>

        {/* Title */}
        <Text style={styles.title}>create an account</Text>

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
            placeholder="Password (min. 6 characters)"
            placeholderTextColor={colors.text.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="password-new"
          />

          <TouchableOpacity
            onPress={handleEmailSignUp}
            style={[styles.createButton, loading && styles.createButtonDisabled]}
            activeOpacity={0.8}
            disabled={loading}
          >
            <Text style={styles.createButtonText}>
              {loading ? 'Creating account...' : 'Create account'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Social Sign In */}
        <View style={styles.socialButtons}>
          <TouchableOpacity
            onPress={handleAppleSignIn}
            style={styles.appleButton}
            activeOpacity={0.8}
          >
            <Image
              source={{ uri: APPLE_SIGN_UP_IMAGE }}
              style={styles.appleButtonImage}
              resizeMode="contain"
            />
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  scrollContent: {
    paddingTop: 60,
    paddingHorizontal: 32,
    paddingBottom: 40,
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
  },
  title: {
    fontSize: 36,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
    marginBottom: 40,
  },
  form: {
    gap: 16,
    marginBottom: 32,
  },
  input: {
    backgroundColor: colors.surface.secondary,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: colors.text.primary,
    fontWeight: '500',
  },
  createButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  createButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
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
  socialButtons: {
    gap: 16,
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
})
