import { useState, useEffect, useRef } from 'react'
import { useEvent } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { StyleSheet, View, TouchableOpacity, Text, ScrollView, Animated, Pressable, Modal } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { BlurView } from 'expo-blur'
import Svg, { Circle } from 'react-native-svg'
import * as Haptics from 'expo-haptics'
import { supabase, somiChainService } from '../supabase'
import { selectRoutineVideo } from '../services/videoSelectionAlgorithm'
import { getBlocksForRoutine } from '../services/mediaService'
import { soundManager } from '../utils/SoundManager'
import { colors } from '../constants/theme'
import { useSettings } from '../contexts/SettingsContext'
import SettingsModal from './SettingsModal'

const AnimatedCircle = Animated.createAnimatedComponent(Circle)

// ============================================================================
// HACK: VIDEO DURATION CAP
// ============================================================================
// All videos capped at 60 seconds regardless of actual duration.
// TEMPORARY until we have properly trimmed 1-minute content.
// TODO: Remove this hack when videos are properly edited.
// ============================================================================
const VIDEO_DURATION_CAP_SECONDS = 60
const INTERSTITIAL_DURATION_SECONDS = 20

// Map new polyvagal state codes to old database state_target values
const STATE_CODE_TO_TARGET = {
  1: 'withdrawn', // Drained
  2: 'stirring',  // Foggy
  3: 'activated', // Wired
  4: 'settling',  // Steady
  5: 'connected', // Glowing
}

// Integration messages that rotate every 10 seconds
const INTEGRATION_MESSAGES = [
  "sense your body...\nnotice what's present",
  "where do you feel\nthis in your body?",
  "what sensations\nare you noticing?",
  "breathe into\nany tension",
  "allow whatever\nis here to be here",
  "notice without\njudging",
]

// Polyvagal state emojis and colors (matching SoMeCheckIn)
const STATE_EMOJIS = {
  withdrawn: { emoji: '🌧', color: '#4A5F8C' },
  stirring: { emoji: '🌫', color: '#5B7BB4' },
  activated: { emoji: '🌪', color: '#6B9BD1' },
  settling: { emoji: '🌤', color: '#7DBCE7' },
  connected: { emoji: '☀️', color: '#90DDF0' },
}

export default function SoMiRoutineScreen({ navigation, route }) {
  const {
    polyvagalState,
    sliderValue,
    savedInitialValue,
    savedInitialState,
    totalBlocks = 8, // Default to 8 blocks if not specified
    customQueue = null, // Custom queue from preview screen if edited
  } = route.params

  // Dynamic block count based on user selection
  const TOTAL_CYCLES = totalBlocks

  // Routine state
  const [currentCycle, setCurrentCycle] = useState(1)
  const [phase, setPhase] = useState('interstitial') // 'interstitial' | 'video'
  const [countdown, setCountdown] = useState(INTERSTITIAL_DURATION_SECONDS)
  const [currentMessageIndex, setCurrentMessageIndex] = useState(0)

  // Video state
  const [videoQueue, setVideoQueue] = useState([])
  const [hardcodedQueue, setHardcodedQueue] = useState([])
  const [currentVideo, setCurrentVideo] = useState(null)
  const [previousVideoId, setPreviousVideoId] = useState(null)
  const [selectedVideoId, setSelectedVideoId] = useState(null)
  const [userOverrodeBlock, setUserOverrodeBlock] = useState(false)

  // Loading state
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)

  // Exit confirmation modal
  const [showExitModal, setShowExitModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [allBlocks, setAllBlocks] = useState([])

  const { isMusicEnabled } = useSettings()

  // Video playback tracking
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(VIDEO_DURATION_CAP_SECONDS)
  const [showControls, setShowControls] = useState(false)
  const [isPlayingState, setIsPlayingState] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubbingPosition, setScrubbingPosition] = useState(0)
  const [showBackground, setShowBackground] = useState(false)

  const startTimeRef = useRef(null)
  const hasSavedCurrentBlockRef = useRef(false)
  const controlsOpacity = useRef(new Animated.Value(0)).current
  const progressBarRef = useRef(null)
  const thumbScale = useRef(new Animated.Value(1)).current
  const hideTimeoutRef = useRef(null)
  const isSeekingRef = useRef(false)

  // Refs
  const countdownIntervalRef = useRef(null)
  const videoProgressIntervalRef = useRef(null)
  const interstitialProgressAnim = useRef(new Animated.Value(0)).current
  const messageOpacity = useRef(new Animated.Value(1)).current
  const messageIntervalRef = useRef(null)

  // Video player - always create with current video URL or fallback
  // IMPORTANT: All videos are muted (uploaded with sound by mistake)
  const videoUrl = currentVideo?.media_url || 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4'
  const player = useVideoPlayer(videoUrl, (player) => {
    player.muted = true
  })

  // Fetch all available videos on mount
  useEffect(() => {
    fetchAvailableVideos()
  }, [])

  // Control video playback based on phase
  useEffect(() => {
    if (!player) return

    if (phase === 'video' && currentVideo) {
      // Start playing when entering video phase
      // Add a small delay to ensure video is loaded
      setTimeout(() => {
        player.play()
      }, 100)
    } else {
      // Pause when in interstitial phase
      player.pause()
    }
  }, [phase, currentVideo, player])

  // Auto-play when entering video phase
  useEffect(() => {
    if (phase === 'video' && player && currentVideo) {
      // Don't show controls when video starts
      setShowControls(false)

      // Start playing
      setTimeout(() => {
        player.play()
      }, 100)

      // soundManager.playBlockStart() // Temporarily disabled
    }
  }, [phase])

  const fetchAvailableVideos = async () => {
    try {
      setIsLoadingVideos(true)

      // Fetch all available videos for the selector
      const { data, error } = await supabase
        .from('somi_blocks')
        .select('*')
        .eq('media_type', 'video')
        .eq('active', true)
        .eq('block_type', 'vagal_toning')
        .not('media_url', 'is', null)

      if (error) {
        console.error('Error fetching videos:', error)
        return
      }

      setVideoQueue(data || [])
      setAllBlocks(data || []) // Store all blocks for edit modal

      // Use custom queue if provided, otherwise fetch hardcoded queue
      let queue
      if (customQueue && customQueue.length > 0) {
        queue = customQueue
        console.log('Using custom queue from preview:', queue.map(b => b.name))
      } else {
        queue = await getBlocksForRoutine(totalBlocks)
        console.log(`Loaded hardcoded queue for ${totalBlocks} blocks:`, queue.map(b => b.name))
      }

      setHardcodedQueue(queue)

      // Set initial video from queue
      if (queue && queue.length > 0) {
        const firstBlock = queue[0]
        // Find the full block data from videoQueue
        const firstVideo = data?.find(v => v.id === firstBlock.somi_block_id)
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

  // Smooth animation for interstitial progress circle
  useEffect(() => {
    if (phase === 'interstitial') {
      // Reset and start animation
      interstitialProgressAnim.setValue(0)

      Animated.timing(interstitialProgressAnim, {
        toValue: 1,
        duration: INTERSTITIAL_DURATION_SECONDS * 1000,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          // Transition to video phase (no final interstitial exists anymore)
          transitionToVideoPhase()
        }
      })

      return () => {
        interstitialProgressAnim.stopAnimation()
      }
    }
  }, [phase, currentCycle])

  // Interstitial countdown timer (for display only)
  useEffect(() => {
    if (phase === 'interstitial') {
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
        if (countdownIntervalRef.current) {
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
      if (player) {
        player.pause()
      }
      handleVideoComplete()
    }
  }, [videoCurrentTime, videoDuration, phase, player])

  // Animate controls visibility
  useEffect(() => {
    Animated.timing(controlsOpacity, {
      toValue: showControls ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
    }).start()
  }, [showControls, controlsOpacity])

  // Auto-hide controls after 3 seconds when playing
  useEffect(() => {
    // Clear any existing timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current)
      hideTimeoutRef.current = null
    }

    // Don't hide if user is actively scrubbing
    if (showControls && !isScrubbing && phase === 'video') {
      hideTimeoutRef.current = setTimeout(() => {
        // Check if still playing when timer fires
        if (player && player.playing) {
          setShowControls(false)
        }
        hideTimeoutRef.current = null
      }, 3000)
    }

    return () => {
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current)
        hideTimeoutRef.current = null
      }
    }
  }, [showControls, isScrubbing, phase, player])

  const transitionToVideoPhase = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    setPhase('video')
    setVideoProgress(0)
    setVideoCurrentTime(0)
    setShowControls(false)
    // Track start time for elapsed time calculation
    startTimeRef.current = Date.now()
    hasSavedCurrentBlockRef.current = false // Reset save guard for new block
  }

  const handleSkipInterstitial = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // Stop animations
    interstitialProgressAnim.stopAnimation()
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }

    // Transition to video phase (no final interstitial exists anymore)
    transitionToVideoPhase()
  }

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    const currentlyPlaying = player.playing

    if (currentlyPlaying) {
      player.pause()
    } else {
      player.play()
      // Reset the auto-hide timer when resuming playback
      setShowControls(false)
      setTimeout(() => setShowControls(true), 10)
    }
  }

  const handleSkipBackward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newTime = Math.max(0, videoCurrentTime - 15)
    player.currentTime = newTime

    // Reset the auto-hide timer
    setShowControls(false)
    setTimeout(() => setShowControls(true), 10)
  }

  const handleSkipForward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const cappedDuration = Math.min(videoDuration, VIDEO_DURATION_CAP_SECONDS)
    const newTime = Math.min(cappedDuration, videoCurrentTime + 15)
    player.currentTime = newTime

    // Reset the auto-hide timer
    setShowControls(false)
    setTimeout(() => setShowControls(true), 10)
  }

  const toggleControls = () => {
    setShowControls(!showControls)
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
    setShowControls(true)
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

    // Reset the auto-hide timer by toggling controls
    setShowControls(false)
    setTimeout(() => setShowControls(true), 10)

    // Allow interval to resume updating after seek completes
    setTimeout(() => {
      isSeekingRef.current = false
    }, 500)
  }

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00'
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const handleVideoComplete = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)
    soundManager.playBlockEnd()

    // Save the completed block (prevent duplicate saves)
    if (currentVideo && !hasSavedCurrentBlockRef.current) {
      hasSavedCurrentBlockRef.current = true
      const elapsedSeconds = Math.min(
        Math.round((Date.now() - startTimeRef.current) / 1000),
        VIDEO_DURATION_CAP_SECONDS
      )
      const chainId = await somiChainService.getOrCreateActiveChain()
      await somiChainService.saveCompletedBlock(
        currentVideo.id,
        elapsedSeconds,
        currentCycle - 1, // 0-indexed order
        chainId
      )
      console.log(`Completed block ${currentVideo.id} in cycle ${currentCycle}`)
    }

    // Check if we've completed all cycles
    if (currentCycle >= TOTAL_CYCLES) {
      // After last block: Go straight to body scan (no final interstitial)
      navigation.navigate('BodyScanCountdown', {
        isInitial: false,
        savedInitialValue,
        savedInitialState,
      })
    } else {
      // Move to next cycle
      const nextCycle = currentCycle + 1
      setCurrentCycle(nextCycle)

      // Get next video from hardcoded queue (if not overridden by user)
      let nextVideo = null
      if (hardcodedQueue && hardcodedQueue.length >= nextCycle) {
        const nextBlock = hardcodedQueue[nextCycle - 1]
        nextVideo = videoQueue.find(v => v.id === nextBlock.somi_block_id)
        console.log(`Using hardcoded block ${nextCycle}/${TOTAL_CYCLES}: ${nextVideo?.name}`)
      }

      // Fallback to algorithm if hardcoded queue is empty or incomplete
      if (!nextVideo) {
        const stateTarget = STATE_CODE_TO_TARGET[polyvagalState] || 'settling'
        nextVideo = selectRoutineVideo(videoQueue, stateTarget, currentVideo?.id)
        console.log(`Fallback to algorithm: ${nextVideo?.name}`)
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
    console.log(`User overrode block selection: ${video.name}`)
  }

  const handleExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    // Always show confirmation modal when exiting
    setShowExitModal(true)
  }

  const handleCloseVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    soundManager.playBlockEnd()

    // Save current video progress (prevent duplicate saves)
    if (currentVideo && startTimeRef.current && !hasSavedCurrentBlockRef.current) {
      hasSavedCurrentBlockRef.current = true
      const elapsedSeconds = Math.min(
        Math.round((Date.now() - startTimeRef.current) / 1000),
        VIDEO_DURATION_CAP_SECONDS
      )
      const chainId = await somiChainService.getOrCreateActiveChain()
      await somiChainService.saveCompletedBlock(
        currentVideo.id,
        elapsedSeconds,
        currentCycle - 1,
        chainId
      )
    }

    // Go to next interstitial (same logic as handleVideoComplete)
    if (currentCycle >= TOTAL_CYCLES) {
      // After last block: Go straight to body scan (no final interstitial)
      navigation.navigate('BodyScanCountdown', {
        isInitial: false,
        savedInitialValue,
        savedInitialState,
      })
    } else {
      // Move to next cycle
      const nextCycle = currentCycle + 1
      setCurrentCycle(nextCycle)

      // Get next video from hardcoded queue (if not overridden by user)
      let nextVideo = null
      if (hardcodedQueue && hardcodedQueue.length >= nextCycle) {
        const nextBlock = hardcodedQueue[nextCycle - 1]
        nextVideo = videoQueue.find(v => v.id === nextBlock.somi_block_id)
        console.log(`Using hardcoded block ${nextCycle}/${TOTAL_CYCLES}: ${nextVideo?.name}`)
      }

      // Fallback to algorithm if hardcoded queue is empty or incomplete
      if (!nextVideo) {
        const stateTarget = STATE_CODE_TO_TARGET[polyvagalState] || 'settling'
        nextVideo = selectRoutineVideo(videoQueue, stateTarget, currentVideo?.id)
        console.log(`Fallback to algorithm: ${nextVideo?.name}`)
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

    // End the active chain to reset state completely
    await somiChainService.endActiveChain()

    // First, reset the CheckIn stack to completely clear it
    navigation.reset({
      index: 0,
      routes: [{ name: 'CheckIn' }],
    })

    // Then navigate to Home tab (using parent Tab navigator)
    navigation.getParent()?.navigate('Home')
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
  }

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowSettingsModal(true)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)
  }

  const handleOpenEditModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowEditModal(true)
    // Pause countdown
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current)
    }
    interstitialProgressAnim.stopAnimation()
  }

  const handleCloseEditModal = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowEditModal(false)
    // Resume countdown from current state
    // The useEffect for countdown will restart when modal closes
  }

  const handleBlockSelectFromEdit = (selectedBlock) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)

    // Update the current video to the selected block
    setCurrentVideo(selectedBlock)
    setSelectedVideoId(selectedBlock.id)

    // Update the hardcoded queue at current position
    const newQueue = [...hardcodedQueue]
    const blockData = {
      somi_block_id: selectedBlock.id,
      name: selectedBlock.name,
      canonical_name: selectedBlock.canonical_name,
      url: selectedBlock.media_url,
      type: 'video',
    }
    newQueue[currentCycle - 1] = blockData
    setHardcodedQueue(newQueue)

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
    // Calculate smooth progress for circular indicator
    const radius = 100
    const strokeWidth = 8
    const circumference = 2 * Math.PI * radius

    // Interpolate strokeDashoffset smoothly
    const strokeDashoffset = interstitialProgressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: [circumference, 0],
    })

    return (
      <LinearGradient
        colors={[colors.background.primary, colors.background.secondary, colors.background.primary]}
        style={styles.container}
      >
        {/* Block counter at very top */}
        {currentCycle <= TOTAL_CYCLES && (
          <Text style={styles.blockCounter}>
            {currentCycle} of {TOTAL_CYCLES}
          </Text>
        )}

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={handleOpenSettings}
            style={styles.settingsButton}
            activeOpacity={0.7}
          >
            <Text style={styles.settingsButtonText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleSkipInterstitial}
            style={styles.skipButton}
            activeOpacity={0.7}
          >
            <Text style={styles.skipButtonText}>Skip</Text>
          </TouchableOpacity>
          <View style={{ flex: 1 }} />
          <TouchableOpacity
            onPress={handleExit}
            style={styles.exitButton}
            activeOpacity={0.7}
          >
            <Text style={styles.exitButtonIcon}>✕</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.interstitialContent}>
          {/* Integration message */}
          <Animated.Text style={[styles.integrationMessage, { opacity: messageOpacity }]}>
            {INTEGRATION_MESSAGES[currentMessageIndex]}
          </Animated.Text>

          {/* Circular Progress Indicator */}
          <View style={styles.circleContainer}>
            <Svg width={radius * 2 + strokeWidth * 2} height={radius * 2 + strokeWidth * 2}>
              {/* Background circle */}
              <Circle
                cx={radius + strokeWidth}
                cy={radius + strokeWidth}
                r={radius}
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth={strokeWidth}
                fill="none"
              />
              {/* Progress circle - animated */}
              <AnimatedCircle
                cx={radius + strokeWidth}
                cy={radius + strokeWidth}
                r={radius}
                stroke={colors.accent.primary}
                strokeWidth={strokeWidth}
                fill="none"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${radius + strokeWidth} ${radius + strokeWidth})`}
              />
            </Svg>
            <View style={styles.circleCenter}>
              <Text style={styles.circleText}>SoMi</Text>
            </View>
          </View>

          {/* Next Video Preview */}
          {currentVideo && (
            <View style={styles.nextVideoSection}>
              <Text style={styles.nextVideoLabel}>Next Block:</Text>
              <View style={[
                styles.nextVideoCard,
                STATE_EMOJIS[currentVideo.state_target] && {
                  borderColor: STATE_EMOJIS[currentVideo.state_target].color,
                }
              ]}>
                <BlurView intensity={15} tint="dark" style={styles.nextVideoBlur}>
                  <Text style={styles.nextVideoName}>{currentVideo.name}</Text>
                  {currentVideo.description && (
                    <Text style={styles.nextVideoDescription} numberOfLines={2}>
                      {currentVideo.description}
                    </Text>
                  )}
                  {STATE_EMOJIS[currentVideo.state_target] && (
                    <View style={[
                      styles.nextVideoBadge,
                      {
                        backgroundColor: `${STATE_EMOJIS[currentVideo.state_target].color}30`,
                        borderColor: STATE_EMOJIS[currentVideo.state_target].color,
                      }
                    ]}>
                      <Text style={[
                        styles.nextVideoBadgeText,
                        { color: STATE_EMOJIS[currentVideo.state_target].color }
                      ]}>
                        {currentVideo.state_target} {STATE_EMOJIS[currentVideo.state_target].emoji}
                      </Text>
                    </View>
                  )}
                </BlurView>
              </View>
            </View>
          )}

          {/* Edit Routine Button */}
          <TouchableOpacity
            onPress={handleOpenEditModal}
            style={styles.editRoutineButton}
            activeOpacity={0.8}
          >
            <Text style={styles.editRoutineButtonText}>✎ Edit Routine</Text>
          </TouchableOpacity>
        </View>

        {/* Exit Confirmation Modal */}
        <Modal
          visible={showExitModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCancelExit}
        >
          <View style={styles.modalOverlay}>
            <BlurView intensity={40} tint="dark" style={styles.exitModalContainer}>
              <View style={styles.exitModalContent}>
                <Text style={styles.exitModalTitle}>End Session?</Text>
                <Text style={styles.exitModalMessage}>
                  Are you sure you want to end this check-in early?
                </Text>

                <View style={styles.exitModalButtons}>
                  <TouchableOpacity
                    onPress={handleCancelExit}
                    style={[styles.exitModalButton, styles.exitModalButtonCancel]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.exitModalButtonTextCancel}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmExit}
                    style={[styles.exitModalButton, styles.exitModalButtonConfirm]}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.exitModalButtonTextConfirm}>End</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </BlurView>
          </View>
        </Modal>

        <SettingsModal visible={showSettingsModal} onClose={handleCloseSettings} />

        {/* Edit Routine Modal */}
        <Modal
          visible={showEditModal}
          transparent={true}
          animationType="slide"
          onRequestClose={handleCloseEditModal}
        >
          <View style={styles.editModalOverlay}>
            <View style={styles.editModalContainer}>
              <View style={styles.editModalHeader}>
                <TouchableOpacity onPress={handleCloseEditModal} style={styles.editModalBackButton}>
                  <Text style={styles.editModalBackButtonText}>←</Text>
                </TouchableOpacity>
                <Text style={styles.editModalTitle}>Choose Exercise</Text>
                <Text style={styles.editModalSubtitle}>
                  {allBlocks.length} {allBlocks.length === 1 ? 'exercise' : 'exercises'}
                </Text>
              </View>

              <ScrollView
                style={styles.editModalScrollView}
                contentContainerStyle={styles.editModalListContent}
                showsVerticalScrollIndicator={false}
              >
                {Object.entries(STATE_EMOJIS).map(([stateId, stateInfo], sectionIndex) => {
                  const blocksForState = allBlocks.filter(b => b.state_target === stateId)

                  if (blocksForState.length === 0) return null

                  return (
                    <View key={stateId}>
                      <View style={[styles.editModalStateHeaderContainer, sectionIndex === 0 && { marginTop: 0 }]}>
                        <View style={styles.editModalStateHeaderLine} />
                        <View style={styles.editModalStateHeader}>
                          <Text style={styles.editModalStateHeaderEmoji}>{stateInfo.emoji}</Text>
                          <Text style={[styles.editModalStateHeaderText, { color: stateInfo.color }]}>
                            {stateInfo.label}
                          </Text>
                        </View>
                        <View style={styles.editModalStateHeaderLine} />
                      </View>

                      {blocksForState.map((block) => (
                        <TouchableOpacity
                          key={block.id}
                          onPress={() => handleBlockSelectFromEdit(block)}
                          style={[
                            styles.editModalBlockCard,
                            { borderColor: `${stateInfo.color}50` }
                          ]}
                          activeOpacity={0.85}
                        >
                          <LinearGradient
                            colors={[`${stateInfo.color}20`, `${stateInfo.color}10`]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.editModalBlockGradient}
                          >
                            <View style={styles.editModalBlockContent}>
                              <View style={styles.editModalStateIconContainer}>
                                <Text style={styles.editModalStateIconEmoji}>{stateInfo.emoji}</Text>
                              </View>
                              <View style={styles.editModalBlockInfo}>
                                <Text style={styles.editModalBlockName}>{block.name}</Text>
                                {block.description && (
                                  <Text style={styles.editModalBlockDescription} numberOfLines={2}>
                                    {block.description}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.editModalSelectIconContainer}>
                                <Text style={styles.editModalSelectIcon}>+</Text>
                              </View>
                            </View>
                          </LinearGradient>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </LinearGradient>
    )
  }

  // Video Phase - Match PlayerScreen UI exactly
  const displayTime = isScrubbing ? scrubbingPosition : videoCurrentTime
  const cappedDuration = Math.min(videoDuration, VIDEO_DURATION_CAP_SECONDS)
  const progress = cappedDuration > 0 ? displayTime / cappedDuration : 0

  return (
    <View style={styles.videoContainer}>
      <Pressable style={styles.videoPlayerArea} onPress={toggleControls}>
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

      <Animated.View
        style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? 'box-none' : 'none'}
      >
        {/* Dark overlay scrim */}
        <View style={styles.overlayScrim} pointerEvents="none" />

        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleCloseVideo}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Settings button */}
        <TouchableOpacity
          style={styles.videoSettingsButton}
          onPress={handleOpenSettings}
        >
          <Text style={styles.settingsText}>⚙️</Text>
        </TouchableOpacity>

        <View style={styles.controlsContainer}>
          {/* Skip backward button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipBackward}
          >
            <Text style={styles.skipArrow}>⟲</Text>
            <Text style={styles.skipText}>15</Text>
          </TouchableOpacity>

          {/* Play/Pause button */}
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={handlePlayPause}
          >
            <Text style={styles.playPauseText}>
              {isPlayingState ? '❚❚' : '▶'}
            </Text>
          </TouchableOpacity>

          {/* Skip forward button */}
          <TouchableOpacity
            style={styles.skipButton}
            onPress={handleSkipForward}
          >
            <Text style={styles.skipArrow}>⟳</Text>
            <Text style={styles.skipText}>15</Text>
          </TouchableOpacity>
        </View>

        {/* Progress bar */}
        <View style={styles.progressContainer}>
          <View
            ref={progressBarRef}
            style={styles.progressBarTouchable}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleProgressBarTouch}
            onResponderMove={handleProgressBarMove}
            onResponderRelease={handleProgressBarRelease}
          >
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
              <Animated.View
                style={[
                  styles.progressThumb,
                  {
                    left: `${progress * 100}%`,
                    transform: [{ scale: thumbScale }],
                  },
                ]}
              />
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Text style={styles.timeText}>{formatTime(displayTime)}</Text>
            <Text style={styles.timeText}>{formatTime(cappedDuration)}</Text>
          </View>
        </View>
      </Animated.View>

      {/* Exit Confirmation Modal */}
      <Modal
        visible={showExitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelExit}
      >
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.exitModalContainer}>
            <View style={styles.exitModalContent}>
              <Text style={styles.exitModalTitle}>End Session?</Text>
              <Text style={styles.exitModalMessage}>
                Are you sure you want to end this check-in early?
              </Text>

              <View style={styles.exitModalButtons}>
                <TouchableOpacity
                  onPress={handleCancelExit}
                  style={[styles.exitModalButton, styles.exitModalButtonCancel]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exitModalButtonTextCancel}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleConfirmExit}
                  style={[styles.exitModalButton, styles.exitModalButtonConfirm]}
                  activeOpacity={0.7}
                >
                  <Text style={styles.exitModalButtonTextConfirm}>End</Text>
                </TouchableOpacity>
              </View>
            </View>
          </BlurView>
        </View>
      </Modal>

      <SettingsModal visible={showSettingsModal} onClose={handleCloseSettings} />
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
  interstitialContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingBottom: 20,
  },
  integrationMessage: {
    color: colors.text.secondary,
    fontSize: 20,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
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
  nextVideoSection: {
    marginBottom: 8,
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
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    top: '50%',
    transform: [{ translateY: -50 }],
    gap: 40,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  exitModalContainer: {
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border.default,
    maxWidth: 380,
    width: '100%',
  },
  exitModalContent: {
    padding: 32,
    alignItems: 'center',
  },
  exitModalTitle: {
    color: colors.text.primary,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  exitModalMessage: {
    color: colors.text.secondary,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 28,
    letterSpacing: 0.2,
  },
  exitModalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  exitModalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  exitModalButtonCancel: {
    backgroundColor: colors.surface.tertiary,
    borderWidth: 2,
    borderColor: colors.border.default,
  },
  exitModalButtonConfirm: {
    backgroundColor: 'rgba(255, 107, 107, 0.2)',
    borderWidth: 2,
    borderColor: '#ff6b6b',
  },
  exitModalButtonTextCancel: {
    color: colors.text.secondary,
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  exitModalButtonTextConfirm: {
    color: '#ff6b6b',
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: 0.3,
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
    marginTop: 8,
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
})
