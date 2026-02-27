import { StyleSheet, View, Text, TouchableOpacity, ScrollView, Modal, Switch } from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import * as Haptics from 'expo-haptics'
import { useState } from 'react'
import { useSettingsStore } from '../stores/settingsStore'
import { colors } from '../constants/theme'

const H_PAD = 20

const CUST_SECTIONS = [
  {
    id: 'background',
    label: 'Background',
    options: [
      { value: 'river', label: 'River', type: 'sphere', color: '#5BAEE8' },
      { value: 'ocean', label: 'Ocean', type: 'sphere', color: '#1A4A8A' },
      { value: 'lake',  label: 'Lake',  type: 'sphere', color: '#2E7BC4' },
    ],
  },
  {
    id: 'soundscape',
    label: 'Soundscape',
    options: [
      { value: 'forest', label: 'Forest', type: 'sphere', color: '#5B7B42' },
      { value: 'river',  label: 'River',  type: 'sphere', color: '#5BA4CF' },
      { value: 'drone',  label: 'Drone',  type: 'sphere', color: '#B0B0B0' },
      { value: 'off',    label: 'Off',    type: 'off' },
    ],
  },
  {
    id: 'tone',
    label: 'Block Change Tone',
    options: [
      { value: 'sine',  label: 'Sine',  type: 'icon', icon: 'pulse-outline' },
      { value: 'synth', label: 'Synth', type: 'icon', icon: 'musical-notes-outline' },
      { value: 'bowl',  label: 'Bowl',  type: 'icon', icon: 'radio-button-off-outline' },
      { value: 'off',   label: 'Off',   type: 'off' },
    ],
  },
]

export default function CustomizationModal({ visible, onClose }) {
  const { isMusicEnabled, toggleMusic, isSfxEnabled, toggleSfx } = useSettingsStore()

  const [selections, setSelections] = useState({
    background: 'river', soundscape: 'forest', tone: 'bowl',
  })

  const pick = (sectionId, value) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelections(s => ({ ...s, [sectionId]: value }))
  }

  const handleToggleMusic = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    toggleMusic()
  }

  const handleToggleSfx = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    toggleSfx()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 24 }}>

            {/* Music toggle */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleLabel}>Music</Text>
              <Switch
                value={isMusicEnabled}
                onValueChange={handleToggleMusic}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.accent.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {/* SFX toggle */}
            <View style={[styles.toggleRow, styles.toggleRowLast]}>
              <Text style={styles.toggleLabel}>SFX</Text>
              <Switch
                value={isSfxEnabled}
                onValueChange={handleToggleSfx}
                trackColor={{ false: 'rgba(255,255,255,0.15)', true: colors.accent.primary }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Divider */}
            <View style={styles.divider} />

            {/* Section pickers */}
            {CUST_SECTIONS.map(section => (
              <View key={section.id} style={{ marginBottom: 20 }}>
                <Text style={styles.sectionLabel}>{section.label}</Text>
                <View style={styles.optionBox}>
                  {section.options.map(opt => {
                    const selected = selections[section.id] === opt.value
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[styles.option, selected && styles.optionSelected]}
                        onPress={() => pick(section.id, opt.value)}
                        activeOpacity={0.75}
                      >
                        {opt.type === 'sphere' && (
                          <View style={[styles.sphere, { backgroundColor: opt.color }]} />
                        )}
                        {opt.type === 'icon' && (
                          <View style={styles.iconCircle}>
                            <Ionicons name={opt.icon} size={22} color="rgba(255,255,255,0.8)" />
                          </View>
                        )}
                        {opt.type === 'off' && (
                          <View style={styles.iconCircle}>
                            <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 20, fontWeight: '300' }}>—</Text>
                          </View>
                        )}
                        <Text style={styles.optionLabel}>{opt.label}</Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>
            ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: H_PAD,
    maxHeight: '85%',
  },
  handle: {
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 20,
  },
  title: {
    color: '#fff',
    fontSize: 20, fontWeight: '700',
    marginBottom: 20, letterSpacing: 0.3,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.08)',
    marginBottom: 4,
  },
  toggleRowLast: {
    marginBottom: 0,
  },
  toggleLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginVertical: 20,
  },
  sectionLabel: {
    color: '#fff',
    fontSize: 15, fontWeight: '700',
    marginBottom: 10, letterSpacing: 0.2,
  },
  optionBox: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 16,
    padding: 10,
    flexWrap: 'wrap',
  },
  option: {
    alignItems: 'center', gap: 6, padding: 8,
    borderRadius: 12, borderWidth: 2, borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: 'rgba(255,255,255,0.35)',
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sphere: { width: 56, height: 56, borderRadius: 28 },
  iconCircle: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center', justifyContent: 'center',
  },
  optionLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 12, fontWeight: '500' },
})
