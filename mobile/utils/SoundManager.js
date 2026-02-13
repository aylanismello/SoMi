import { createAudioPlayer } from 'expo-audio'
import { useSettingsStore } from '../stores/settingsStore'

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
      console.log('Sounds already loaded or loading, skipping preload')
      return
    }

    this.isLoading = true
    console.log('🔊 Preloading sound effects...')

    try {
      // Create audio players for both sounds
      console.log('Creating audio players...')
      const startPlayer = createAudioPlayer(SOUND_URLS.blockStart)
      const endPlayer = createAudioPlayer(SOUND_URLS.blockEnd)

      // Verify players were created
      if (!startPlayer || !endPlayer) {
        throw new Error('Failed to create audio players - createAudioPlayer returned null/undefined')
      }

      // Set volume immediately
      startPlayer.volume = 0.5
      endPlayer.volume = 0.5

      // Store players immediately - they will load on first play
      // expo-audio automatically handles buffering
      this.players.blockStart = startPlayer
      this.players.blockEnd = endPlayer

      this.isLoaded = true
      console.log('✅ Sound effects preloaded successfully')
      console.log('Players:', { blockStart: !!startPlayer, blockEnd: !!endPlayer })
    } catch (error) {
      console.error('❌ Failed to preload sound effects:', error)
      this.isLoaded = false
    } finally {
      this.isLoading = false
    }
  }

  // Play a sound effect instantly (game-like)
  async playSound(soundKey) {
    // Check if SFX is enabled
    const { isSfxEnabled } = useSettingsStore.getState()
    if (!isSfxEnabled) {
      console.log(`🔇 SFX disabled in settings, skipping ${soundKey}`)
      return
    }

    // Lazy load if not already loaded
    if (!this.isLoaded && !this.isLoading) {
      console.log(`⏳ Sounds not loaded, preloading now for ${soundKey}`)
      await this.preloadSounds()
    }

    // Wait for loading to complete if in progress
    let waitCount = 0
    while (this.isLoading && waitCount < 20) {
      await new Promise(resolve => setTimeout(resolve, 100))
      waitCount++
    }

    const player = this.players[soundKey]
    if (!player) {
      console.warn(`❌ Sound "${soundKey}" not found in players:`, Object.keys(this.players))
      console.warn(`isLoaded: ${this.isLoaded}, isLoading: ${this.isLoading}`)
      return
    }

    try {
      console.log(`▶️ Playing sound: ${soundKey} (isSfxEnabled: ${isSfxEnabled})`)

      // Set volume to 50%
      player.volume = 0.5

      // Stop current playback if any, then restart from beginning
      // This ensures rapid-fire sounds always work
      if (player.playing) {
        console.log(`⏸️ Pausing currently playing ${soundKey}`)
        player.pause()
      }

      // Seek to start and play (await seekTo to ensure it completes)
      await player.seekTo(0)
      player.play()

      console.log(`✅ Sound ${soundKey} play() called successfully`)
    } catch (error) {
      console.error(`❌ Failed to play sound "${soundKey}":`, error)
      console.error('Error details:', error.message, error.stack)
      // Don't throw - just log and continue (sound failure shouldn't break app)
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
