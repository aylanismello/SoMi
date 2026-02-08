import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { colors } from '../constants/theme'
import * as Haptics from 'expo-haptics'
import { Ionicons } from '@expo/vector-icons'
import { useAuthStore } from '../stores/authStore'

export default function AccountSettingsScreen({ navigation }) {
  const signOut = useAuthStore((state) => state.signOut)
  const user = useAuthStore((state) => state.user)

  const handleLogout = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    await signOut()
    // onAuthStateChange will handle navigation to auth screens
  }

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    navigation.goBack()
  }

  // Get user name from metadata (saved during Apple Sign In)
  const fullName = user?.user_metadata?.full_name
  // Email can be in user.email OR user.user_metadata.email (Apple puts it in metadata)
  const email = user?.email || user?.user_metadata?.email

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={handleBack}
          style={styles.backButton}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={28} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        {/* User Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileAvatar}>
            <Text style={styles.profileAvatarText}>
              {fullName ? fullName.charAt(0).toUpperCase() : email?.charAt(0).toUpperCase() || '?'}
            </Text>
          </View>
          <View style={styles.profileInfo}>
            {fullName && <Text style={styles.profileName}>{fullName}</Text>}
            <Text style={styles.profileEmail}>{email || 'No email'}</Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutButton}
          activeOpacity={0.7}
        >
          <Text style={styles.logoutButtonText}>Log out</Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 44,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: colors.surface.secondary,
    borderRadius: 16,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: colors.border.subtle,
  },
  profileAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.accent.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  profileAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.text.primary,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.secondary,
    letterSpacing: 0.2,
  },
  logoutButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  logoutButtonText: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
})
