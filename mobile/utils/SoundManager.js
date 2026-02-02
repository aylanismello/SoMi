import { createAudioPlayer } from 'expo-audio'

// Sound effect URLs
const SOUND_URLS = {
  blockStart: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20sounds/start_sound.wav',
  blockEnd: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20sounds/end_sound.wav',
}

class SoundManager {
  constructor() {
    this.players = {}
    this.isLoaded = false
    this.isLoading = false
  }

  // Preload all sound effects for instant playback (game-like performance)
  async preloadSounds() {
    if (this.isLoaded || this.isLoading) {
      return
    }

    this.isLoading = true

    try {
      // Create audio players for both sounds
      const startPlayer = createAudioPlayer(SOUND_URLS.blockStart)
      const endPlayer = createAudioPlayer(SOUND_URLS.blockEnd)

      // Set volume immediately
      startPlayer.volume = 0.5
      endPlayer.volume = 0.5

      // Store players immediately - they will load on first play
      // expo-audio automatically handles buffering
      this.players.blockStart = startPlayer
      this.players.blockEnd = endPlayer

      this.isLoaded = true
      console.log('Sound effects preloaded successfully')
    } catch (error) {
      console.error('Failed to preload sound effects:', error)
    } finally {
      this.isLoading = false
    }
  }

  // Play a sound effect instantly (game-like)
  async playSound(soundKey) {
    // Lazy load if not already loaded
    if (!this.isLoaded && !this.isLoading) {
      await this.preloadSounds()
    }

    const player = this.players[soundKey]
    if (!player) {
      console.warn(`Sound "${soundKey}" not found`)
      return
    }

    try {
      // Set volume to 50%
      player.volume = 0.5
      // Rewind to start (in case it was played before) and play
      player.seekTo(0)
      player.play()
    } catch (error) {
      console.error(`Failed to play sound "${soundKey}":`, error)
    }
  }

  // Play block start sound
  async playBlockStart() {
    await this.playSound('blockStart')
  }

  // Play block end sound
  async playBlockEnd() {
    await this.playSound('blockEnd')
  }

  // Unload all sounds (cleanup)
  async unloadSounds() {
    try {
      Object.values(this.players).forEach(player => player.release())
      this.players = {}
      this.isLoaded = false
      console.log('Sound effects unloaded')
    } catch (error) {
      console.error('Failed to unload sounds:', error)
    }
  }
}

// Export singleton instance for app-wide use
export const soundManager = new SoundManager()
