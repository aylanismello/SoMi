import { create } from 'zustand'
import { Animated, Easing } from 'react-native'

export const TRACKS = [
  {
    id: 'fluids',
    label: 'Fluids',
    artist: 'Fluindo',
    color: '#1A4A7A',
    url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20og%20music/fluids%20v2.mp3',
  },
  {
    id: 'together',
    label: 'Together',
    artist: 'Nine Inch Nails',
    color: '#5A1A1A',
    url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20music/Nine%20Inch%20Nails%20-%20Together.mp3',
  },
  {
    id: 'none',
    label: 'Off',
    artist: null,
    color: null,
    url: null,
  },
]

// Per-player volume animators (outside store — non-serializable)
const fluidsVolumeAnim = new Animated.Value(0)
const togetherVolumeAnim = new Animated.Value(0)

const FADE_IN_MS = 2000
const FADE_CROSS_MS = 800

function volumeAnimFor(trackId) {
  if (trackId === 'fluids') return fluidsVolumeAnim
  if (trackId === 'together') return togetherVolumeAnim
  return null
}

function playerFor(state, trackId) {
  if (trackId === 'fluids') return state.fluidsPlayer
  if (trackId === 'together') return state.togetherPlayer
  return null
}

// Animate volume on a player, cleaning up previous listeners first
function fadeVolume(volumeAnim, player, toValue, duration, onFinished) {
  volumeAnim.removeAllListeners()
  Animated.timing(volumeAnim, {
    toValue,
    duration,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: false,
  }).start(({ finished }) => {
    if (finished && onFinished) onFinished()
  })
  volumeAnim.addListener(({ value }) => {
    player.volume = value
  })
}

export const useFlowMusicStore = create((set, get) => ({
  // Players (set once at boot from _layout.js)
  fluidsPlayer: null,
  togetherPlayer: null,

  // audioPlayer kept for backward-compat (checked for readiness in FlowBodyScan / SoMiRoutineScreen)
  audioPlayer: null,

  // Live playback state
  isPlaying: false,
  currentTrackId: 'fluids',
  flowStartedAt: null, // Date.now() when flow music session began (music clock origin)

  setTrackPlayers: (fluidsPlayer, togetherPlayer) => {
    set({ fluidsPlayer, togetherPlayer, audioPlayer: fluidsPlayer })
  },

  startFlowMusic: (isMusicEnabled = true, trackId = 'fluids') => {
    const state = get()
    if (state.isPlaying) return

    // Stop any lingering fade-out animations so they can't drive volume back to 0
    fluidsVolumeAnim.stopAnimation()
    fluidsVolumeAnim.removeAllListeners()
    togetherVolumeAnim.stopAnimation()
    togetherVolumeAnim.removeAllListeners()

    const flowStartedAt = Date.now()
    const activePlayer = playerFor(state, trackId)

    set({ isPlaying: true, currentTrackId: trackId, flowStartedAt, audioPlayer: activePlayer })

    if (!isMusicEnabled || trackId === 'none' || !activePlayer) return

    const volumeAnim = volumeAnimFor(trackId)

    try {
      activePlayer.seekTo(0)
      activePlayer.loop = true
      activePlayer.volume = 0
      activePlayer.muted = false
      activePlayer.play()

      volumeAnim.setValue(0)
      fadeVolume(volumeAnim, activePlayer, 1, FADE_IN_MS)
    } catch (e) {
      console.error('❌ Error starting flow music:', e)
      set({ isPlaying: false, flowStartedAt: null })
    }
  },

  // Switch to a different track, seeking to the current flow-clock position.
  // Safe to call even when not in a flow (just updates preference with no audio change).
  switchTrack: (newTrackId) => {
    const state = get()
    if (newTrackId === state.currentTrackId) return

    const currentPlayer = playerFor(state, state.currentTrackId)
    const currentVolumeAnim = volumeAnimFor(state.currentTrackId)
    const newPlayer = playerFor(state, newTrackId)
    const newVolumeAnim = volumeAnimFor(newTrackId)

    set({ currentTrackId: newTrackId, audioPlayer: newPlayer })

    if (!state.isPlaying) return

    // Fade out current track
    if (currentPlayer && currentVolumeAnim) {
      fadeVolume(currentVolumeAnim, currentPlayer, 0, FADE_CROSS_MS, () => {
        currentPlayer.pause()
        currentVolumeAnim.setValue(0)
      })
    }

    // Fade in new track at the right flow-clock position
    if (newPlayer && newVolumeAnim && newTrackId !== 'none') {
      try {
        const elapsedSec = state.flowStartedAt ? (Date.now() - state.flowStartedAt) / 1000 : 0
        const duration = newPlayer.duration ?? 0
        const seekPos = duration > 0 ? elapsedSec % duration : 0

        newPlayer.seekTo(seekPos)
        newPlayer.loop = true
        newPlayer.volume = 0
        newPlayer.muted = false
        newPlayer.play()

        newVolumeAnim.setValue(0)
        fadeVolume(newVolumeAnim, newPlayer, 1, FADE_CROSS_MS)
      } catch (e) {
        console.error('❌ Error switching track:', e)
      }
    }
  },

  stopFlowMusic: () => {
    const state = get()
    if (!state.isPlaying) return

    const activePlayer = playerFor(state, state.currentTrackId)
    const activeVolumeAnim = volumeAnimFor(state.currentTrackId)

    set({ isPlaying: false, flowStartedAt: null })

    if (!activePlayer) return

    if (activeVolumeAnim) {
      fadeVolume(activeVolumeAnim, activePlayer, 0, 2000, () => {
        activePlayer.pause()
        activeVolumeAnim.setValue(0)
        activeVolumeAnim.removeAllListeners()
      })
    } else {
      activePlayer.pause()
    }
  },

  pauseFlowMusic: () => {
    const state = get()
    if (!state.isPlaying) return
    const player = playerFor(state, state.currentTrackId)
    if (player) player.pause()
    set({ isPlaying: false })
  },

  resumeFlowMusic: () => {
    const state = get()
    if (state.isPlaying) return
    const player = playerFor(state, state.currentTrackId)
    if (player && state.currentTrackId !== 'none') player.play()
    set({ isPlaying: true })
  },

  setVolume: (volume) => {
    const state = get()
    const player = playerFor(state, state.currentTrackId)
    if (player) player.volume = volume
  },

  updateMusicSetting: (isMusicEnabled) => {
    const state = get()
    if (!state.isPlaying) return
    const player = playerFor(state, state.currentTrackId)
    const volumeAnim = volumeAnimFor(state.currentTrackId)
    if (player) {
      const v = isMusicEnabled ? 1 : 0
      player.volume = v
      if (volumeAnim) volumeAnim.setValue(v)
    }
  },
}))
