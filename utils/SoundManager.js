import { Audio } from 'expo-av'

// Sound effect URLs
const SOUND_URLS = {
  blockStart: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20sounds/block_start_sound.mp3',
  blockEnd: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20sounds/block_end_sound.mp3',
}

class SoundManager {
  constructor() {
    this.sounds = {}
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
      // Set audio mode for mixing with other audio (background music, etc.)
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: false, // Don't duck other audio
      })

      // Preload both sounds
      const [startResult, endResult] = await Promise.all([
        Audio.Sound.createAsync(
          { uri: SOUND_URLS.blockStart },
          { shouldPlay: false }, // Don't play immediately
          null, // No status callback needed for sound effects
          true // Download first for reliability
        ),
        Audio.Sound.createAsync(
          { uri: SOUND_URLS.blockEnd },
          { shouldPlay: false },
          null,
          true
        ),
      ])

      this.sounds.blockStart = startResult.sound
      this.sounds.blockEnd = endResult.sound

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

    const sound = this.sounds[soundKey]
    if (!sound) {
      console.warn(`Sound "${soundKey}" not found`)
      return
    }

    try {
      // Rewind to start (in case it was played before) and play
      await sound.setPositionAsync(0)
      await sound.playAsync()
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
      await Promise.all(
        Object.values(this.sounds).map(sound => sound.unloadAsync())
      )
      this.sounds = {}
      this.isLoaded = false
      console.log('Sound effects unloaded')
    } catch (error) {
      console.error('Failed to unload sounds:', error)
    }
  }
}

// Export singleton instance for app-wide use
export const soundManager = new SoundManager()
