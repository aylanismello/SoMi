import { useState, useEffect, useRef } from 'react'
import { useEvent } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useAudioPlayer } from 'expo-audio'
import { StyleSheet, View, TouchableOpacity, Text, Pressable, Dimensions, Animated } from 'react-native'
import * as Haptics from 'expo-haptics'
import { BACKGROUND_VIDEO } from '../constants/media'
import { somiChainService } from '../supabase'

// Get screen dimensions for 9:16 aspect ratio calculation
const screenWidth = Dimensions.get('window').width
const screenHeight = Dimensions.get('window').height

export default function PlayerScreen({ navigation, route }) {
  const {
    media,
    savedInitialValue,
    savedInitialState,
    isBodyScan,
    currentStep,
    savedSliderValue,
    savedPolyvagalState,
    fromExplore = false, // New param to track if we came from Explore
  } = route.params
  const isAudio = media.type === 'audio'
  const [showControls, setShowControls] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const [scrubbingPosition, setScrubbingPosition] = useState(0)
  const [isPlayingState, setIsPlayingState] = useState(false)
  const [showBackgroundVideo, setShowBackgroundVideo] = useState(isAudio) // Auto-show for audio
  const controlsOpacity = useRef(new Animated.Value(0)).current
  const progressBarRef = useRef(null)
  const hideTimeoutRef = useRef(null)
  const thumbScale = useRef(new Animated.Value(1)).current
  const isSeekingRef = useRef(false)
  const startTimeRef = useRef(Date.now()) // Track when playback started

  // Conditionally create audio or video player based on media type
  // Safe because media.type never changes during component lifecycle
  const player = isAudio
    ? useAudioPlayer(media.url)
    : useVideoPlayer(media.url, player => {
        player.play()
      })

  // Background video player for looping background visuals
  const backgroundPlayer = useVideoPlayer(BACKGROUND_VIDEO.url, player => {
    player.loop = true
    player.muted = true
    player.play()
  })

  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })

  // Helper to save completed block
  const saveCompletedBlock = async () => {
    // Skip saving for body scans or if no block ID
    if (isBodyScan || !media.somi_block_id) {
      return
    }

    // Calculate elapsed time in seconds
    const elapsedMs = Date.now() - startTimeRef.current
    const elapsedSeconds = Math.round(elapsedMs / 1000)

    // Get somi_block_id from media object
    const somiBlockId = media.somi_block_id

    await somiChainService.saveCompletedBlock(somiBlockId, elapsedSeconds)
    console.log(`Completed block ${somiBlockId} saved: ${elapsedSeconds}s`)
  }

  // Auto-play when player is ready
  useEffect(() => {
    if (player) {
      player.play()
    }
  }, [player])

  // Track media playback progress
  useEffect(() => {
    const interval = setInterval(() => {
      if (player) {
        // Don't update currentTime from player if we just seeked
        if (!isSeekingRef.current) {
          setCurrentTime(player.currentTime || 0)
        }
        setDuration(player.duration || 0)
        // Update playing state (especially important for audio player)
        setIsPlayingState(player.playing)
      }
    }, 100); // Update every 100ms for smooth progress

    return () => clearInterval(interval)
  }, [player])

  // Auto-navigate when media ends
  useEffect(() => {
    if (duration > 0 && currentTime >= duration - 0.5) {
      player.pause()
      // Save completed block before navigating
      saveCompletedBlock()

      // Navigate based on where we came from
      if (fromExplore) {
        // From Explore: just go back to the category detail page
        navigation.goBack()
      } else {
        // From Check In flow: navigate to Step 4 (post-session check-in)
        navigation.replace('CheckIn', {
          fromPlayer: true,
          savedInitialValue,
          savedInitialState,
          wasBodyScan: isBodyScan,
          returnToStep: currentStep,
          savedSliderValue,
          savedPolyvagalState,
        })
      }
    }
  }, [currentTime, duration, navigation, player, savedInitialValue, savedInitialState, isBodyScan, currentStep, savedSliderValue, savedPolyvagalState, fromExplore])

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
    if (showControls && !isScrubbing) {
      hideTimeoutRef.current = setTimeout(() => {
        // Check if still playing when timer fires
        if (player.playing) {
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
  }, [showControls, isScrubbing, player])

  const handlePlayPause = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

    // Check current playing state directly from player
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
    const newTime = Math.max(0, currentTime - 15)

    // Audio player uses seekTo(), video player uses currentTime property
    if (isAudio) {
      player.seekTo(newTime)
    } else {
      player.currentTime = newTime
    }

    // Reset the auto-hide timer
    setShowControls(false)
    setTimeout(() => setShowControls(true), 10)
  }

  const handleSkipForward = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    const newTime = Math.min(duration, currentTime + 15)

    // Audio player uses seekTo(), video player uses currentTime property
    if (isAudio) {
      player.seekTo(newTime)
    } else {
      player.currentTime = newTime
    }

    // Reset the auto-hide timer
    setShowControls(false)
    setTimeout(() => setShowControls(true), 10)
  }

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    player.pause()
    // Save completed block before closing
    saveCompletedBlock()

    // Navigate based on where we came from
    if (fromExplore) {
      // From Explore: just go back to the category detail page
      navigation.goBack()
    } else {
      // From Check In flow: navigate to Step 4 (post-session check-in)
      navigation.replace('CheckIn', {
        fromPlayer: true,
        savedInitialValue,
        savedInitialState,
        wasBodyScan: isBodyScan,
        returnToStep: currentStep,
        savedSliderValue,
        savedPolyvagalState,
      })
    }
  }

  const toggleControls = () => {
    setShowControls(!showControls)
  }

  const handleToggleBackgroundVideo = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowBackgroundVideo(!showBackgroundVideo)
    // Reset the auto-hide timer
    setShowControls(false)
    setTimeout(() => setShowControls(true), 10)
  }

  const calculatePosition = (touchX, barWidth) => {
    const seekPosition = (touchX / barWidth) * duration
    return Math.max(0, Math.min(duration, seekPosition))
  }

  const handleProgressBarTouch = (event) => {
    if (!progressBarRef.current || !duration) return

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
    if (!isScrubbing || !progressBarRef.current || !duration) return

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

    // Audio player uses seekTo(), video player uses currentTime property
    if (isAudio) {
      player.seekTo(scrubbingPosition)
    } else {
      player.currentTime = scrubbingPosition
    }
    setCurrentTime(scrubbingPosition)

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

  const displayTime = isScrubbing ? scrubbingPosition : currentTime
  const progress = duration > 0 ? displayTime / duration : 0

  return (
    <View style={styles.container}>
      <Pressable style={styles.videoContainer} onPress={toggleControls}>
        {showBackgroundVideo ? (
          <VideoView
            style={styles.video}
            player={backgroundPlayer}
            nativeControls={false}
            contentFit="contain"
          />
        ) : isAudio ? (
          <View style={styles.audioBackground} />
        ) : (
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            contentFit="contain"
          />
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
          onPress={handleClose}
        >
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>

        {/* Toggle button for background video */}
        <TouchableOpacity
          style={styles.toggleButton}
          onPress={handleToggleBackgroundVideo}
        >
          <Text style={styles.toggleText}>{showBackgroundVideo ? '🎬' : '🏔️'}</Text>
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
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        </View>
      </Animated.View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  videoContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: screenWidth,
    height: screenWidth * (16 / 9), // 9:16 aspect ratio (vertical)
    maxHeight: screenHeight,
  },
  audioBackground: {
    width: '100%',
    height: '100%',
    backgroundColor: '#000000',
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
  toggleButton: {
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
  toggleText: {
    fontSize: 24,
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
})
