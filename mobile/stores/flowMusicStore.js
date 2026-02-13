import { create } from 'zustand'
import { Animated, Easing } from 'react-native'

/**
 * Flow Music Store - Manages global flow music state
 * Replaces FlowMusicContext
 */
// Create animated value for volume (outside store)
const volumeAnim = new Animated.Value(0)

export const useFlowMusicStore = create((set, get) => ({
  // State
  isPlaying: false,
  volume: 1,
  audioPlayer: null,

  // Actions
  setAudioPlayer: (player) => {
    console.log('🎵 setAudioPlayer called:', {
      hasPlayer: !!player,
      playerType: player?.constructor?.name,
      volume: player?.volume,
      loop: player?.loop
    })
    set({ audioPlayer: player })
  },

  startFlowMusic: (isMusicEnabled = true) => {
    const { audioPlayer, isPlaying } = get()
    console.log('🎵 startFlowMusic called:', { hasPlayer: !!audioPlayer, isPlaying, isMusicEnabled })

    if (!audioPlayer) {
      console.warn('❌ Cannot start flow music: audio player not initialized')
      return
    }

    if (isPlaying) {
      console.log('🎵 Flow music already playing, skipping')
      return
    }

    try {
      // Ensure audio player is ready before playing
      // Some audio players need a brief moment to initialize
      const attemptPlay = () => {
        try {
          console.log('🎵 Attempting to start flow music...')
          console.log('🎵 Player state before play:', {
            volume: audioPlayer.volume,
            playing: audioPlayer.playing,
            loop: audioPlayer.loop,
            muted: audioPlayer.muted
          })

          // Ensure player is ready
          audioPlayer.seekTo(0)
          audioPlayer.loop = true
          audioPlayer.volume = 0
          audioPlayer.muted = false // Make sure it's not muted

          console.log('🎵 Calling player.play()...')
          audioPlayer.play()

          set({ isPlaying: true })

          console.log('🎵 Player state after play:', {
            volume: audioPlayer.volume,
            playing: audioPlayer.playing,
            loop: audioPlayer.loop,
            muted: audioPlayer.muted
          })

          // Smooth fade in using Animated API
          const targetVolume = isMusicEnabled ? 1 : 0
          console.log(`🎵 Fading in to volume: ${targetVolume}`)
          volumeAnim.setValue(0)

          Animated.timing(volumeAnim, {
            toValue: targetVolume,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }).start(({ finished }) => {
            if (finished) {
              console.log(`✅ Fade in complete. Final volume: ${audioPlayer.volume}`)
            }
          })

          // Listen to animated value and update audio volume
          volumeAnim.addListener(({ value }) => {
            if (audioPlayer) {
              audioPlayer.volume = value
              set({ volume: value })
            }
          })

          console.log('✅ Flow music started with smooth fade in')
        } catch (playError) {
          console.error('❌ Error playing flow music:', playError)
          console.error('Error details:', playError.message, playError.stack)
          // Reset state if play fails
          set({ isPlaying: false })
        }
      }

      // Try to play immediately
      attemptPlay()
    } catch (error) {
      console.error('❌ Error starting flow music:', error)
      console.error('Error details:', error.message, error.stack)
      set({ isPlaying: false })
    }
  },

  stopFlowMusic: () => {
    const { audioPlayer, volume: currentVolume, isPlaying } = get()
    console.log('🎵 stopFlowMusic called:', { hasPlayer: !!audioPlayer, isPlaying, currentVolume })

    if (!audioPlayer) {
      console.warn('❌ Cannot stop flow music: audio player not initialized')
      return
    }

    if (!isPlaying) {
      console.log('🎵 Flow music not playing, skipping stop')
      return
    }

    try {
      console.log(`🎵 Fading out from volume: ${currentVolume}`)
      // Smooth fade out using Animated API
      volumeAnim.setValue(currentVolume)

      Animated.timing(volumeAnim, {
        toValue: 0,
        duration: 2000,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished && audioPlayer) {
          audioPlayer.pause()
          volumeAnim.removeAllListeners()
          set({ isPlaying: false, volume: 1 })
          console.log('✅ Flow music stopped with smooth fade out')
        }
      })

      // Update audio volume as it animates
      volumeAnim.addListener(({ value }) => {
        if (audioPlayer) {
          audioPlayer.volume = value
          set({ volume: value })
        }
      })
    } catch (error) {
      console.error('❌ Error stopping flow music:', error)
      console.error('Error details:', error.message, error.stack)
      if (audioPlayer) {
        audioPlayer.pause()
      }
      set({ isPlaying: false, volume: 1 })
    }
  },

  setVolume: (volume) => {
    const { audioPlayer } = get()
    if (audioPlayer) {
      try {
        audioPlayer.volume = volume
        set({ volume })
      } catch (error) {
        console.error('Error setting volume:', error)
      }
    }
  },

  updateMusicSetting: (isMusicEnabled) => {
    const { audioPlayer, isPlaying } = get()
    if (audioPlayer && isPlaying) {
      try {
        audioPlayer.volume = isMusicEnabled ? get().volume : 0
      } catch (error) {
        console.error('Error updating music setting:', error)
      }
    }
  },
}))
