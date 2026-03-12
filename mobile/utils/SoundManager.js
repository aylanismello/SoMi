import { createAudioPlayer } from 'expo-audio'
import { useSettingsStore } from '../stores/settingsStore'

// Bundled sound assets — no network needed, instant load
const SOUND_SOURCES = {
  blockStart: require('../assets/sounds/start_sound.wav'),
  blockEnd: require('../assets/sounds/end_sound.wav'),
}

class SoundManager {
  constructor() {
    this.players = {}
    this.isLoaded = false
  }

  preloadSounds() {
    if (this.isLoaded) return

    try {
      const startPlayer = createAudioPlayer(SOUND_SOURCES.blockStart)
      const endPlayer = createAudioPlayer(SOUND_SOURCES.blockEnd)

      startPlayer.volume = 0.5
      endPlayer.volume = 0.5

      this.players.blockStart = startPlayer
      this.players.blockEnd = endPlayer
      this.isLoaded = true
      console.log('✅ Sound effects loaded from bundle')
    } catch (error) {
      console.error('❌ Failed to load sound effects:', error)
    }
  }

  playSound(soundKey) {
    const { isSfxEnabled } = useSettingsStore.getState()
    if (!isSfxEnabled) return

    if (!this.isLoaded) this.preloadSounds()

    const player = this.players[soundKey]
    if (!player) {
      console.warn(`❌ Sound "${soundKey}" not available`)
      return
    }

    try {
      player.volume = 0.5
      if (player.playing) player.pause()
      player.seekTo(0)
      player.play()
    } catch (error) {
      console.error(`❌ Failed to play sound "${soundKey}":`, error)
    }
  }

  playBlockStart() {
    this.playSound('blockStart')
  }

  playBlockEnd() {
    this.playSound('blockEnd')
  }

  unloadSounds() {
    try {
      Object.values(this.players).forEach(p => p.release())
      this.players = {}
      this.isLoaded = false
    } catch (error) {
      console.error('Failed to unload sounds:', error)
    }
  }
}

export const soundManager = new SoundManager()
