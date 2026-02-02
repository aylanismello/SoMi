import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native'
import { BlurView } from 'expo-blur'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { useAuthStore } from '../stores/authStore'

export default function SignInModal({ visible, onClose, navigation }) {
  const login = useAuthStore((state) => state.login)

  const handleGoogleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    login('google')
    onClose()
  }

  const handleAppleSignIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    login('apple')
    onClose()
  }

  const handleCreateAccount = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    onClose()
    navigation.navigate('CreateAccount')
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
    gap: 16,
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background.primary,
    paddingVertical: 16,
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
