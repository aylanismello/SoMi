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
import { soundManager } from '../utils/SoundManager'
import { colors } from '../constants/theme'

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
  const [currentVideo, setCurrentVideo] = useState(null)
  const [previousVideoId, setPreviousVideoId] = useState(null)
  const [selectedVideoId, setSelectedVideoId] = useState(null)

  // Loading state
  const [isLoadingVideos, setIsLoadingVideos] = useState(true)

  // Exit confirmation modal
  const [showExitModal, setShowExitModal] = useState(false)

  // Video playback tracking
  const [videoProgress, setVideoProgress] = useState(0)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(VIDEO_DURATION_CAP_SECONDS)
  const [showControls, setShowControls] = useState(false)
  const [isPlayingState, setIsPlayingState] = useState(false)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubbingPosition, setScrubbingPosition] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [showBackground, setShowBackground] = useState(false)

  const startTimeRef = useRef(null)
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
  const videoUrl = currentVideo?.media_url || 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4'
  const player = useVideoPlayer(videoUrl)

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
      // Show controls briefly when video starts
      setShowControls(true)

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
      const { data, error } = await supabase
        .from('somi_blocks')
        .select('*')
        .eq('media_type', 'video')
        .eq('active', true)
        .eq('block_type', 'vagal_toning')
        .or('is_routine.is.null,is_routine.eq.false')
        .not('media_url', 'is', null)

      if (error) {
        console.error('Error fetching videos:', error)
        return
      }

      setVideoQueue(data || [])

      // Select initial video for first cycle
      if (data && data.length > 0) {
        // Convert numeric state code to old database format
        const stateTarget = STATE_CODE_TO_TARGET[polyvagalState] || 'settling'
        const firstVideo = selectRoutineVideo(data, stateTarget, null)
        setCurrentVideo(firstVideo)
        setSelectedVideoId(firstVideo?.id)
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

  const handleToggleMute = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newMutedState = !isMuted
    setIsMuted(newMutedState)
    player.muted = newMutedState
    // Reset the auto-hide timer
    setShowControls(false)
    setTimeout(() => setShowControls(true), 10)
  }

  const handleToggleBackground = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowBackground(!showBackground)
    // Reset the auto-hide timer
    setShowControls(false)
    setTimeout(() => setShowControls(true), 10)
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
    // soundManager.playBlockEnd() // Temporarily disabled

    // Save the completed block
    if (currentVideo) {
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

    // Check if we've completed all 8 cycles
    if (currentCycle >= TOTAL_CYCLES) {
      // After 8th block: Go straight to body scan (no final interstitial)
      navigation.navigate('BodyScanCountdown', {
        isInitial: false,
        savedInitialValue,
        savedInitialState,
      })
    } else {
      // Move to next cycle
      const nextCycle = currentCycle + 1
      setCurrentCycle(nextCycle)

      // Select next video (avoid previous video if possible)
      // Convert numeric state code to old database format
      const stateTarget = STATE_CODE_TO_TARGET[polyvagalState] || 'settling'
      const nextVideo = selectRoutineVideo(
        videoQueue,
        stateTarget,
        currentVideo?.id
      )
      setCurrentVideo(nextVideo)
      setSelectedVideoId(nextVideo?.id)
      setPreviousVideoId(currentVideo?.id)

      // Reset to interstitial phase
      setPhase('interstitial')
      setCountdown(INTERSTITIAL_DURATION_SECONDS)
    }
  }

  const handleVideoSelect = (video) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setCurrentVideo(video)
    setSelectedVideoId(video.id)
  }

  const handleExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
    // Always show confirmation modal when exiting
    setShowExitModal(true)
  }

  const handleCloseVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    // soundManager.playBlockEnd() // Temporarily disabled

    // Save current video progress
    if (currentVideo && startTimeRef.current) {
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
      // After 8th block: Go straight to body scan (no final interstitial)
      navigation.navigate('BodyScanCountdown', {
        isInitial: false,
        savedInitialValue,
        savedInitialState,
      })
    } else {
      // Move to next cycle
      const nextCycle = currentCycle + 1
      setCurrentCycle(nextCycle)

      // Select next video
      const stateTarget = STATE_CODE_TO_TARGET[polyvagalState] || 'settling'
      const nextVideo = selectRoutineVideo(
        videoQueue,
        stateTarget,
        currentVideo?.id
      )
      setCurrentVideo(nextVideo)
      setSelectedVideoId(nextVideo?.id)
      setPreviousVideoId(currentVideo?.id)

      // Reset to interstitial phase
      setPhase('interstitial')
      setCountdown(INTERSTITIAL_DURATION_SECONDS)
    }
  }

  const handleConfirmExit = async () => {
    setShowExitModal(false)

    // End the active chain to reset state completely
    await somiChainService.endActiveChain()

    // Navigate back to CheckIn screen which will reset everything
    navigation.reset({
      index: 0,
      routes: [{ name: 'CheckIn' }],
    })
  }

  const handleCancelExit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowExitModal(false)
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
    const radius = 120
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

          {/* Video Carousel */}
          <View style={styles.carouselSection}>
            <Text style={styles.carouselLabel}>or choose a different block:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.carouselContent}
              decelerationRate="fast"
              snapToInterval={196}
              snapToAlignment="start"
            >
              {videoQueue.map((video) => {
                const stateInfo = STATE_EMOJIS[video.state_target]
                const isSelected = selectedVideoId === video.id

                return (
                  <TouchableOpacity
                    key={video.id}
                    onPress={() => handleVideoSelect(video)}
                    activeOpacity={0.8}
                    style={[
                      styles.carouselCard,
                      isSelected && stateInfo && {
                        borderColor: stateInfo.color,
                        borderWidth: 2,
                      },
                      !isSelected && styles.carouselCardUnselected,
                    ]}
                  >
                    <BlurView intensity={10} tint="dark" style={styles.carouselCardBlur}>
                      <Text style={styles.carouselCardName} numberOfLines={2}>
                        {video.name}
                      </Text>
                      {stateInfo && (
                        <View style={[
                          styles.carouselCardBadge,
                          {
                            backgroundColor: `${stateInfo.color}30`,
                            borderColor: stateInfo.color,
                          }
                        ]}>
                          <Text style={[styles.carouselCardBadgeText, { color: stateInfo.color }]}>
                            {video.state_target} {stateInfo.emoji}
                          </Text>
                        </View>
                      )}
                    </BlurView>
                  </TouchableOpacity>
                )
              })}
            </ScrollView>
          </View>
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

        {/* Background toggle button */}
        <TouchableOpacity
          style={styles.backgroundToggleButton}
          onPress={handleToggleBackground}
        >
          <Text style={styles.toggleText}>{showBackground ? '🎬' : '🏔️'}</Text>
        </TouchableOpacity>

        {/* Mute toggle button */}
        <TouchableOpacity
          style={styles.muteButton}
          onPress={handleToggleMute}
        >
          <Text style={styles.toggleText}>{isMuted ? '🔇' : '🔊'}</Text>
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
  },
  integrationMessage: {
    color: colors.text.secondary,
    fontSize: 24,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 32,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  circleContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  circleCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleText: {
    color: colors.text.primary,
    fontSize: 36,
    fontWeight: '700',
    letterSpacing: 2,
  },
  nextVideoSection: {
    marginBottom: 12,
    paddingHorizontal: 24,
    width: '100%',
  },
  nextVideoLabel: {
    color: colors.text.muted,
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
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
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    gap: 8,
  },
  nextVideoName: {
    color: colors.text.primary,
    fontSize: 17,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  nextVideoDescription: {
    color: colors.text.secondary,
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    lineHeight: 18,
  },
  nextVideoBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  nextVideoBadgeText: {
    fontSize: 12,
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
  toggleText: {
    fontSize: 24,
  },
  backgroundToggleButton: {
    position: 'absolute',
    top: 180,
    left: 30,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 22,
  },
  muteButton: {
    position: 'absolute',
    top: 120,
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
})
