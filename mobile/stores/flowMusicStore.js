import { create } from 'zustand'

/**
 * Flow Music Store - Manages global flow music state
 * Replaces FlowMusicContext
 */
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
      // Only start if not already playing
      if (!isPlaying) {
        try {
          audioPlayer.seekTo(0)
          audioPlayer.loop = true
          audioPlayer.volume = isMusicEnabled ? get().volume : 0
          audioPlayer.play()
          set({ isPlaying: true })
          console.log('Flow music started')
        } catch (error) {
          console.error('Error starting flow music:', error)
        }
      } else {
        console.log('Flow music already playing')
      }
    } else {
      console.warn('Cannot start flow music: audio player not initialized')
    }
  },

  stopFlowMusic: () => {
    const { audioPlayer } = get()
    if (audioPlayer) {
      try {
        audioPlayer.pause()
        set({ isPlaying: false, volume: 1 })
        console.log('Flow music stopped')
      } catch (error) {
        console.error('Error stopping flow music:', error)
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
