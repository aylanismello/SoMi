import { StyleSheet, View, Text, TouchableOpacity, Modal, Switch } from 'react-native'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { useSettings } from '../contexts/SettingsContext'

export default function SettingsModal({ visible, onClose }) {
  const { isMusicEnabled, toggleMusic, showTime, toggleShowTime } = useSettings()

  const handleToggleMusic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    toggleMusic()
  }

  const handleToggleShowTime = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    toggleShowTime()
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    onClose()
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={handleClose}
    >
      <View style={styles.modalOverlay}>
        <BlurView intensity={40} tint="dark" style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>SoMi Check-In Settings</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Music</Text>
                <Text style={styles.settingDescription}>
                  Play audio during check-in
                </Text>
              </View>
              <Switch
                value={isMusicEnabled}
                onValueChange={handleToggleMusic}
                trackColor={{ false: colors.surface.tertiary, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0, marginBottom: 32 }]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Show Time</Text>
                <Text style={styles.settingDescription}>
                  Display countdown timer
                </Text>
              </View>
              <Switch
                value={showTime}
                onValueChange={handleToggleShowTime}
                trackColor={{ false: colors.surface.tertiary, true: colors.accent.primary }}
                thumbColor={colors.text.primary}
              />
            </View>

            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Text style={styles.closeButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </BlurView>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  modalContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    maxWidth: 380,
    width: '100%',
  },
  modalContent: {
    padding: 32,
  },
  modalTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 24,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    marginBottom: 24,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  settingDescription: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
  },
  closeButton: {
    backgroundColor: colors.accent.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 20,
    alignItems: 'center',
  },
  closeButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
})
