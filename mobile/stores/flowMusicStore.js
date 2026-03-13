import { create } from 'zustand'
import { Animated, Easing } from 'react-native'
import { FADE_IN_MS, FADE_CROSS_MS, FADE_OUT_MS } from '../constants/config'

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

// Attach volume listener BEFORE starting animation to avoid race condition
function startFade(volumeAnim, player, toValue, duration, onComplete) {
  volumeAnim.stopAnimation()
  volumeAnim.removeAllListeners()

  // Register listener first so no frame is missed
  volumeAnim.addListener(({ value }) => {
    try { player.volume = value } catch (_) {}
  })

  Animated.timing(volumeAnim, {
    toValue,
    duration,
    easing: Easing.inOut(Easing.ease),
    useNativeDriver: false,
  }).start(({ finished }) => {
    if (finished) {
      volumeAnim.removeAllListeners()
      onComplete?.()
    }
  })
}

export const useFlowMusicStore = create((set, get) => ({
  // Players (set once at boot from _layout.js)
  fluidsPlayer: null,
  togetherPlayer: null,

  // audioPlayer kept for backward-compat
  audioPlayer: null,

  // Live playback state
  isPlaying: false,
  currentTrackId: 'fluids',
  flowStartedAt: null, // Date.now() when flow music session began

  setTrackPlayers: (fluidsPlayer, togetherPlayer) => {
    set({ fluidsPlayer, togetherPlayer, audioPlayer: fluidsPlayer })
  },

  startFlowMusic: (isMusicEnabled = true, trackId = 'fluids') => {
    const state = get()

    // If already playing this exact track and player is actually running, skip
    const existingPlayer = playerFor(state, trackId)
    if (state.isPlaying && state.currentTrackId === trackId && existingPlayer?.playing) return

    // Stop any active music cleanly before (re)starting
    const prevPlayer = playerFor(state, state.currentTrackId)
    const prevVolumeAnim = volumeAnimFor(state.currentTrackId)
    if (prevPlayer && prevVolumeAnim) {
      prevVolumeAnim.stopAnimation()
      prevVolumeAnim.removeAllListeners()
      try { prevPlayer.pause() } catch (_) {}
      prevVolumeAnim.setValue(0)
    }

    // Stop all anims to be safe
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
      activePlayer.muted = false
      activePlayer.volume = 0
      activePlayer.play()

      volumeAnim.setValue(0)
      startFade(volumeAnim, activePlayer, 1, FADE_IN_MS)
    } catch (e) {
      console.error('❌ Error starting flow music:', e)
      set({ isPlaying: false, flowStartedAt: null })
    }
  },

  // Switch to a different track at the current flow-clock position.
  switchTrack: (newTrackId) => {
    const state = get()
    if (newTrackId === state.currentTrackId) return

    const currentPlayer = playerFor(state, state.currentTrackId)
    const currentVolumeAnim = volumeAnimFor(state.currentTrackId)
    const newPlayer = playerFor(state, newTrackId)
    const newVolumeAnim = volumeAnimFor(newTrackId)

    set({ currentTrackId: newTrackId, audioPlayer: newPlayer })

    if (!state.isPlaying) return

    // Fade out current track, then pause it
    if (currentPlayer && currentVolumeAnim) {
      startFade(currentVolumeAnim, currentPlayer, 0, FADE_CROSS_MS, () => {
        try { currentPlayer.pause() } catch (_) {}
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
        newPlayer.muted = false
        newPlayer.volume = 0
        newPlayer.play()

        newVolumeAnim.setValue(0)
        startFade(newVolumeAnim, newPlayer, 1, FADE_CROSS_MS)
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
      startFade(activeVolumeAnim, activePlayer, 0, FADE_OUT_MS, () => {
        try { activePlayer.pause() } catch (_) {}
        activeVolumeAnim.setValue(0)
      })
    } else {
      try { activePlayer.pause() } catch (_) {}
    }
  },

  pauseFlowMusic: () => {
    const state = get()
    if (!state.isPlaying) return
    const player = playerFor(state, state.currentTrackId)
    try { if (player) player.pause() } catch (_) {}
    set({ isPlaying: false })
  },

  resumeFlowMusic: () => {
    const state = get()
    if (state.isPlaying) return
    const player = playerFor(state, state.currentTrackId)
    if (player && state.currentTrackId !== 'none') {
      try { player.play() } catch (_) {}
    }
    set({ isPlaying: true })
  },

  // Called by the music monitor to recover from unexpected stops (e.g. AirPods disconnect)
  recoverPlayback: () => {
    const state = get()
    if (!state.isPlaying || state.currentTrackId === 'none') return
    const player = playerFor(state, state.currentTrackId)
    if (player && !player.playing) {
      try {
        player.play()
        console.log('🎵 Music recovered after unexpected stop')
      } catch (e) {
        console.error('❌ Failed to recover music playback:', e)
      }
    }
  },

  setVolume: (volume) => {
    const state = get()
    const player = playerFor(state, state.currentTrackId)
    if (player) {
      try { player.volume = volume } catch (_) {}
    }
  },

  updateMusicSetting: (isMusicEnabled) => {
    const state = get()
    if (!state.isPlaying) return
    const player = playerFor(state, state.currentTrackId)
    const volumeAnim = volumeAnimFor(state.currentTrackId)
    if (player) {
      try {
        const v = isMusicEnabled ? 1 : 0
        player.volume = v
        if (volumeAnim) volumeAnim.setValue(v)
      } catch (_) {}
    }
  },
}))
