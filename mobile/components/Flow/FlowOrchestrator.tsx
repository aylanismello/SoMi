import React, { useState, useEffect, useRef } from 'react'
import { useEvent } from 'expo'
import { useVideoPlayer } from 'expo-video'
import { StyleSheet, View, TouchableOpacity, Text, Animated, Modal } from 'react-native'
import * as Haptics from 'expo-haptics'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { router } from 'expo-router'
import { chainService } from '../../services/chainService'
import { soundManager } from '../../utils/SoundManager'
import { colors } from '../../constants/theme'
import { useSettingsStore } from '../../stores/settingsStore'
import { useFlowMusicStore } from '../../stores/flowMusicStore'
import { useRoutineStore } from '../../stores/routineStore'
import CustomizationModal from '../CustomizationModal'
import FlowIntegration from './FlowIntegration'
import FlowVideoPlayer from './FlowVideoPlayer'
import { useSaveChainEntry } from '../../hooks/useSupabaseQueries'
import type { SomiBlockSegment, MediaItem } from '../../types'

const OCEAN_VIDEO_URI = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20videos/ocean_loop_final.mp4'

// Convert a somi_block segment to the currentVideo shape
const videoFromSegment = (seg: SomiBlockSegment): MediaItem => ({
  id: seg.somi_block_id,
  url: seg.url,
  type: 'video',
  somi_block_id: seg.somi_block_id,
  name: seg.name,
  canonical_name: seg.canonical_name,
  description: seg.description,
  energy_delta: seg.energy_delta,
  safety_delta: seg.safety_delta,
  media_url: seg.url,
})

export default function SoMiRoutineScreen(): React.JSX.Element {
  const navigation = useNavigation()

  // ── Store state ───────────────────────────────────────────────────────────
  const {
    segments,
    segmentIndex,
    advanceSegment,
    currentVideo,
    savedInitialValue,
    savedInitialState,
    isQuickRoutine,
    flowType,
    setCurrentCycle,
    setPhase,
    setCurrentVideo,
    resetRoutine,
    setRemainingSeconds,
    setSegmentIndex,
  } = useRoutineStore()

  // Current segment drives everything
  const segment = segments[segmentIndex] ?? null
  const segmentType = segment?.type ?? null

  // ── Settings & music ──────────────────────────────────────────────────────
  const { isMusicEnabled, selectedTrackId } = useSettingsStore()
  const flowMusicStore = useFlowMusicStore()
  const { startFlowMusic, updateMusicSetting, stopFlowMusic, audioPlayer, pauseFlowMusic, resumeFlowMusic } = flowMusicStore

  // ── Mutation for saving completed blocks ──────────────────────────────────
  const saveChainEntryMutation = useSaveChainEntry()

  // ── Interstitial state ────────────────────────────────────────────────────
  const interstitialDuration = segment?.duration_seconds ?? 20
  const [countdown, setCountdown] = useState(interstitialDuration)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)
  const [interstitialPaused, setInterstitialPaused] = useState(false)
  const [infinityMode, setInfinityMode] = useState(false)
  const infinityModeRef = useRef(false)
  const countdownRef = useRef(interstitialDuration)
  const countdownIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // Track actual interstitial play time (wall clock minus pauses)
  const interstitialStartMsRef = useRef<number | null>(null)
  const interstitialPausedMsRef = useRef<number>(0)
  const interstitialPauseStartMsRef = useRef<number | null>(null)
  const interstitialProgressAnim = useRef(new Animated.Value(0)).current
  const oceanOpacity = useRef(new Animated.Value(0)).current
  const messageOpacity = useRef(new Animated.Value(1)).current
  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const infinityPulseAnim = useRef(new Animated.Value(1)).current

  // ── Video state ───────────────────────────────────────────────────────────
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(segment?.duration_seconds ?? 60)
  const [isPlayingState, setIsPlayingState] = useState(false)
  const [showBackground, setShowBackground] = useState(false)
  const startTimeRef = useRef<number | null>(null)
  const hasSavedCurrentBlockRef = useRef<boolean>(false)
  const hasCompletedCurrentBlockRef = useRef<boolean>(false)
  const videoProgressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isSeekingRef = useRef<boolean>(false)
  const shouldVideoPlayRef = useRef<boolean>(false)
  const isMountedRef = useRef<boolean>(true)

  // ── Shared UI state ───────────────────────────────────────────────────────
  const [showExitModal, setShowExitModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showOverlay, setShowOverlay] = useState(false)
  const overlayTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Pause/resume on navigation ────────────────────────────────────────────
  const wasPausedRef = useRef<boolean>(false)
  const pausedCountdownRef = useRef<number>(0)

  // ── Video players ─────────────────────────────────────────────────────────
  const videoUrl = currentVideo?.media_url || 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4'
  const player = useVideoPlayer(videoUrl, (player) => {
    player.muted = true
  })

  const oceanPlayer = useVideoPlayer(OCEAN_VIDEO_URI, (player) => {
    player.loop = true
    player.muted = true
  })

  const [previewUrl, setPreviewUrl] = useState(videoUrl)
  const previewPlayer = useVideoPlayer(previewUrl, (p) => {
    p.muted = true
    p.loop = true
  })

  // Stall recovery events
  const { isPlaying: mainIsPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })
  const { isPlaying: previewIsPlaying } = useEvent(previewPlayer, 'playingChange', { isPlaying: previewPlayer.playing })
  const { isPlaying: oceanIsPlaying } = useEvent(oceanPlayer, 'playingChange', { isPlaying: oceanPlayer.playing })

  // ── Derived: what "phase" are we in based on segment type ─────────────────
  // micro_integration → 'interstitial', somi_block → 'video'
  const phase = segmentType === 'somi_block' ? 'video' : 'interstitial'

  // Keep store phase in sync for FlowProgressHeader and other consumers
  useEffect(() => {
    setPhase(phase)
  }, [phase])

  // ── Track somi_block index for cycle counting ─────────────────────────────
  // Count how many somi_blocks are before the current segmentIndex
  const somiBlockIndex = segments.slice(0, segmentIndex).filter(s => s.type === 'somi_block').length
  useEffect(() => {
    setCurrentCycle(somiBlockIndex + 1)
  }, [somiBlockIndex])

  // ── Preload sound effects ─────────────────────────────────────────────────
  useEffect(() => {
    soundManager.preloadSounds()
    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
    }
  }, [])

  // Start flow music when players are ready — startFlowMusic guards against double-starts internally
  useEffect(() => {
    if (audioPlayer) {
      startFlowMusic(isMusicEnabled, selectedTrackId)
    }
  }, [audioPlayer])

  // Set initial currentVideo from the first somi_block segment
  useEffect(() => {
    if (segments.length === 0) return
    const firstSomiBlock = segments.find(s => s.type === 'somi_block')
    if (firstSomiBlock) {
      setCurrentVideo(videoFromSegment(firstSomiBlock))
    }
  }, [segments])

  // Sync currentVideo when entering an interstitial — preview the upcoming block
  useEffect(() => {
    if (phase === 'interstitial') {
      const nextSomiBlock = segments.slice(segmentIndex).find(s => s.type === 'somi_block')
      if (nextSomiBlock) {
        const video = videoFromSegment(nextSomiBlock)
        if (video.id !== currentVideo?.id) {
          setCurrentVideo(video)
        }
      }
    }
  }, [phase, segmentIndex])

  // ── Focus effect: resume interstitial after navigation ────────────────────
  useFocusEffect(
    React.useCallback(() => {
      if (wasPausedRef.current && phase === 'interstitial') {
        const resumeCountdown = pausedCountdownRef.current
        const segDuration = segment?.duration_seconds ?? 20
        setCountdown(resumeCountdown)

        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (infinityModeRef.current) return prev + 1
            if (prev <= 1) { clearInterval(countdownIntervalRef.current!); return 0 }
            return prev - 1
          })
        }, 1000)

        const elapsedTime = segDuration - resumeCountdown
        const remainingTime = resumeCountdown * 1000
        const initialProgress = elapsedTime / segDuration

        interstitialProgressAnim.setValue(initialProgress)
        Animated.timing(interstitialProgressAnim, {
          toValue: 1,
          duration: remainingTime,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) transitionToVideoPhase()
        })

        wasPausedRef.current = false
      }

      return () => {
        if (phase === 'interstitial') {
          if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current!)
          interstitialProgressAnim.stopAnimation()
        }
      }
    }, [phase, segment])
  )

  // ── Video playback control based on phase ─────────────────────────────────
  useEffect(() => {
    if (!player) return
    if (phase === 'video' && currentVideo) {
      shouldVideoPlayRef.current = true
      setTimeout(() => { try { player.play() } catch (e) { /* player released */ } }, 100)
      soundManager.playBlockStart()
    } else if (phase === 'interstitial') {
      shouldVideoPlayRef.current = false
      player.pause()
    }
  }, [phase, currentVideo, player])

  // Preload next video during video phase
  useEffect(() => {
    if (phase === 'video') {
      // Find the next somi_block segment in the array
      const nextSomiBlock = segments.slice(segmentIndex + 1).find(s => s.type === 'somi_block') as SomiBlockSegment | undefined
      if (nextSomiBlock?.url) {
        setPreviewUrl(nextSomiBlock.url)
      }
    } else if (phase === 'interstitial' && currentVideo?.media_url) {
      setPreviewUrl(currentVideo.media_url)
    }
  }, [phase, segmentIndex, segments, currentVideo?.media_url])

  // Play/pause previewPlayer based on interstitial state
  useEffect(() => {
    if (phase === 'interstitial') {
      previewPlayer.loop = true
      if (interstitialPaused) { previewPlayer.pause() } else { previewPlayer.play() }
    } else {
      previewPlayer.pause()
    }
  }, [phase, interstitialPaused, previewPlayer])

  // Flow music volume — updateMusicSetting handles both player.volume and volumeAnim
  useEffect(() => { updateMusicSetting(isMusicEnabled) }, [isMusicEnabled])

  // Mark unmounted for stall recovery
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Stall recovery: main player
  useEffect(() => {
    if (!mainIsPlaying && shouldVideoPlayRef.current) {
      const t = setTimeout(() => {
        if (isMountedRef.current && shouldVideoPlayRef.current) {
          try { player.play() } catch (e) { /* released */ }
        }
      }, 800)
      return () => clearTimeout(t)
    }
  }, [mainIsPlaying])

  // Stall recovery: preview player
  useEffect(() => {
    if (!previewIsPlaying && phase === 'interstitial' && !interstitialPaused) {
      const t = setTimeout(() => {
        if (isMountedRef.current && phase === 'interstitial' && !interstitialPaused) {
          try { previewPlayer.play() } catch (e) { /* released */ }
        }
      }, 500)
      return () => clearTimeout(t)
    }
  }, [previewIsPlaying])

  // Stall recovery: ocean player
  useEffect(() => {
    if (!oceanIsPlaying && phase === 'interstitial') {
      try { oceanPlayer.play() } catch (e) { /* released */ }
    }
  }, [oceanIsPlaying])

  // Ocean player: play during interstitial
  useEffect(() => {
    if (phase === 'interstitial') {
      oceanOpacity.setValue(0)
      oceanPlayer.play()
      Animated.timing(oceanOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    } else {
      oceanPlayer.pause()
    }
  }, [phase])

  // Keep countdownRef in sync
  useEffect(() => { countdownRef.current = countdown }, [countdown])

  // Live remaining-time updater
  useEffect(() => {
    const BLOCK_SECS = 60
    const INTERSTITIAL_SECS = 20
    // Count remaining somi_block segments after current
    const remainingBlocks = segments.slice(segmentIndex + 1).filter(s => s.type === 'somi_block').length
    const remainingIntegrations = segments.slice(segmentIndex + 1).filter(s => s.type === 'micro_integration').length
    const remainingBodyScans = segments.slice(segmentIndex + 1).filter(s => s.type === 'body_scan').length

    const tick = () => {
      const futureTime = remainingBlocks * BLOCK_SECS + remainingIntegrations * INTERSTITIAL_SECS + remainingBodyScans * 60
      if (phase === 'video') {
        const elapsed = player.currentTime || 0
        const inBlock = Math.max(0, BLOCK_SECS - elapsed)
        setRemainingSeconds(Math.round(inBlock + futureTime))
      } else if (phase === 'interstitial') {
        const interstitialLeft = countdownRef.current ?? INTERSTITIAL_SECS
        setRemainingSeconds(Math.round(interstitialLeft + futureTime))
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, segmentIndex, segments])

  // Interstitial progress animation — uses segment.duration_seconds
  useEffect(() => {
    if (phase === 'interstitial' && !wasPausedRef.current) {
      const duration = segment?.duration_seconds ?? 20
      interstitialProgressAnim.setValue(0)

      const runAnimation = () => {
        Animated.timing(interstitialProgressAnim, {
          toValue: 1,
          duration: duration * 1000,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            if (infinityModeRef.current) {
              interstitialProgressAnim.setValue(0)
              runAnimation()
            } else {
              transitionToVideoPhase()
            }
          }
        })
      }

      runAnimation()
      return () => {
        if (!wasPausedRef.current) interstitialProgressAnim.stopAnimation()
      }
    }
  }, [phase, segmentIndex])

  // Interstitial countdown timer — uses segment.duration_seconds
  useEffect(() => {
    if (phase === 'interstitial' && !wasPausedRef.current) {
      const duration = segment?.duration_seconds ?? 20
      setCountdown(duration)
      // Start interstitial play-time clock
      interstitialStartMsRef.current = Date.now()
      interstitialPausedMsRef.current = 0
      interstitialPauseStartMsRef.current = null

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (infinityModeRef.current) return prev + 1
          if (prev <= 1) { clearInterval(countdownIntervalRef.current!); return 0 }
          return prev - 1
        })
      }, 1000)

      return () => {
        if (countdownIntervalRef.current && !wasPausedRef.current) {
          clearInterval(countdownIntervalRef.current!)
        }
      }
    }
  }, [phase, segmentIndex])

  // Rotate integration messages
  useEffect(() => {
    if (phase === 'interstitial') {
      setCurrentMessageIndex(0)
      messageOpacity.setValue(1)

      messageIntervalRef.current = setInterval(() => {
        Animated.timing(messageOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
          setCurrentMessageIndex(prev => (prev + 1) % 6)
          Animated.timing(messageOpacity, { toValue: 1, duration: 500, useNativeDriver: true }).start()
        })
      }, 10000)

      return () => {
        if (messageIntervalRef.current) clearInterval(messageIntervalRef.current)
      }
    }
  }, [phase, segmentIndex])

  // Track video progress — uses segment.duration_seconds as cap
  useEffect(() => {
    if (phase !== 'video') return

    const cap = segment?.duration_seconds ?? 60
    const interval = setInterval(() => {
      if (player) {
        if (!isSeekingRef.current) {
          setVideoCurrentTime(player.currentTime || 0)
        }
        const actualDuration = player.duration || cap
        setVideoDuration(Math.min(actualDuration, cap))
        setIsPlayingState(player.playing)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [phase, player])

  // Auto-complete when video reaches cap — uses segment.duration_seconds
  useEffect(() => {
    if (phase !== 'video') return
    const cap = segment?.duration_seconds ?? 60
    if (videoDuration > 0 && videoCurrentTime >= Math.min(videoDuration, cap) - 0.5) {
      if (hasCompletedCurrentBlockRef.current) return
      hasCompletedCurrentBlockRef.current = true
      if (player) player.pause()
      handleVideoComplete()
    }
  }, [videoCurrentTime, videoDuration, phase, player])

  // ── Transition helpers ────────────────────────────────────────────────────

  const transitionToVideoPhase = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setInfinityMode(false)
    infinityModeRef.current = false

    // Record actual interstitial play time (wall clock minus pauses) for streak accounting
    if (interstitialStartMsRef.current != null && flowType === 'daily_flow') {
      const wallMs = Date.now() - interstitialStartMsRef.current
      const playedMs = wallMs - interstitialPausedMsRef.current
      const playedSeconds = Math.max(0, Math.round(playedMs / 1000))
      chainService.addExtraPlaySeconds(playedSeconds).then(() =>
        chainService.logPlayTime(`interstitial → video (added ${playedSeconds}s interstitial)`)
      )
      interstitialStartMsRef.current = null
    }

    // Advance from micro_integration to the next segment (should be somi_block)
    advanceSegment()

    try { player.currentTime = 0 } catch (_) {}
    setVideoCurrentTime(0)
    startTimeRef.current = Date.now()
    hasSavedCurrentBlockRef.current = false
    hasCompletedCurrentBlockRef.current = false
  }

  const advanceToNextSegment = () => {
    const nextIdx = segmentIndex + 1

    // Check if we've reached the end of segments
    if (nextIdx >= segments.length) {
      handleFlowComplete()
      return
    }

    const nextSegment = segments[nextIdx]

    // body_scan → navigate to FlowBodyScan
    if (nextSegment.type === 'body_scan') {
      setSegmentIndex(nextIdx + 1) // skip past the body_scan for when we return
      ;(navigation as any).replace('FlowBodyScan', {
        isInitial: false,
        duration_seconds: nextSegment.duration_seconds,
        savedInitialValue,
        savedInitialState,
        finalOrderIndex: somiBlockIndex + 1,
      })
      return
    }

    // micro_integration or somi_block → advance the index
    advanceSegment()

    // If we just moved to a somi_block, set currentVideo from the segment
    if (nextSegment.type === 'somi_block') {
      setCurrentVideo(videoFromSegment(nextSegment))
    }

    // If micro_integration, set currentVideo to the following somi_block
    if (nextSegment.type === 'micro_integration') {
      const followingSomiBlock = segments.slice(nextIdx + 1).find(s => s.type === 'somi_block')
      if (followingSomiBlock) {
        setCurrentVideo(videoFromSegment(followingSomiBlock))
      }
      const duration = nextSegment.duration_seconds ?? 20
      setCountdown(duration)
      setInterstitialPaused(false)
    }
  }

  const handleFlowComplete = () => {
    chainService.logPlayTime('🏁 flow complete — heading to outro')
    if (isQuickRoutine) {
      stopFlowMusic()
      resetRoutine()
      router.dismissAll()
    } else {
      ;(navigation as any).replace('FlowOutro', {
        fromPlayer: true,
        savedInitialValue,
        savedInitialState,
      })
    }
  }

  // ── Event handlers ────────────────────────────────────────────────────────

  const handleVideoComplete = async () => {
    shouldVideoPlayRef.current = false
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    soundManager.playBlockEnd()

    // Save the completed block using actual player position (not wall clock)
    if (currentVideo && !hasSavedCurrentBlockRef.current) {
      hasSavedCurrentBlockRef.current = true
      const cap = segment?.duration_seconds ?? 60
      const elapsedSeconds = Math.min(Math.round(player.currentTime || cap), cap)
      saveChainEntryMutation.mutate({
        somiBlockId: currentVideo.somi_block_id,
        secondsElapsed: elapsedSeconds,
        orderIndex: somiBlockIndex + 1,
        chainId: null,
        flowType: flowType,
        section: segment?.section ?? null,
      }, {
        onSettled: () => chainService.logPlayTime(`block #${somiBlockIndex + 1} complete (${elapsedSeconds}s)`),
      })
    }

    advanceToNextSegment()
  }

  const handleCloseVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    soundManager.playBlockEnd()

    // Save current video progress using actual player position (not wall clock)
    if (currentVideo && !hasSavedCurrentBlockRef.current) {
      hasSavedCurrentBlockRef.current = true
      const cap = segment?.duration_seconds ?? 60
      const elapsedSeconds = Math.min(Math.round(player.currentTime || 0), cap)
      saveChainEntryMutation.mutate({
        somiBlockId: currentVideo.somi_block_id,
        secondsElapsed: elapsedSeconds,
        orderIndex: somiBlockIndex + 1,
        chainId: null,
        flowType: flowType,
        section: segment?.section ?? null,
      }, {
        onSettled: () => chainService.logPlayTime(`block #${somiBlockIndex + 1} skipped (${elapsedSeconds}s)`),
      })
    }

    advanceToNextSegment()
  }

  const handleSkipInterstitial = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    interstitialProgressAnim.stopAnimation()
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current!)
    transitionToVideoPhase()
  }

  const handleScreenTap = () => {
    if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
    if (showOverlay) {
      setShowOverlay(false)
    } else {
      setShowOverlay(true)
      overlayTimeoutRef.current = setTimeout(() => setShowOverlay(false), 3000)
    }
  }

  const handleInterstitialPauseResume = () => {
    const segDuration = segment?.duration_seconds ?? 20
    if (!interstitialPaused) {
      setInterstitialPaused(true)
      pauseFlowMusic()
      wasPausedRef.current = true
      pausedCountdownRef.current = countdown
      // Track when pause started so we can subtract it from play time
      interstitialPauseStartMsRef.current = Date.now()
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current!)
        countdownIntervalRef.current = null
      }
      interstitialProgressAnim.stopAnimation()
    } else {
      setInterstitialPaused(false)
      resumeFlowMusic()
      wasPausedRef.current = false
      // Accumulate pause duration
      if (interstitialPauseStartMsRef.current != null) {
        interstitialPausedMsRef.current += Date.now() - interstitialPauseStartMsRef.current
        interstitialPauseStartMsRef.current = null
      }
      const elapsedTime = segDuration - countdown
      const remainingTime = countdown * 1000
      const initialProgress = elapsedTime / segDuration

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownIntervalRef.current!); return 0 }
          return prev - 1
        })
      }, 1000)

      interstitialProgressAnim.setValue(initialProgress)
      Animated.timing(interstitialProgressAnim, {
        toValue: 1,
        duration: remainingTime,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) transitionToVideoPhase()
      })
    }
  }

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (player.playing) {
      shouldVideoPlayRef.current = false
      player.pause()
      pauseFlowMusic()
    } else {
      shouldVideoPlayRef.current = true
      player.play()
      resumeFlowMusic()
    }
  }

  const handleExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    setShowExitModal(true)
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)
    stopFlowMusic()
    await chainService.clearSessionData()
    resetRoutine()
    router.dismissAll()
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
  }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (phase === 'interstitial') {
      wasPausedRef.current = true
      pausedCountdownRef.current = countdown
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current!)
      interstitialProgressAnim.stopAnimation()
    }

    if (phase === 'video' && player) {
      player.pause()
      wasPausedRef.current = true
    }

    setShowSettingsModal(true)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)
    const segDuration = segment?.duration_seconds ?? 20

    if (phase === 'interstitial' && wasPausedRef.current) {
      const resumeCountdown = pausedCountdownRef.current
      setCountdown(resumeCountdown)

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (infinityModeRef.current) return prev + 1
          if (prev <= 1) { clearInterval(countdownIntervalRef.current!); return 0 }
          return prev - 1
        })
      }, 1000)

      const elapsedTime = segDuration - resumeCountdown
      const remainingTime = resumeCountdown * 1000
      const initialProgress = elapsedTime / segDuration

      interstitialProgressAnim.setValue(initialProgress)
      Animated.timing(interstitialProgressAnim, {
        toValue: 1,
        duration: remainingTime,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) transitionToVideoPhase()
      })

      wasPausedRef.current = false
    }

    if (phase === 'video' && wasPausedRef.current && player) {
      player.play()
      wasPausedRef.current = false
    }
  }

  const handleOpenEditModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    if (phase === 'interstitial') {
      wasPausedRef.current = true
      pausedCountdownRef.current = countdown
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current!)
      interstitialProgressAnim.stopAnimation()
    }

    ;(navigation as any).navigate('RoutineQueuePreview', { isEditMode: true })
  }

  // ── Interstitial fill width ───────────────────────────────────────────────
  const interstitialFillWidth = interstitialProgressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  })

  // ── Render based on current segment type ──────────────────────────────────
  return (
    <View style={{ flex: 1 }}>
      {phase === 'interstitial' ? (
        <FlowIntegration
          oceanPlayer={oceanPlayer}
          oceanOpacity={oceanOpacity}
          previewPlayer={previewPlayer}
          currentVideo={currentVideo}
          isPaused={interstitialPaused}
          messageIndex={currentMessageIndex}
          messageOpacity={messageOpacity}
          fillWidth={interstitialFillWidth}
          showOverlay={showOverlay}
          onScreenTap={handleScreenTap}
          onPauseResume={handleInterstitialPauseResume}
          onSkip={handleSkipInterstitial}
          onExit={handleExit}
          onOpenSettings={handleOpenSettings}
        />
      ) : (
        <FlowVideoPlayer
          player={player}
          currentVideo={currentVideo}
          isPlaying={isPlayingState}
          videoCurrentTime={videoCurrentTime}
          videoDuration={videoDuration}
          showBackground={showBackground}
          showOverlay={showOverlay}
          onScreenTap={handleScreenTap}
          onPlayPause={handlePlayPause}
          onExit={handleExit}
          onOpenSettings={handleOpenSettings}
          onSkip={handleCloseVideo}
        />
      )}

      {/* Exit Bottom Sheet — shared across both phases */}
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

      {/* Settings Modal — shared across both phases */}
      <CustomizationModal visible={showSettingsModal} onClose={handleCloseSettings} />
    </View>
  )
}

const styles = StyleSheet.create({
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
