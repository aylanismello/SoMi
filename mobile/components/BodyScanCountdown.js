import { useState, useEffect, useRef } from 'react'
import { StyleSheet, View, Text, Animated, Pressable, Modal, TouchableOpacity } from 'react-native'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useEvent } from 'expo'
import * as Haptics from 'expo-haptics'
import { colors } from '../constants/theme'
import { chainService } from '../services/chainService'
import { useSettingsStore } from '../stores/settingsStore'
import { useFlowMusicStore } from '../stores/flowMusicStore'
import { useRoutineStore } from '../stores/routineStore'
import FlowProgressHeader from './FlowProgressHeader'
import FlowControlsOverlay from './FlowControlsOverlay'

const COUNTDOWN_DURATION_SECONDS = 60
const OCEAN_VIDEO_URI = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20videos/ocean_loop_final.mp4'

export default function BodyScanCountdown({ route, navigation }) {
  const flowType = useRoutineStore(state => state.flowType)
  const {
    isInitial,
    savedInitialValue,
    savedInitialState,
    skipToRoutine,
    fromCheckIn,
    finalOrderIndex,
  } = route.params

  const oceanPlayer = useVideoPlayer(OCEAN_VIDEO_URI, (player) => {
    player.loop = true
    player.muted = true
    player.play()
  })

  // Stall recovery: ocean background should always loop — restart if it unexpectedly stops
  const { isPlaying: oceanIsPlaying } = useEvent(oceanPlayer, 'playingChange', { isPlaying: oceanPlayer.playing })
  useEffect(() => {
    if (!oceanIsPlaying) {
      try { oceanPlayer.play() } catch (e) { /* player released during navigation */ }
    }
  }, [oceanIsPlaying])

  const [countdown, setCountdown] = useState(COUNTDOWN_DURATION_SECONDS)
  const countdownIntervalRef = useRef(null)
  const [showControls, setShowControls] = useState(false)
  const videoOpacity = useRef(new Animated.Value(1)).current
  const [showExitModal, setShowExitModal] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const pausedCountdownRef = useRef(COUNTDOWN_DURATION_SECONDS)
  const startTimeRef = useRef(null)

  const controlsOpacity = useRef(new Animated.Value(0)).current
  const hideTimeoutRef = useRef(null)

  const { isMusicEnabled } = useSettingsStore()
  const { startFlowMusic, stopFlowMusic, updateMusicSetting, audioPlayer } = useFlowMusicStore()

  const progressAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    startTimeRef.current = Date.now()
    if (isInitial && audioPlayer) {
      startFlowMusic(isMusicEnabled)
    }
  }, [isInitial, audioPlayer])

  useEffect(() => {
    updateMusicSetting(isMusicEnabled)
  }, [isMusicEnabled])

  useEffect(() => {
    progressAnim.setValue(0)
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: COUNTDOWN_DURATION_SECONDS * 1000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) handleComplete()
    })
    return () => { progressAnim.stopAnimation() }
  }, [])

  useEffect(() => {
    countdownIntervalRef.current = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(countdownIntervalRef.current)
          return 0
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    }
  }, [])

  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [showControls])

  useEffect(() => {
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }
    if (showControls && !isPaused) {
      hideTimeoutRef.current = setTimeout(() => {
        setShowControls(false)
        hideTimeoutRef.current = null
      }, 4000)
    }
    return () => {
      if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
    }
  }, [showControls, isPaused])

  const handleComplete = async () => {
    const { soundManager } = require('../utils/SoundManager')
    soundManager.playBlockEnd()
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)

    const elapsedMs = Date.now() - startTimeRef.current
    const elapsedSeconds = Math.round(elapsedMs / 1000)
    const BODY_SCAN_BLOCK_ID = 20
    const section = isInitial ? 'warm-up' : 'integration'
    await chainService.saveCompletedBlock(BODY_SCAN_BLOCK_ID, elapsedSeconds, isInitial ? 0 : finalOrderIndex, null, flowType, section)

    if (skipToRoutine) {
      navigation.replace('SoMiRoutine')
    } else if (isInitial) {
      navigation.replace('SoMiCheckIn', { fromBodyScan: true })
    } else {
      navigation.replace('SoMiCheckIn', {
        fromPlayer: true,
        savedInitialValue,
        savedInitialState,
      })
    }
  }

  const handleSkipBlock = () => {
    setShowControls(false)
    progressAnim.stopAnimation()
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    handleComplete()
  }

  const handlePauseResume = () => {
    if (!isPaused) {
      setIsPaused(true)
      pausedCountdownRef.current = countdown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      progressAnim.stopAnimation()
    } else {
      setIsPaused(false)
      const resumeCountdown = pausedCountdownRef.current
      setCountdown(resumeCountdown)

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownIntervalRef.current); return 0 }
          return prev - 1
        })
      }, 1000)

      const elapsed = COUNTDOWN_DURATION_SECONDS - resumeCountdown
      const remaining = resumeCountdown * 1000
      progressAnim.setValue(elapsed / COUNTDOWN_DURATION_SECONDS)
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: remaining,
        useNativeDriver: false,
      }).start(({ finished }) => { if (finished) handleComplete() })
    }
  }

  const handleEndFlow = () => {
    setShowControls(false)
    setShowExitModal(true)
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)
    progressAnim.stopAnimation()
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current)
    stopFlowMusic()
    if (flowType === 'daily_flow') {
      await chainService.clearSessionData()
    } else {
      await chainService.endActiveChain()
    }
    navigation.reset({ index: 0, routes: [{ name: 'FlowMenu' }] })
    const tabNavigator = navigation.getParent()
    if (tabNavigator) tabNavigator.navigate('Home')
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
  }

  const message = isInitial
    ? "how do you feel in the body?\nnotice any sensations\ngoing into this flow"
    : "how do you feel those sensations\ncoming out of this flow"

  const barWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  return (
    <View style={styles.container}>
      {/* Ocean background video — preloaded, no black flash */}
      <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: videoOpacity }]}>
        <VideoView
          player={oceanPlayer}
          style={StyleSheet.absoluteFillObject}
          contentFit="cover"
          nativeControls={false}
        />
      </Animated.View>

      {/* Dark overlay */}
      <View style={[StyleSheet.absoluteFillObject, styles.overlay]} />

      {!fromCheckIn && <FlowProgressHeader />}

      {/* Main content — tap anywhere to toggle controls */}
      <Pressable style={styles.content} onPress={() => setShowControls(!showControls)}>
        <Text style={styles.title}>Body Scan</Text>
        <Text style={styles.message}>{message}</Text>
      </Pressable>

      {/* Loading bar — tap to skip */}
      <Pressable onPress={handleSkipBlock} style={styles.barWrapper}>
        <View style={styles.barTrack}>
          <Animated.View style={[styles.barFill, { width: barWidth }]} />
          <View style={styles.barContent}>
            <Text style={styles.barLabel}>Skip Body Scan</Text>
            <Text style={styles.barArrow}>›</Text>
          </View>
        </View>
      </Pressable>

      <FlowControlsOverlay
        visible={showControls}
        opacity={controlsOpacity}
        isPaused={isPaused}
        onSkipBlock={handleSkipBlock}
        onPauseResume={handlePauseResume}
        onEndFlow={handleEndFlow}
        onDismiss={() => setShowControls(false)}
        onInteraction={() => {
          if (hideTimeoutRef.current) clearTimeout(hideTimeoutRef.current)
          hideTimeoutRef.current = setTimeout(() => setShowControls(false), 4000)
        }}
      />

      <Modal visible={showExitModal} transparent={true} animationType="slide" onRequestClose={handleCancelExit}>
        <Pressable style={styles.sheetOverlay} onPress={handleCancelExit}>
          <Pressable style={styles.sheetContainer} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>End Session?</Text>
            <Text style={styles.sheetBody}>Your progress so far won't be saved.</Text>
            <TouchableOpacity onPress={handleConfirmExit} style={styles.sheetEndButton}>
              <Text style={styles.sheetEndText}>End Flow</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCancelExit} style={styles.sheetCancelButton}>
              <Text style={styles.sheetCancelText}>Keep Going</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 48,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  title: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    opacity: 0.5,
    marginBottom: 24,
  },
  message: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 40,
    letterSpacing: 0.2,
  },
  barWrapper: {
    paddingHorizontal: 20,
    paddingBottom: 52,
  },
  barTrack: {
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(255,255,255,0.1)',
    overflow: 'hidden',
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 34,
  },
  barContent: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  barLabel: {
    flex: 1,
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  barArrow: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 28,
    fontWeight: '300',
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
    width: 36, height: 4,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 2, alignSelf: 'center', marginBottom: 28,
  },
  sheetTitle: {
    color: '#ffffff', fontSize: 24, fontWeight: '700',
    textAlign: 'center', marginBottom: 8,
  },
  sheetBody: {
    color: 'rgba(255,255,255,0.45)', fontSize: 15,
    textAlign: 'center', lineHeight: 22, marginBottom: 28,
  },
  sheetEndButton: {
    backgroundColor: 'rgba(255,107,107,0.1)',
    borderRadius: 20, borderWidth: 1.5, borderColor: '#ff6b6b',
    paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  sheetEndText: { color: '#ff6b6b', fontSize: 17, fontWeight: '700' },
  sheetCancelButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 20, paddingVertical: 16, alignItems: 'center',
  },
  sheetCancelText: { color: 'rgba(255,255,255,0.55)', fontSize: 17, fontWeight: '500' },
})
