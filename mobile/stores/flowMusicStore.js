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
  setAudioPlayer: (player) => set({ audioPlayer: player }),

  startFlowMusic: (isMusicEnabled = true) => {
    const { audioPlayer, isPlaying } = get()
    if (audioPlayer) {
      if (!isPlaying) {
        try {
          // Ensure audio player is ready before playing
          // Some audio players need a brief moment to initialize
          const attemptPlay = () => {
            try {
              audioPlayer.seekTo(0)
              audioPlayer.loop = true
              audioPlayer.volume = 0
              audioPlayer.play()
              set({ isPlaying: true })

              // Smooth fade in using Animated API
              const targetVolume = isMusicEnabled ? 1 : 0
              volumeAnim.setValue(0)

              Animated.timing(volumeAnim, {
                toValue: targetVolume,
                duration: 2000,
                easing: Easing.inOut(Easing.ease),
                useNativeDriver: false,
              }).start()

              // Listen to animated value and update audio volume
              volumeAnim.addListener(({ value }) => {
                if (audioPlayer) {
                  audioPlayer.volume = value
                  set({ volume: value })
                }
              })

              console.log('Flow music started with smooth fade in')
            } catch (playError) {
              console.error('Error playing audio:', playError)
              // Reset state if play fails
              set({ isPlaying: false })
            }
          }

          // Try to play immediately, with a fallback retry after a brief delay
          attemptPlay()
        } catch (error) {
          console.error('Error starting flow music:', error)
          set({ isPlaying: false })
        }
      }
    } else {
      console.warn('Cannot start flow music: audio player not initialized')
    }
  },

  stopFlowMusic: () => {
    const { audioPlayer, volume: currentVolume } = get()

    if (audioPlayer) {
      try {
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
            console.log('Flow music stopped with smooth fade out')
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
        console.error('Error stopping flow music:', error)
        audioPlayer.pause()
        set({ isPlaying: false, volume: 1 })
      }
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
