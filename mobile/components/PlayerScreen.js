import { useState, useEffect, useRef } from 'react'
import { useNavigation, useRoute } from '@react-navigation/native'
import { useEvent } from 'expo'
import { useVideoPlayer, VideoView } from 'expo-video'
import { useAudioPlayer } from 'expo-audio'
import { StyleSheet, View, TouchableOpacity, Text, Pressable, Animated } from 'react-native'
import PlayerControls from './PlayerControls'
import * as Haptics from 'expo-haptics'
import { BACKGROUND_VIDEO } from '../constants/media'
import { chainService } from '../services/chainService'
import { soundManager } from '../utils/SoundManager'
import { useSettingsStore } from '../stores/settingsStore'
import { useRoutineStore } from '../stores/routineStore'
import CustomizationModal from './CustomizationModal'

export default function PlayerScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const flowType = useRoutineStore(state => state.flowType)
  const {
    media,
    savedInitialValue,
    savedInitialState,
    isBodyScan,
    currentStep,
    savedSliderValue,
    savedPolyvagalState,
    fromExplore = false, // New param to track if we came from Explore
  } = route.params ?? {}
  const isAudio = media.type === 'audio'
  const [showControls, setShowControls] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlayingState, setIsPlayingState] = useState(false)
  const [showBackgroundVideo, setShowBackgroundVideo] = useState(isAudio) // Auto-show for audio
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const controlsOpacity = useRef(new Animated.Value(0)).current

  const { isMusicEnabled } = useSettingsStore()
  const hideTimeoutRef = useRef(null)
  const isSeekingRef = useRef(false)
  const startTimeRef = useRef(Date.now()) // Track when playback started
  const hasSavedRef = useRef(false) // Prevent duplicate saves

  // Conditionally create audio or video player based on media type
  // Safe because media.type never changes during component lifecycle
  const player = isAudio
    ? useAudioPlayer(media.url)
    : useVideoPlayer(media.url, player => {
        player.muted = true
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

    // Prevent duplicate saves
    if (hasSavedRef.current) {
      return
    }
    hasSavedRef.current = true

    // Calculate elapsed time in seconds
    const elapsedMs = Date.now() - startTimeRef.current
    const elapsedSeconds = Math.round(elapsedMs / 1000)

    // Get somi_block_id from media object
    const somiBlockId = media.somi_block_id

    // If fromExplore is true, save without chain association (à la carte viewing)
    // Otherwise, get/create active chain and associate the block with it (check-in flow)
    if (fromExplore) {
      // À la carte viewing - no chain association
      await chainService.saveCompletedBlock(somiBlockId, elapsedSeconds, 0, null)
      console.log(`Completed block ${somiBlockId} saved (à la carte): ${elapsedSeconds}s`)
    } else {
      // Check-in flow - associate with active chain
      const chainId = await chainService.getOrCreateActiveChain(flowType)
      await chainService.saveCompletedBlock(somiBlockId, elapsedSeconds, 0, chainId, flowType)
      console.log(`Completed block ${somiBlockId} saved (chain ${chainId}): ${elapsedSeconds}s`)
    }
  }

  // Auto-play when player is ready and play start sound
  useEffect(() => {
    if (player) {
      // Mute audio players if music is disabled
      if (isAudio && !isMusicEnabled) {
        player.volume = 0
      } else if (isAudio) {
        player.volume = 1
      }

      player.play()
      // Play block start sound only during check-in flow (not from Explore)
      if (!fromExplore && isMusicEnabled) {
        soundManager.playBlockStart()
      }
    }
  }, [player, fromExplore, isAudio, isMusicEnabled])

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
    // Prevent duplicate saves/navigations
    if (hasSavedRef.current) {
      return
    }

    if (duration > 0 && currentTime >= duration - 0.5) {
      player.pause()
      // Play block end sound only during check-in flow (not from Explore)
      if (!fromExplore && isMusicEnabled) {
        soundManager.playBlockEnd()
      }
      // Save completed block before navigating
      saveCompletedBlock()

      // Navigate based on where we came from
      if (fromExplore) {
        // From Explore: just go back to the category detail page
        navigation.goBack()
      } else {
        // From Check In flow: navigate to Step 4 (post-session check-in)
        navigation.replace('SoMiCheckIn', {
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
      duration: 500,
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

    if (showControls) {
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
  }, [showControls, player])

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

  const handleSkipToNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    player.pause()
    // Play block end sound only during check-in flow (not from Explore)
    if (!fromExplore && isMusicEnabled) {
      soundManager.playBlockEnd()
    }
    // Save completed block before navigating
    saveCompletedBlock()

    // Navigate based on where we came from
    if (fromExplore) {
      // From Explore: just go back to the category detail page
      navigation.goBack()
    } else {
      // From Check In flow: navigate to Step 4 (post-session check-in)
      navigation.replace('SoMiCheckIn', {
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

  const handleOpenSettings = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setShowSettingsModal(true)
  }

  const handleCloseSettings = () => {
    setShowSettingsModal(false)
  }

  const progress = duration > 0 ? currentTime / duration : 0

  return (
    <View style={styles.container}>
      <Pressable style={styles.videoContainer} onPress={toggleControls}>
        {showBackgroundVideo ? (
          <VideoView
            style={styles.video}
            player={backgroundPlayer}
            nativeControls={false}
            contentFit="cover"
          />
        ) : isAudio ? (
          <View style={styles.audioBackground} />
        ) : (
          <VideoView
            style={styles.video}
            player={player}
            nativeControls={false}
            contentFit="cover"
          />
        )}
      </Pressable>

      <Animated.View
        style={[styles.controlsOverlay, { opacity: controlsOpacity }]}
        pointerEvents={showControls ? 'box-none' : 'none'}
      >
        {/* Dark overlay scrim */}
        <View style={styles.overlayScrim} pointerEvents="none" />

        {/* Settings button */}
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={handleOpenSettings}
        >
          <Text style={styles.settingsText}>⚙️</Text>
        </TouchableOpacity>

        <View style={styles.controlsContainer}>
          {/* Play/Pause button */}
          <TouchableOpacity
            style={styles.playPauseButton}
            onPress={handlePlayPause}
          >
            <Text style={styles.playPauseText}>
              {isPlayingState ? '❚❚' : '▶'}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>

      <PlayerControls
        isPaused={!isPlayingState}
        onPause={handlePlayPause}
        onPlay={handlePlayPause}
        onStop={() => navigation.goBack()}
        onOpenSettings={handleOpenSettings}
        skipLabel="Skip Block"
        onSkip={handleSkipToNext}
        fillWidth={`${progress * 100}%`}
        showControls={showControls}
      />

      <CustomizationModal visible={showSettingsModal} onClose={handleCloseSettings} />
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
    width: '100%',
    height: '100%',
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
  settingsButton: {
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
  settingsText: {
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
})
