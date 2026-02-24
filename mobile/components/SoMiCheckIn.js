import React, { useState, useRef } from 'react'
import { StyleSheet, Text, View, TouchableOpacity, Modal, TextInput, Keyboard, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, ScrollView } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import * as Haptics from 'expo-haptics'
import Svg, { Path } from 'react-native-svg'
import StateXYPicker, { X_STATE_ORDER, intensityWord } from './StateXYPicker'
import { chainService } from '../services/chainService'
import { colors } from '../constants/theme'
import { useFlowMusicStore } from '../stores/flowMusicStore'
import { useRoutineStore } from '../stores/routineStore'
import { useSaveEmbodimentCheck, QUERY_KEYS } from '../hooks/useSupabaseQueries'
import { useQueryClient } from '@tanstack/react-query'

// Core somatic/polyvagal experiences that commonly arise during practice
const PRESET_TAGS = [
  'crying', 'sighing', 'yawning', 'shaking',
  'tingling', 'warmth', 'spontaneous movement', 'laughter',
]

export default function SoMiCheckIn({ navigation, route }) {
  const [sliderValue, setSliderValue] = useState(0)
  const [polyvagalState, setPolyvagalState] = useState(null)

  const [showExitModal, setShowExitModal] = useState(false)

  const [journalEntry, setJournalEntry] = useState('')
  const [showJournalModal, setShowJournalModal] = useState(false)
  const journalInputRef = useRef(null)

  // Somatic experience tags
  const [selectedTags, setSelectedTags] = useState(new Set())

  const routineStore = useRoutineStore()
  const savedInitialValue = useRoutineStore(state => state.savedInitialValue)
  const savedInitialState = useRoutineStore(state => state.savedInitialState)
  const initialStateObj = X_STATE_ORDER.find(s => s.id === savedInitialState)
  const { stopFlowMusic } = useFlowMusicStore()
  const saveEmbodimentCheckMutation = useSaveEmbodimentCheck()
  const queryClient = useQueryClient()

  const saveEmbodimentCheck = async (value, stateId, journal = null) => {
    await saveEmbodimentCheckMutation.mutateAsync({
      sliderValue: value,
      polyvagalStateCode: stateId,
      journalEntry: journal,
    })
  }

  const handleSliderChange = (value) => {
    setSliderValue(value)
  }

  const handleStateChange = (stateId) => {
    setPolyvagalState(stateId)
  }

  const toggleTag = (tag) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setSelectedTags(prev => {
      const next = new Set(prev)
      next.has(tag) ? next.delete(tag) : next.add(tag)
      return next
    })
  }

  const handleJournalPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowJournalModal(true)
    setTimeout(() => {
      journalInputRef.current?.focus()
    }, 100)
  }

  const handleJournalSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowJournalModal(false)
    Keyboard.dismiss()
  }

  const handleFinish = async () => {
    if (!polyvagalState) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)
      return
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    await saveEmbodimentCheck(sliderValue, polyvagalState, journalEntry || null)

    const isDaily = !routineStore.isQuickRoutine

    if (isDaily) {
      const chainId = await chainService.createChainFromSession('daily_flow')
      if (chainId) {
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chains })
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestChain })
        await queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestDailyFlow })
      }
    } else {
      await chainService.endActiveChain()
    }

    routineStore.resetRoutine()

    if (isDaily) {
      navigation.navigate('CompletionScreen')
    } else {
      navigation.navigate('Home')
    }
  }

  const handleClosePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setShowExitModal(true)
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)

    const isDaily = !routineStore.isQuickRoutine
    if (isDaily) {
      await chainService.clearSessionData()
    } else {
      await chainService.endActiveChain()
    }

    stopFlowMusic()
    routineStore.resetRoutine()

    navigation.reset({
      index: 0,
      routes: [{ name: 'FlowMenu' }],
    })

    const tabNavigator = navigation.getParent()
    if (tabNavigator) {
      tabNavigator.navigate('Home')
    }
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
  }

  return (
    <LinearGradient
      colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
      style={styles.container}
    >
      {/* Header Bar */}
      <View style={styles.headerBar}>
        <View style={{ width: 44 }} />
        <TouchableOpacity
          onPress={handleClosePress}
          style={styles.headerCloseButton}
          activeOpacity={0.7}
        >
          <Text style={styles.headerCloseText}>✕</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentContainer}
        contentContainerStyle={styles.cardContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Question */}
        <View style={styles.questionSection}>
          <TouchableOpacity
            onPress={handleJournalPress}
            activeOpacity={0.8}
            style={styles.journalButtonFloating}
          >
            <Text style={styles.journalIconFloating}>📝</Text>
          </TouchableOpacity>
          <Text style={styles.closingCheckInLabel}>closing check-in</Text>
          <Text style={styles.questionText}>how do you feel{'\n'}right now?</Text>
        </View>

        {/* Before ghost: initial check-in reference */}
        {initialStateObj && (
          <View style={styles.beforeRow}>
            <Text style={styles.beforeLabel}>you started</Text>
            <View style={styles.beforePill}>
              <Text style={styles.beforeIcon}>{initialStateObj.icon}</Text>
              <Text style={styles.beforeState}>{initialStateObj.label}</Text>
              <Text style={styles.beforeDot}>·</Text>
              <Text style={styles.beforeIntensity}>{intensityWord(savedInitialValue ?? 0)}</Text>
            </View>
          </View>
        )}

        {/* State × Intensity picker */}
        <View style={styles.pickerSection}>
          <StateXYPicker
            selectedStateId={polyvagalState}
            onStateChange={handleStateChange}
            intensityValue={sliderValue}
            onIntensityChange={handleSliderChange}
          />
        </View>

        {/* Somatic experience tags */}
        <View style={styles.tagsSection}>
          <Text style={styles.tagsLabel}>did you experience any of these?</Text>
          <View style={styles.tagsWrap}>
            {PRESET_TAGS.map(tag => {
              const active = selectedTags.has(tag)
              return (
                <TouchableOpacity
                  key={tag}
                  onPress={() => toggleTag(tag)}
                  activeOpacity={0.7}
                  style={[styles.tag, active && styles.tagActive]}
                >
                  <Text style={[styles.tagText, active && styles.tagTextActive]}>{tag}</Text>
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      </ScrollView>

      {/* Sticky Bottom: Complete Flow */}
      <View style={styles.stickyBottom}>
        <TouchableOpacity
          onPress={handleFinish}
          activeOpacity={0.75}
          style={styles.completeButton}
        >
          <Text style={styles.completeButtonText}>Complete Flow</Text>
          <Text style={styles.completeButtonArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Journal Entry Modal */}
      <Modal
        visible={showJournalModal}
        transparent={false}
        animationType="slide"
        onRequestClose={handleJournalSave}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.journalFullscreen}
        >
          <View style={styles.journalNotebook}>
            <View style={styles.journalCard}>
              <View style={styles.journalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                    setJournalEntry('')
                    setShowJournalModal(false)
                  }}
                  activeOpacity={0.7}
                  style={styles.journalCancelButton}
                >
                  <Text style={styles.journalCancelText}>✕</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleJournalSave}
                  activeOpacity={0.7}
                  style={styles.journalDoneButton}
                >
                  <Svg width={24} height={24} viewBox="0 0 24 24">
                    <Path
                      d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                      fill={colors.accent.primary}
                    />
                  </Svg>
                </TouchableOpacity>
              </View>

              <View style={styles.journalNotebookContent}>
                <Text style={styles.journalNotebookTitle}>what's present right now?</Text>
                <Text style={styles.journalNotebookSubtitle}>all feelings welcome, exactly as they are</Text>

                <TouchableWithoutFeedback onPress={() => journalInputRef.current?.focus()}>
                  <View style={styles.journalTextInputWrapper}>
                    <TextInput
                      ref={journalInputRef}
                      style={styles.journalTextInput}
                      value={journalEntry}
                      onChangeText={setJournalEntry}
                      placeholder="tap here to begin..."
                      placeholderTextColor="#999999"
                      multiline
                      textAlignVertical="top"
                      autoFocus={true}
                      keyboardType="default"
                      showSoftInputOnFocus={true}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Exit Bottom Sheet */}
      <Modal
        visible={showExitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCancelExit}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={handleCancelExit}>
          <TouchableOpacity activeOpacity={1} style={styles.sheetContainer} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>End Session?</Text>
            <Text style={styles.sheetBody}>Your progress so far won't be saved.</Text>
            <TouchableOpacity onPress={handleConfirmExit} style={styles.sheetEndButton} activeOpacity={0.85}>
              <Text style={styles.sheetEndText}>End Flow</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancelExit} style={styles.sheetCancelButton} activeOpacity={0.7}>
              <Text style={styles.sheetCancelText}>Keep Going</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 60,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
  },
  headerCloseButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  headerCloseText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '300',
  },
  contentContainer: {
    flex: 1,
  },
  cardContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 120,
  },
  questionSection: {
    position: 'relative',
    paddingTop: 8,
    marginBottom: 24,
  },
  closingCheckInLabel: {
    color: colors.accent.primary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 10,
  },
  questionText: {
    color: colors.text.primary,
    fontSize: 24,
    fontWeight: '500',
    lineHeight: 32,
    letterSpacing: 0.3,
  },
  pickerSection: {
    marginBottom: 32,
  },
  tagsSection: {
    marginBottom: 16,
  },
  tagsLabel: {
    color: 'rgba(255,255,255,0.35)',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 14,
  },
  tagsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  tagActive: {
    borderColor: colors.accent.primary,
    backgroundColor: colors.accent.primary + '18',
  },
  tagText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    fontWeight: '500',
  },
  tagTextActive: {
    color: colors.accent.primary,
    fontWeight: '600',
  },
  journalButtonFloating: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surface.tertiary,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  journalIconFloating: {
    fontSize: 20,
  },
  beforeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
    opacity: 0.42,
  },
  beforeLabel: {
    color: colors.text.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  beforePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  beforeIcon: { fontSize: 12 },
  beforeState: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '600',
  },
  beforeDot: {
    color: 'rgba(255,255,255,0.3)',
    fontSize: 12,
  },
  beforeIntensity: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '400',
  },
  stickyBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 40,
    paddingTop: 16,
    backgroundColor: colors.background.primary + 'F0',
  },
  completeButton: {
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  completeButtonText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  completeButtonArrow: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 28,
    fontWeight: '300',
  },
  journalFullscreen: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  journalNotebook: {
    flex: 1,
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  journalCard: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  journalHeader: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  journalCancelButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E8E9EA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalCancelText: {
    color: '#666666',
    fontSize: 24,
    fontWeight: '300',
  },
  journalDoneButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surface.secondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  journalNotebookContent: {
    flex: 1,
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  journalNotebookTitle: {
    color: '#1A1A1A',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginBottom: 6,
  },
  journalNotebookSubtitle: {
    color: '#666666',
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginBottom: 24,
  },
  journalTextInputWrapper: {
    flex: 1,
  },
  journalTextInput: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 0,
    padding: 0,
    color: '#1A1A1A',
    fontSize: 17,
    fontWeight: '400',
    lineHeight: 26,
  },
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 28,
  },
  sheetTitle: {
    color: '#ffffff',
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetBody: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
  sheetEndButton: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: '#ff6b6b',
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  sheetEndText: {
    color: '#ff6b6b',
    fontSize: 17,
    fontWeight: '700',
  },
  sheetCancelButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  sheetCancelText: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 17,
    fontWeight: '500',
  },
})
