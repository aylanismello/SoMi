import React, { useState, useEffect, useRef } from 'react'
import { useEvent } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { StyleSheet, View, TouchableOpacity, Text, ScrollView, Animated, Pressable, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import PlayerControls from './PlayerControls'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { useFocusEffect, useNavigation } from '@react-navigation/native'
import { router } from 'expo-router'
import { chainService } from '../services/chainService'
import { api } from '../services/api'
import { selectRoutineVideo } from '../services/videoSelectionAlgorithm'
import { getBlocksForRoutine } from '../services/mediaService'
import { soundManager } from '../utils/SoundManager'
import { colors } from '../constants/theme'
import { useSettingsStore } from '../stores/settingsStore'
import { useFlowMusicStore } from '../stores/flowMusicStore'
import { useRoutineStore } from '../stores/routineStore'
import CustomizationModal from './CustomizationModal'
import FlowProgressHeader from './FlowProgressHeader'
import { useSettingsStore as useSettingsStoreForBodyScan } from '../stores/settingsStore'
import { useSaveChainEntry } from '../hooks/useSupabaseQueries'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

const OCEAN_VIDEO_URI = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20videos/ocean_loop_final.mp4'

// ============================================================================
// HACK: VIDEO DURATION CAP
// ============================================================================
// All videos capped at 60 seconds regardless of actual duration.
// TEMPORARY until we have properly trimmed 1-minute content.
// TODO: Remove this hack when videos are properly edited.
// ============================================================================
const VIDEO_DURATION_CAP_SECONDS = 60
const INTERSTITIAL_DURATION_SECONDS = 20

// Integration messages that rotate every 10 seconds
const INTEGRATION_MESSAGES = [
  "sense your body...\nnotice what's present",
  "where do you feel\nthis in your body?",
  "what sensations\nare you noticing?",
  "breathe into\nany tension",
  "allow whatever\nis here to be here",
  "notice without\njudging",
]

// Polyvagal state emojis and colors (new 2D model)
const STATE_EMOJIS = {
  shutdown: { emoji: '🌑', color: '#4A5A72' },
  restful:  { emoji: '🌦', color: '#4ECDC4' },
  wired:    { emoji: '🌪', color: '#8B5CF6' },
  glowing:  { emoji: '☀️', color: '#F4B942' },
  steady:   { emoji: '⛅', color: '#7DBCE7' },
}

export default function SoMiRoutineScreen() {
  const navigation = useNavigation()
  // Get all routine state from store
  const {
    currentCycle,
    totalBlocks,
    phase,
    hardcodedQueue,
    currentVideo,
    savedInitialValue,
    savedInitialState,
    routineType,
    isQuickRoutine,
    flowType,
    setCurrentCycle,
    setPhase,
    setQueue,
    setCurrentVideo,
    advanceCycle,
    resetRoutine,
    setRemainingSeconds,
  } = useRoutineStore()

  // Dynamic block count based on user selection
  const TOTAL_CYCLES = totalBlocks

  // Use stores instead of contexts
  const { isMusicEnabled } = useSettingsStore()
  const bodyScanEnd = useSettingsStoreForBodyScan(state => state.bodyScanEnd)
  const flowMusicStore = useFlowMusicStore()
  const { startFlowMusic, setVolume: setFlowMusicVolume, updateMusicSetting, stopFlowMusic, audioPlayer, pauseFlowMusic, resumeFlowMusic } = flowMusicStore

  // Mutation for saving completed blocks
  const saveChainEntryMutation = useSaveChainEntry()
  const [countdown, setCountdown] = useState(INTERSTITIAL_DURATION_SECONDS)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  // Video state
  const [videoQueue, setVideoQueue] = useState([])
  const [previousVideoId, setPreviousVideoId] = useState(null)
  const [selectedVideoId, setSelectedVideoId] = useState(null)
  const [userOverrodeBlock, setUserOverrodeBlock] = useState(false)

  // Loading state
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)

  // Exit confirmation modal
  const [showExitModal, setShowExitModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [interstitialPaused, setInterstitialPaused] = useState(false)
  const [allBlocks, setAllBlocks] = useState([])

  // Tap-to-show overlay (controls only visible on tap, auto-hides after 3s)
  const [showOverlay, setShowOverlay] = useState(false)
  const overlayTimeoutRef = useRef(null)

  // Infinity mode for interstitial
  const [infinityMode, setInfinityMode] = useState(false)
  const infinityModeRef = useRef(false)
  const savedCountdownRef = useRef(INTERSTITIAL_DURATION_SECONDS)
  const countdownRef = useRef(INTERSTITIAL_DURATION_SECONDS)

  // Pulsing animation for infinity symbol
  const infinityPulseAnim = useRef(new Animated.Value(1)).current

  // Video playback tracking
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(VIDEO_DURATION_CAP_SECONDS)
  const [isPlayingState, setIsPlayingState] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubbingPosition, setScrubbingPosition] = useState(0)
  const [showBackground, setShowBackground] = useState(false)

  const startTimeRef = useRef(null)
  const hasSavedCurrentBlockRef = useRef(false)
  const hasCompletedCurrentBlockRef = useRef(false) // Prevent double-completion bug
  const progressBarRef = useRef(null)
  const thumbScale = useRef(new Animated.Value(1)).current
  const isSeekingRef = useRef(false)
  const shouldVideoPlayRef = useRef(false) // intent tracker for stall recovery
  const isMountedRef = useRef(true)        // guards stall recovery after unmount

  // Refs
  const countdownIntervalRef = useRef(null)
  const videoProgressIntervalRef = useRef(null)
  const interstitialProgressAnim = useRef(new Animated.Value(0)).current
  const oceanOpacity = useRef(new Animated.Value(0)).current
  const messageOpacity = useRef(new Animated.Value(1)).current
  const messageIntervalRef = useRef(null)

  // Video player - always create with current video URL or fallback
  // IMPORTANT: All videos are muted (uploaded with sound by mistake)
  const videoUrl = currentVideo?.media_url || 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4'
  const player = useVideoPlayer(videoUrl, (player) => {
    player.muted = true
  })

  // Ocean video player — preloaded once at mount so interstitial has no black flash
  const oceanPlayer = useVideoPlayer(OCEAN_VIDEO_URI, (player) => {
    player.loop = true
    player.muted = true
  })

  // Preview player — dedicated player for the interstitial preview card.
  // During video phase we silently preload the NEXT block's URL so when the
  // interstitial renders it plays instantly with zero black flash.
  const [previewUrl, setPreviewUrl] = useState(videoUrl)
  const previewPlayer = useVideoPlayer(previewUrl, (p) => {
    p.muted = true
    p.loop = true
  })

  // Stall recovery: track playing state via events for all three players
  const { isPlaying: mainIsPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })
  const { isPlaying: previewIsPlaying } = useEvent(previewPlayer, 'playingChange', { isPlaying: previewPlayer.playing })
  const { isPlaying: oceanIsPlaying } = useEvent(oceanPlayer, 'playingChange', { isPlaying: oceanPlayer.playing })

  // Preload sound effects on mount for instant playback
  useEffect(() => {
    soundManager.preloadSounds()
    return () => {
      if (overlayTimeoutRef.current) clearTimeout(overlayTimeoutRef.current)
    }
  }, [])

  // Start flow music for quick routines (body scan flow starts music earlier)
  useEffect(() => {
    if (audioPlayer) {
      console.log('SoMiRoutineScreen: Using flow music player from App')
      // Only start music if this is a quick routine (no body scan before)
      if (isQuickRoutine) {
        console.log('SoMiRoutineScreen: Starting flow music for quick routine')
        startFlowMusic(isMusicEnabled)
      }
    }
  }, [audioPlayer, isQuickRoutine])

  // Fetch all available videos on mount
  useEffect(() => {
    fetchAvailableVideos()
  }, [])

  // Pause/resume countdown and animation when navigating away/back
  const wasPausedRef = useRef(false)
  const pausedCountdownRef = useRef(INTERSTITIAL_DURATION_SECONDS)

  useFocusEffect(
    React.useCallback(() => {
      // Resume if we paused when navigating away
      if (wasPausedRef.current && phase === 'interstitial') {
        console.log('Resuming interstitial animation from edit, countdown was:', pausedCountdownRef.current)

        // Set countdown back to the paused value
        setCountdown(pausedCountdownRef.current)

        // Restart countdown interval
        countdownIntervalRef.current = setInterval(() => {
          setCountdown(prev => {
            if (infinityModeRef.current) {
              // Infinity mode: count up
              return prev + 1
            } else {
              // Normal mode: count down
              if (prev <= 1) {
                clearInterval(countdownIntervalRef.current)
                return 0
              }
              return prev - 1
            }
          })
        }, 1000)

        // Resume progress animation from where we left off
        const elapsedTime = INTERSTITIAL_DURATION_SECONDS - pausedCountdownRef.current
        const remainingTime = pausedCountdownRef.current * 1000
        const initialProgress = elapsedTime / INTERSTITIAL_DURATION_SECONDS

        interstitialProgressAnim.setValue(initialProgress)

        Animated.timing(interstitialProgressAnim, {
          toValue: 1,
          duration: remainingTime,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            transitionToVideoPhase()
          }
        })

        wasPausedRef.current = false
      }

      return () => {
        // Cleanup when navigating away
        // Note: We don't capture countdown here because the explicit handlers
        // (handleOpenEditModal, handleOpenSettings) already do that.
        // This cleanup just ensures intervals are cleared.
        if (phase === 'interstitial') {
          if (countdownIntervalRef.current) {
            clearInterval(countdownIntervalRef.current)
          }
          interstitialProgressAnim.stopAnimation()
        }
      }
    }, [phase])
  )

  // Control video playback based on phase
  // Auto-play when entering video phase
  useEffect(() => {
    if (!player) return

    if (phase === 'video' && currentVideo) {
      shouldVideoPlayRef.current = true

      // Start playing
      console.log('▶️ Starting video:', currentVideo.name)
      setTimeout(() => {
        player.play()
      }, 100)

      // Play start sound when video begins
      console.log('🔊 Playing block start sound')
      soundManager.playBlockStart().catch(err => {
        console.error('Failed to play start sound:', err)
      })
    } else if (phase === 'interstitial') {
      shouldVideoPlayRef.current = false
      // Main player loads the new URL silently while previewPlayer shows it
      player.pause()
    }
  }, [phase, currentVideo, player])

  // Preload next video during video phase so the interstitial preview is instant.
  // During interstitial, switch previewUrl to currentVideo so there's no URL
  // change (preloadUrl === currentVideo.media_url = same string → no reload).
  useEffect(() => {
    if (phase === 'video' && videoQueue.length > 0) {
      const nextBlock = hardcodedQueue[currentCycle] // 0-indexed; currentCycle is 1-based
      if (nextBlock) {
        const nextVideoData = videoQueue.find(v => v.id === nextBlock.somi_block_id)
        if (nextVideoData?.media_url) {
          setPreviewUrl(nextVideoData.media_url)
        }
      }
    } else if (phase === 'interstitial' && currentVideo?.media_url) {
      setPreviewUrl(currentVideo.media_url)
    }
  }, [phase, currentCycle, videoQueue, hardcodedQueue, currentVideo?.media_url])

  // Play/pause previewPlayer based on interstitial state
  useEffect(() => {
    if (phase === 'interstitial') {
      previewPlayer.loop = true
      if (interstitialPaused) {
        previewPlayer.pause()
      } else {
        previewPlayer.play()
      }
    } else {
      // Silently buffer during video phase
      previewPlayer.pause()
    }
  }, [phase, interstitialPaused, previewPlayer])

  // Flow music is already playing - just manage volume
  useEffect(() => {
    // Keep flow music playing at full volume
    setFlowMusicVolume(isMusicEnabled ? 1 : 0)
  }, [isMusicEnabled])

  // Handle music setting changes
  useEffect(() => {
    updateMusicSetting(isMusicEnabled)
  }, [isMusicEnabled])

  // Mark unmounted so stall recovery timeouts don't fire on a dead player
  useEffect(() => {
    isMountedRef.current = true
    return () => { isMountedRef.current = false }
  }, [])

  // Stall recovery: main video player unexpectedly stopped during video phase
  useEffect(() => {
    if (!mainIsPlaying && shouldVideoPlayRef.current) {
      const t = setTimeout(() => {
        if (isMountedRef.current && shouldVideoPlayRef.current) {
          try {
            console.log('🔁 Stall recovery: restarting main video player')
            player.play()
          } catch (e) { /* player released during navigation */ }
        }
      }, 800)
      return () => clearTimeout(t)
    }
  }, [mainIsPlaying])

  // Stall recovery: preview player stopped during interstitial (not user-paused)
  useEffect(() => {
    if (!previewIsPlaying && phase === 'interstitial' && !interstitialPaused) {
      const t = setTimeout(() => {
        if (isMountedRef.current && phase === 'interstitial' && !interstitialPaused) {
          try {
            console.log('🔁 Stall recovery: restarting preview player')
            previewPlayer.play()
          } catch (e) { /* player released during navigation */ }
        }
      }, 500)
      return () => clearTimeout(t)
    }
  }, [previewIsPlaying])

  // Stall recovery: ocean player stopped during interstitial
  useEffect(() => {
    if (!oceanIsPlaying && phase === 'interstitial') {
      try {
        console.log('🔁 Stall recovery: restarting ocean player')
        oceanPlayer.play()
      } catch (e) { /* player released during navigation */ }
    }
  }, [oceanIsPlaying])

  const fetchAvailableVideos = async () => {
    try {
      setIsLoadingVideos(true)

      // Use queue from store (already set by RoutineQueuePreview or quick routine)
      let queue = hardcodedQueue
      if (!queue || queue.length === 0) {
        queue = await getBlocksForRoutine(totalBlocks, routineType)
        setQueue(queue)
      }

      // Get the canonical names from the queue to fetch block details
      const canonicalNames = queue.map(block => block.canonical_name)

      // Fetch block data from API
      const { blocks } = await api.getBlocks(canonicalNames)

      setVideoQueue(blocks || [])
      setAllBlocks(blocks || []) // Store all blocks for edit modal

      // Set initial video from queue
      if (queue && queue.length > 0 && blocks && blocks.length > 0) {
        const firstBlock = queue[0]
        // Find the full block data from fetched blocks
        const firstVideo = blocks.find(v => v.id === firstBlock.somi_block_id)
        if (firstVideo) {
          setCurrentVideo(firstVideo)
          setSelectedVideoId(firstVideo.id)
        }
      }
    } catch (err) {
      console.error('Unexpected error fetching videos:', err)
    } finally {
      setIsLoadingVideos(false)
    }
  }

  // Recalculate currentVideo when queue is edited
  useEffect(() => {
    // Only update if we're in interstitial phase and have a valid queue
    if (phase === 'interstitial' && hardcodedQueue && hardcodedQueue.length > 0) {
      // Get the block for the current cycle from the updated queue
      const nextBlock = hardcodedQueue[currentCycle - 1]
      console.log(`🔁 [useEffect] Sync check - Cycle: ${currentCycle}, Phase: ${phase}`)
      console.log(`   Queue block[${currentCycle - 1}]:`, nextBlock?.name, `(ID: ${nextBlock?.somi_block_id})`)
      console.log(`   Current video:`, currentVideo?.name, `(ID: ${currentVideo?.id})`)

      if (nextBlock && nextBlock.somi_block_id !== currentVideo?.id) {
        console.log(`🔄 [useEffect] MISMATCH! Updating currentVideo from queue`)
        // Use the block data directly from hardcodedQueue - it already has everything we need
        // Transform it to match the currentVideo format
        const blockAsVideo = {
          id: nextBlock.somi_block_id,
          name: nextBlock.name,
          description: nextBlock.description,
          energy_delta: nextBlock.energy_delta,
          safety_delta: nextBlock.safety_delta,
          media_url: nextBlock.url,
          canonical_name: nextBlock.canonical_name,
        }

        setCurrentVideo(blockAsVideo)
        setSelectedVideoId(nextBlock.somi_block_id)
      } else {
        console.log(`✅ [useEffect] Match - no update needed`)
      }
    }
  }, [hardcodedQueue, phase, currentCycle, currentVideo])

  // Ocean player: play during interstitial, pause otherwise
  useEffect(() => {
    if (phase === 'interstitial') {
      oceanOpacity.setValue(0)
      oceanPlayer.play()
      Animated.timing(oceanOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start()
    } else {
      oceanPlayer.pause()
    }
  }, [phase])

  // Keep countdownRef in sync so the tick closure always has the live value
  useEffect(() => { countdownRef.current = countdown }, [countdown])

  // Live remaining-time updater — runs every second, pushes to store for FlowProgressHeader
  useEffect(() => {
    const BLOCK_SECS = 60
    const INTERSTITIAL_SECS = 20
    const blocksAfterCurrent = Math.max(0, totalBlocks - currentCycle)

    const tick = () => {
      if (phase === 'video') {
        const elapsed = player.currentTime || 0
        const inBlock = Math.max(0, BLOCK_SECS - elapsed)
        setRemainingSeconds(Math.round(inBlock + blocksAfterCurrent * (BLOCK_SECS + INTERSTITIAL_SECS)))
      } else if (phase === 'interstitial') {
        const interstitialLeft = countdownRef.current ?? INTERSTITIAL_SECS
        setRemainingSeconds(Math.round(interstitialLeft + BLOCK_SECS + blocksAfterCurrent * (BLOCK_SECS + INTERSTITIAL_SECS)))
      }
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [phase, currentCycle, totalBlocks])

  // Smooth animation for interstitial progress circle
  useEffect(() => {
    if (phase === 'interstitial' && !wasPausedRef.current) {
      // Only start fresh animation if we're not resuming from a pause
      // Reset and start animation
      interstitialProgressAnim.setValue(0)

      const runAnimation = () => {
        Animated.timing(interstitialProgressAnim, {
          toValue: 1,
          duration: INTERSTITIAL_DURATION_SECONDS * 1000,
          useNativeDriver: false,
        }).start(({ finished }) => {
          if (finished) {
            if (infinityModeRef.current) {
              // In infinity mode, reset and loop
              interstitialProgressAnim.setValue(0)
              runAnimation()
            } else {
              // Normal mode, transition to video phase
              transitionToVideoPhase()
            }
          }
        })
      }

      runAnimation()

      return () => {
        // Don't stop animation here if we're about to pause (useFocusEffect will handle it)
        if (!wasPausedRef.current) {
          interstitialProgressAnim.stopAnimation()
        }
      }
    }
  }, [phase, currentCycle])

  // Interstitial countdown timer (for display only)
  useEffect(() => {
    if (phase === 'interstitial' && !wasPausedRef.current) {
      // Only start fresh countdown if we're not resuming from a pause
      // Reset countdown to full duration when entering interstitial
      setCountdown(INTERSTITIAL_DURATION_SECONDS)

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (infinityModeRef.current) {
            // Infinity mode: count up
            return prev + 1
          } else {
            // Normal mode: count down
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current)
              return 0
            }
            return prev - 1
          }
        })
      }, 1000)

      return () => {
        // Don't clear interval here if we're about to pause (useFocusEffect will handle it)
        if (countdownIntervalRef.current && !wasPausedRef.current) {
          clearInterval(countdownIntervalRef.current)
        }
      }
    }
  }, [phase, currentCycle])

  // Rotate integration messages every 10 seconds with fade effect
  useEffect(() => {
    if (phase === 'interstitial') {
      // Reset message index when entering interstitial
      setCurrentMessageIndex(0)
      messageOpacity.setValue(1)

      messageIntervalRef.current = setInterval(() => {
        // Fade out
        Animated.timing(messageOpacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start(() => {
          // Change message
          setCurrentMessageIndex(prev => (prev + 1) % INTEGRATION_MESSAGES.length)

          // Fade in
          Animated.timing(messageOpacity, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }).start()
        })
      }, 10000) // Every 10 seconds

      return () => {
        if (messageIntervalRef.current) {
          clearInterval(messageIntervalRef.current)
        }
      }
    }
  }, [phase, currentCycle])

  // Track media playback progress
  useEffect(() => {
    if (phase !== 'video') return

    const interval = setInterval(() => {
      if (player) {
        // Don't update currentTime from player if we just seeked
        if (!isSeekingRef.current) {
          const actualTime = player.currentTime || 0
          setVideoCurrentTime(actualTime)
        }
        // ============================================================================
        // HACK: 60-SECOND CAP
        // Cap duration at 60 seconds regardless of actual video duration
        // ============================================================================
        const actualDuration = player.duration || VIDEO_DURATION_CAP_SECONDS
        setVideoDuration(Math.min(actualDuration, VIDEO_DURATION_CAP_SECONDS))
        setIsPlayingState(player.playing)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [phase, player])

  // Auto-navigate when video ends (60-second cap)
  useEffect(() => {
    if (phase !== 'video') return

    // ============================================================================
    // HACK: 60-SECOND CAP
    // Force completion at 60 seconds regardless of actual video duration
    // ============================================================================
    if (videoDuration > 0 && videoCurrentTime >= Math.min(videoDuration, VIDEO_DURATION_CAP_SECONDS) - 0.5) {
      // GUARD: Prevent double-completion when useEffect fires multiple times
      if (hasCompletedCurrentBlockRef.current) {
        console.log('⚠️ Completion already handled, skipping duplicate call')
        return
      }

      console.log('✅ Video reached end, marking as completed')
      hasCompletedCurrentBlockRef.current = true

      if (player) {
        player.pause()
      }
      handleVideoComplete()
    }
  }, [videoCurrentTime, videoDuration, phase, player])

  const transitionToVideoPhase = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Reset infinity mode for next interstitial
    setInfinityMode(false)
    infinityModeRef.current = false

    // Ensure main player starts from the beginning (guard against stale native object)
    try { player.currentTime = 0 } catch (_) {}

    setPhase('video')
    setVideoProgress(0)
    setVideoCurrentTime(0)
    // Track start time for elapsed time calculation
    startTimeRef.current = Date.now()
    hasSavedCurrentBlockRef.current = false // Reset save guard for new block
    hasCompletedCurrentBlockRef.current = false // Reset completion guard for new block
  }

  const handleSkipInterstitial = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    interstitialProgressAnim.stopAnimation()
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
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
    if (!interstitialPaused) {
      // Pause
      setInterstitialPaused(true)
      pauseFlowMusic()
      wasPausedRef.current = true
      pausedCountdownRef.current = countdown
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
        countdownIntervalRef.current = null
      }
      interstitialProgressAnim.stopAnimation()
    } else {
      // Resume
      setInterstitialPaused(false)
      resumeFlowMusic()
      wasPausedRef.current = false
      const elapsedTime = INTERSTITIAL_DURATION_SECONDS - countdown
      const remainingTime = countdown * 1000
      const initialProgress = elapsedTime / INTERSTITIAL_DURATION_SECONDS

      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) { clearInterval(countdownIntervalRef.current); return 0 }
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
    // Don't close overlay - let user see the state change
  }

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const currentlyPlaying = player.playing

    if (currentlyPlaying) {
      shouldVideoPlayRef.current = false
      player.pause()
      pauseFlowMusic()
    } else {
      shouldVideoPlayRef.current = true
      player.play()
      resumeFlowMusic()
    }
    // Don't close overlay - let user see the state change
  }

  const handleSkipBackward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newTime = Math.max(0, videoCurrentTime - 15)
    player.currentTime = newTime
  }

  const handleSkipForward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const cappedDuration = Math.min(videoDuration, VIDEO_DURATION_CAP_SECONDS)
    const newTime = Math.min(cappedDuration, videoCurrentTime + 15)
    player.currentTime = newTime
  }


  const calculatePosition = (touchX, barWidth) => {
    const cappedDuration = Math.min(videoDuration, VIDEO_DURATION_CAP_SECONDS)
    const seekPosition = (touchX / barWidth) * cappedDuration
    return Math.max(0, Math.min(cappedDuration, seekPosition))
  }

  const handleProgressBarTouch = (event) => {
    if (!progressBarRef.current || !videoDuration) return

    const touch = event.nativeEvent

    setIsScrubbing(true)
    Animated.spring(thumbScale, {
      toValue: 2,
      useNativeDriver: true,
    }).start()

    progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
      const touchX = touch.pageX - pageX
      const position = calculatePosition(touchX, width)
      setScrubbingPosition(position)
    })
  }

  const handleProgressBarMove = (event) => {
    if (!isScrubbing || !progressBarRef.current || !videoDuration) return

    const touch = event.nativeEvent
    progressBarRef.current.measure((x, y, width, height, pageX, pageY) => {
      const touchX = touch.pageX - pageX
      const position = calculatePosition(touchX, width)
      setScrubbingPosition(position)
    })
  }

  const handleProgressBarRelease = () => {
    if (!isScrubbing) return

    // Actually seek to the scrubbed position
    isSeekingRef.current = true
    player.currentTime = scrubbingPosition
    setVideoCurrentTime(scrubbingPosition)

    setIsScrubbing(false)
    Animated.spring(thumbScale, {
      toValue: 1,
      useNativeDriver: true,
    }).start()

    // Allow interval to resume updating after seek completes
    setTimeout(() => {
      isSeekingRef.current = false
    }, 500)
  }

  const handleVideoComplete = async () => {
    shouldVideoPlayRef.current = false
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    console.log('🔊 Playing block end sound (video complete)')
    soundManager.playBlockEnd().catch(err => {
      console.error('Failed to play end sound:', err)
    })

    // Save the completed block (prevent duplicate saves)
    if (currentVideo && !hasSavedCurrentBlockRef.current) {
      hasSavedCurrentBlockRef.current = true
      const elapsedSeconds = Math.min(
        Math.round((Date.now() - startTimeRef.current) / 1000),
        VIDEO_DURATION_CAP_SECONDS
      )
      saveChainEntryMutation.mutate({
        somiBlockId: currentVideo.id,
        secondsElapsed: elapsedSeconds,
        orderIndex: currentCycle,
        chainId: null, // always null — session handles it for daily flows
        flowType: flowType,
        section: hardcodedQueue[currentCycle - 1]?.section ?? null,
      })
    }

    // Check if we've completed all cycles
    if (currentCycle >= TOTAL_CYCLES) {
      // Quick routines: go straight home (no body scan, no check-in)
      if (isQuickRoutine) {
        // Stop flow music
        stopFlowMusic()

        // Reset routine store
        resetRoutine()

        // Go home
        router.dismissAll()
      } else {
        // Daily flow: check bodyScanEnd setting
        if (bodyScanEnd) {
          // Flow music continues playing into final body scan
          navigation.replace('BodyScanCountdown', {
            isInitial: false,
            savedInitialValue,
            savedInitialState,
            finalOrderIndex: currentCycle + 1,
          })
        } else {
          // Skip body scan, go straight to closing check-in
          navigation.replace('SoMiCheckIn', {
            fromPlayer: true,
            savedInitialValue,
            savedInitialState,
          })
        }
      }
    } else {
      // Move to next cycle
      advanceCycle()

      // Get the updated cycle value from store after increment
      const { currentCycle: updatedCycle } = useRoutineStore.getState()

      // Get next video from hardcoded queue (if not overridden by user)
      let nextVideo = null
      console.log(`\n🔄 [CYCLE ${currentCycle} → ${updatedCycle}] Advancing to next block`)
      console.log(`📋 hardcodedQueue length: ${hardcodedQueue?.length || 0}`)
      console.log(`📺 videoQueue length: ${videoQueue.length}`)

      if (hardcodedQueue && hardcodedQueue.length >= updatedCycle) {
        const nextBlock = hardcodedQueue[updatedCycle - 1]
        console.log(`🎯 Target block from queue[${updatedCycle - 1}]:`, nextBlock?.name, `(somi_block_id: ${nextBlock?.somi_block_id})`)
        console.log(`🔍 Searching videoQueue for ID ${nextBlock?.somi_block_id}...`)
        console.log(`   videoQueue IDs:`, videoQueue.map(v => `${v.id}:${v.name}`).join(', '))

        nextVideo = videoQueue.find(v => v.id === nextBlock.somi_block_id)
        console.log(nextVideo ? `✅ FOUND: ${nextVideo.name}` : `❌ NOT FOUND - will use fallback!`)
      }

      // Fallback to algorithm if hardcoded queue is empty or incomplete
      if (!nextVideo) {
        console.warn(`⚠️⚠️⚠️ FALLBACK ALGORITHM TRIGGERED! This explains random behavior!`)
        const stateTarget = STATE_CODE_TO_TARGET[savedInitialState] || 'settling'
        nextVideo = selectRoutineVideo(videoQueue, stateTarget, currentVideo?.id)
        console.log(`🎲 Algorithm selected random block:`, nextVideo?.name)
      }

      setCurrentVideo(nextVideo)
      setSelectedVideoId(nextVideo?.id)
      setPreviousVideoId(currentVideo?.id)
      setUserOverrodeBlock(false) // Reset override flag for next cycle

      // Reset to interstitial phase
      setPhase('interstitial')
      setCountdown(INTERSTITIAL_DURATION_SECONDS)
    }
  }

  const handleVideoSelect = (video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentVideo(video)
    setSelectedVideoId(video.id)
    setUserOverrodeBlock(true) // User manually chose a different block
  }

  const handleExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    // Always show confirmation modal when exiting
    setShowExitModal(true)
  }

  const handleCloseVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    console.log('🔊 Playing block end sound (video closed)')
    soundManager.playBlockEnd().catch(err => {
      console.error('Failed to play end sound:', err)
    })

    // Save current video progress (prevent duplicate saves)
    if (currentVideo && startTimeRef.current && !hasSavedCurrentBlockRef.current) {
      hasSavedCurrentBlockRef.current = true
      const elapsedSeconds = Math.min(
        Math.round((Date.now() - startTimeRef.current) / 1000),
        VIDEO_DURATION_CAP_SECONDS
      )
      saveChainEntryMutation.mutate({
        somiBlockId: currentVideo.id,
        secondsElapsed: elapsedSeconds,
        orderIndex: currentCycle,
        chainId: null, // always null — session handles it for daily flows
        flowType: flowType,
        section: hardcodedQueue[currentCycle - 1]?.section ?? null,
      })
    }

    // Go to next interstitial (same logic as handleVideoComplete)
    if (currentCycle >= TOTAL_CYCLES) {
      // Quick routines: go straight home (no body scan, no check-in)
      if (isQuickRoutine) {
        // Stop flow music
        stopFlowMusic()

        // Reset routine store
        resetRoutine()

        // Go home
        router.dismissAll()
      } else {
        // Daily flow: check bodyScanEnd setting
        if (bodyScanEnd) {
          // Flow music continues playing into final body scan
          navigation.replace('BodyScanCountdown', {
            isInitial: false,
            savedInitialValue,
            savedInitialState,
            finalOrderIndex: currentCycle + 1,
          })
        } else {
          // Skip body scan, go straight to closing check-in
          navigation.replace('SoMiCheckIn', {
            fromPlayer: true,
            savedInitialValue,
            savedInitialState,
          })
        }
      }
    } else {
      // Move to next cycle
      advanceCycle()

      // Get the updated cycle value from store after increment
      const { currentCycle: updatedCycle } = useRoutineStore.getState()

      // Get next video from hardcoded queue (if not overridden by user)
      let nextVideo = null
      console.log(`\n🔄 [CYCLE ${currentCycle} → ${updatedCycle}] Advancing to next block`)
      console.log(`📋 hardcodedQueue length: ${hardcodedQueue?.length || 0}`)
      console.log(`📺 videoQueue length: ${videoQueue.length}`)

      if (hardcodedQueue && hardcodedQueue.length >= updatedCycle) {
        const nextBlock = hardcodedQueue[updatedCycle - 1]
        console.log(`🎯 Target block from queue[${updatedCycle - 1}]:`, nextBlock?.name, `(somi_block_id: ${nextBlock?.somi_block_id})`)
        console.log(`🔍 Searching videoQueue for ID ${nextBlock?.somi_block_id}...`)
        console.log(`   videoQueue IDs:`, videoQueue.map(v => `${v.id}:${v.name}`).join(', '))

        nextVideo = videoQueue.find(v => v.id === nextBlock.somi_block_id)
        console.log(nextVideo ? `✅ FOUND: ${nextVideo.name}` : `❌ NOT FOUND - will use fallback!`)
      }

      // Fallback to algorithm if hardcoded queue is empty or incomplete
      if (!nextVideo) {
        console.warn(`⚠️⚠️⚠️ FALLBACK ALGORITHM TRIGGERED! This explains random behavior!`)
        const stateTarget = STATE_CODE_TO_TARGET[savedInitialState] || 'settling'
        nextVideo = selectRoutineVideo(videoQueue, stateTarget, currentVideo?.id)
        console.log(`🎲 Algorithm selected random block:`, nextVideo?.name)
      }

      setCurrentVideo(nextVideo)
      setSelectedVideoId(nextVideo?.id)
      setPreviousVideoId(currentVideo?.id)
      setUserOverrodeBlock(false) // Reset override flag for next cycle

      // Reset to interstitial phase
      setPhase('interstitial')
      setCountdown(INTERSTITIAL_DURATION_SECONDS)
    }
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)

    // Stop flow music when exiting early
    stopFlowMusic()

    // Discard session data — flow was abandoned before completion
    await chainService.clearSessionData()

    // Reset routine store
    resetRoutine()

    router.dismissAll()
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
  }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Pause countdown and animation when opening settings during interstitial
    if (phase === 'interstitial') {
      wasPausedRef.current = true
      pausedCountdownRef.current = countdown

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      interstitialProgressAnim.stopAnimation()
    }

    // Pause video when opening settings during video phase
    if (phase === 'video' && player) {
      player.pause()
      wasPausedRef.current = true
    }

    setShowSettingsModal(true)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)

    // Resume countdown and animation when closing settings during interstitial
    if (phase === 'interstitial' && wasPausedRef.current) {
      console.log('Resuming from settings, countdown was:', pausedCountdownRef.current)

      // Set countdown back to the paused value
      setCountdown(pausedCountdownRef.current)

      // Restart countdown interval
      countdownIntervalRef.current = setInterval(() => {
        setCountdown(prev => {
          if (infinityModeRef.current) {
            // Infinity mode: count up
            return prev + 1
          } else {
            // Normal mode: count down
            if (prev <= 1) {
              clearInterval(countdownIntervalRef.current)
              return 0
            }
            return prev - 1
          }
        })
      }, 1000)

      // Resume progress animation from where we left off
      const elapsedTime = INTERSTITIAL_DURATION_SECONDS - pausedCountdownRef.current
      const remainingTime = pausedCountdownRef.current * 1000
      const initialProgress = elapsedTime / INTERSTITIAL_DURATION_SECONDS

      interstitialProgressAnim.setValue(initialProgress)

      Animated.timing(interstitialProgressAnim, {
        toValue: 1,
        duration: remainingTime,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          transitionToVideoPhase()
        }
      })

      wasPausedRef.current = false
    }

    // Resume video when closing settings during video phase
    if (phase === 'video' && wasPausedRef.current && player) {
      player.play()
      wasPausedRef.current = false
    }
  }

  const handleToggleInfinity = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    const newMode = !infinityMode
    setInfinityMode(newMode)
    infinityModeRef.current = newMode

    if (newMode) {
      // Toggling to infinity mode - save current countdown value and stop the animation
      savedCountdownRef.current = countdown
      interstitialProgressAnim.stopAnimation()

      // Start pulsing animation for infinity symbol
      Animated.loop(
        Animated.sequence([
          Animated.timing(infinityPulseAnim, {
            toValue: 1.15,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(infinityPulseAnim, {
            toValue: 1,
            duration: 1500,
            useNativeDriver: true,
          }),
        ])
      ).start()
    } else {
      // Toggling back to normal mode from infinity
      // Restore countdown to saved value (where it was when infinity was enabled)
      const resumeCountdown = savedCountdownRef.current
      setCountdown(resumeCountdown)

      // Stop pulsing animation
      infinityPulseAnim.stopAnimation()
      infinityPulseAnim.setValue(1)

      // Calculate how much time has elapsed and resume animation from there
      const elapsedTime = INTERSTITIAL_DURATION_SECONDS - resumeCountdown
      const remainingTime = resumeCountdown * 1000
      const initialProgress = elapsedTime / INTERSTITIAL_DURATION_SECONDS

      // Stop and restart the animation from where we left off
      interstitialProgressAnim.stopAnimation()
      interstitialProgressAnim.setValue(initialProgress)

      Animated.timing(interstitialProgressAnim, {
        toValue: 1,
        duration: remainingTime,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && !infinityModeRef.current) {
          transitionToVideoPhase()
        }
      })
    }
  }

  const handleOpenEditModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Pause countdown and animation when opening edit modal
    if (phase === 'interstitial') {
      wasPausedRef.current = true
      pausedCountdownRef.current = countdown

      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
      interstitialProgressAnim.stopAnimation()
    }

    // Navigate to RoutineQueuePreview in edit mode
    // Queue is already in store, preview will read from there
    // The countdown will resume via useFocusEffect when we return
    navigation.navigate('RoutineQueuePreview', {
      isEditMode: true,
    })
  }

  const handleBlockSelectFromEdit = (selectedBlock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Update the current video to the selected block
    setCurrentVideo(selectedBlock)
    setSelectedVideoId(selectedBlock.id)

    // Update queue in store using the action
    const blockData = {
      somi_block_id: selectedBlock.id,
      name: selectedBlock.name,
      canonical_name: selectedBlock.canonical_name,
      url: selectedBlock.media_url,
      type: 'video',
    }

    // Update the block at the current position in the queue
    useRoutineStore.getState().updateBlockInQueue(currentCycle - 1, blockData)

    setShowEditModal(false)
  }

  // Loading state
  if (isLoadingVideos) {
    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
        style={styles.container}
      >
        <Text style={styles.loadingText}>Loading routine...</Text>
      </LinearGradient>
    )
  }

  // Interstitial Phase
  if (phase === 'interstitial') {
    const barWidth = interstitialProgressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    })

    return (
      <View style={styles.interstitialContainer}>
        {/* Ocean background video — preloaded, no black flash */}
        <Animated.View style={[StyleSheet.absoluteFillObject, { opacity: oceanOpacity }]}>
          <VideoView
            player={oceanPlayer}
            style={StyleSheet.absoluteFillObject}
            contentFit="cover"
            nativeControls={false}
          />
        </Animated.View>
        {/* Dark overlay */}
        <View style={[StyleSheet.absoluteFillObject, styles.interstitialOverlay]} />

        <FlowProgressHeader />

        {/* Main content — tappable to show overlay controls */}
        <Pressable style={styles.interstitialContent} onPress={handleScreenTap}>
          {/* Rotating integration message — smaller above the card */}
          <Animated.Text style={[styles.integrationMessage, { opacity: messageOpacity }]}>
            {INTEGRATION_MESSAGES[currentMessageIndex]}
          </Animated.Text>

          {/* Small next block video preview */}
          {currentVideo?.media_url && (
            <View style={styles.previewCard}>
              <VideoView
                player={previewPlayer}
                style={StyleSheet.absoluteFillObject}
                contentFit="cover"
                nativeControls={false}
              />
              {/* Gradient + "UP NEXT" + block name overlaid at top of card */}
              <LinearGradient
                colors={['rgba(0,0,0,0.7)', 'transparent']}
                style={styles.previewTopOverlay}
              >
                <Text style={styles.previewLabel}>UP NEXT</Text>
                <Text style={styles.previewName}>{currentVideo.name}</Text>
              </LinearGradient>
            </View>
          )}
        </Pressable>

        <PlayerControls
          isPaused={interstitialPaused}
          onPause={handleInterstitialPauseResume}
          onPlay={handleInterstitialPauseResume}
          onStop={handleExit}
          onOpenSettings={handleOpenSettings}
          skipLabel="Skip Integration"
          onSkip={handleSkipInterstitial}
          fillWidth={barWidth}
          showControls={showOverlay}
        />

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

        <CustomizationModal visible={showSettingsModal} onClose={handleCloseSettings} />
      </View>
    )
  }

  // Video Phase - Simplified with FlowProgressHeader + always-visible countdown
  const cappedDuration = Math.min(videoDuration, VIDEO_DURATION_CAP_SECONDS)

  return (
    <View style={styles.videoContainer}>
      {/* Flow Progress Header - always visible at top */}
      <View style={styles.videoProgressHeader}>
        <FlowProgressHeader />
      </View>

      <Pressable style={styles.videoPlayerArea} onPress={handleScreenTap}>
        {showBackground ? (
          <LinearGradient
            colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
            style={styles.backgroundGradient}
          >
            <Text style={styles.backgroundText}>SoMi</Text>
            <Text style={styles.backgroundSubtext}>audio only</Text>
          </LinearGradient>
        ) : (
          player && (
            <VideoView
              style={styles.video}
              player={player}
              nativeControls={false}
              contentFit="cover"
            />
          )
        )}
      </Pressable>

      <PlayerControls
        isPaused={!isPlayingState}
        onPause={handlePlayPause}
        onPlay={handlePlayPause}
        onStop={handleExit}
        onOpenSettings={handleOpenSettings}
        skipLabel="Skip Block"
        onSkip={handleVideoComplete}
        fillWidth={`${Math.min(100, (videoCurrentTime / Math.max(1, cappedDuration)) * 100)}%`}
        showControls={showOverlay}
      />

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

      <CustomizationModal visible={showSettingsModal} onClose={handleCloseSettings} />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 48,
    paddingHorizontal: 24,
  },
  loadingText: {
    color: colors.text.primary,
    fontSize: 18,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 100,
  },
  blockCounter: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    marginBottom: 12,
  },
  settingsButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsButtonText: {
    fontSize: 24,
  },
  settingsText: {
    fontSize: 24,
  },
  exitButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  exitButtonIcon: {
    color: colors.text.secondary,
    fontSize: 20,
    fontWeight: '400',
  },
  skipButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: colors.surface.tertiary,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  skipButtonText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '600',
  },
  interstitialContainer: {
    flex: 1,
    backgroundColor: '#000',
    paddingTop: 48,
  },
  interstitialOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  interstitialContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  integrationMessage: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 22,
    fontWeight: '300',
    textAlign: 'center',
    lineHeight: 32,
    letterSpacing: 0.2,
    marginBottom: 40,
  },
  previewCard: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111',
    position: 'relative',
  },
  previewTopOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 40,
  },
  previewLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  previewName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.2,
    lineHeight: 20,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 60,
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    color: colors.text.primary,
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: 2,
  },
  countdownText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 0.5,
    opacity: 0.5,
    marginTop: 4,
  },
  infinitySymbol: {
    color: '#9D7CFF',
    fontSize: 72,
    fontWeight: '300',
  },
  infinityHint: {
    color: colors.text.muted,
    fontSize: 11,
    fontWeight: '500',
    letterSpacing: 0.5,
    opacity: 0.6,
    marginTop: 8,
  },
  nextVideoSection: {
    marginBottom: 24,
    paddingHorizontal: 24,
    width: '100%',
  },
  nextVideoLabel: {
    color: colors.text.muted,
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 4,
    textAlign: 'center',
  },
  nextVideoCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.accent.primary,
    shadowColor: colors.accent.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  nextVideoBlur: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: 'center',
    gap: 6,
  },
  nextVideoName: {
    color: colors.text.primary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  nextVideoDescription: {
    color: colors.text.secondary,
    fontSize: 12,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 16,
  },
  nextVideoBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
  },
  nextVideoBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  carouselSection: {
    marginBottom: 8,
    width: '100%',
  },
  carouselLabel: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 8,
    paddingHorizontal: 24,
    textAlign: 'center',
  },
  carouselContent: {
    paddingHorizontal: 4,
    gap: 16,
  },
  carouselCard: {
    width: 180,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
  },
  carouselCardUnselected: {
    borderColor: colors.border.subtle,
  },
  carouselCardBlur: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    minHeight: 65,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  carouselCardName: {
    color: colors.text.primary,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 17,
  },
  carouselCardBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 4,
  },
  carouselCardBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  videoContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoPlayerArea: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
  backgroundGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundText: {
    color: colors.text.primary,
    fontSize: 64,
    fontWeight: '700',
    letterSpacing: 4,
    marginBottom: 16,
  },
  backgroundSubtext: {
    color: colors.text.muted,
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 1,
  },
  controlsOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  overlayScrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  closeButton: {
    position: 'absolute',
    top: 60,
    right: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  closeText: {
    color: '#ffffff',
    fontSize: 24,
  },
  videoSettingsButton: {
    position: 'absolute',
    top: 60,
    left: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  controlsContainer: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    top: '50%',
    transform: [{ translateY: -50 }],
    gap: 8,
  },
  playPauseButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  playPauseText: {
    color: '#000000',
    fontSize: 36,
  },
  skipButton: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  skipArrow: {
    color: '#ffffff',
    fontSize: 38,
    fontWeight: '300',
    marginBottom: -8,
  },
  skipText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  progressContainer: {
    position: 'absolute',
    bottom: 40,
    left: 30,
    right: 30,
  },
  progressBarTouchable: {
    paddingVertical: 20,
    paddingHorizontal: 5,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    position: 'relative',
    justifyContent: 'center',
  },
  progressFill: {
    position: 'absolute',
    height: '100%',
    backgroundColor: '#ff6b6b',
    borderRadius: 3,
  },
  progressThumb: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#ffffff',
    marginLeft: -9,
    top: -6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
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
  editRoutineButton: {
    backgroundColor: colors.surface.tertiary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 0,
  },
  editRoutineButtonText: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  editModalOverlay: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  editModalContainer: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  editModalHeader: {
    paddingTop: 60,
    paddingBottom: 32,
    paddingHorizontal: 24,
    backgroundColor: colors.background.primary,
  },
  editModalBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.surface.tertiary,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border.default,
  },
  editModalBackButtonText: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '600',
  },
  editModalTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.text.primary,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  editModalSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
  },
  editModalScrollView: {
    flex: 1,
  },
  editModalListContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  editModalStateHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
    gap: 12,
  },
  editModalStateHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border.subtle,
  },
  editModalStateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
  },
  editModalStateHeaderEmoji: {
    fontSize: 18,
  },
  editModalStateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'lowercase',
  },
  editModalBlockCard: {
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    marginBottom: 16,
  },
  editModalBlockGradient: {
    padding: 20,
  },
  editModalBlockContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  editModalBlockNumberContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalBlockNumber: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  editModalStateIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalStateIconEmoji: {
    fontSize: 24,
  },
  editModalBlockInfo: {
    flex: 1,
    gap: 8,
  },
  editModalBlockName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text.primary,
    letterSpacing: 0.3,
  },
  editModalBlockDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  editModalSelectIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editModalSelectIcon: {
    fontSize: 24,
    color: colors.text.primary,
    fontWeight: '300',
  },
  videoProgressHeader: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    zIndex: 20,
  },
  videoCountdownContainer: {
    position: 'absolute',
    bottom: 60,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  videoCountdownText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 48,
    fontWeight: '200',
    letterSpacing: 2,
  },
  skipBlockButton: {
    paddingVertical: 14,
    paddingHorizontal: 32,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    marginBottom: 12,
  },
  skipBlockText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  pauseFlowButton: {
    paddingVertical: 16,
    paddingHorizontal: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 30,
    marginBottom: 16,
  },
  pauseFlowText: {
    color: '#000000',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 1,
  },
  endFlowButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  endFlowText: {
    color: '#ff6b6b',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
})
