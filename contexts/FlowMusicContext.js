import { createContext, useContext, useRef, useEffect } from 'react'
import { useAudioPlayer } from 'expo-audio'

const FlowMusicContext = createContext(null)

// The fluids v2.mp3 music that plays throughout the entire SoMi flow
const FLOW_MUSIC_URL = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20og%20music/fluids%20v2.mp3'

export function FlowMusicProvider({ children }) {
  const audioPlayer = useAudioPlayer(FLOW_MUSIC_URL)
  const isPlayingRef = useRef(false)

  useEffect(() => {
    if (audioPlayer) {
      audioPlayer.loop = true
    }
  }, [audioPlayer])

  const startFlowMusic = (isMusicEnabled = true) => {
    if (audioPlayer && !isPlayingRef.current) {
      audioPlayer.seekTo(0)
      audioPlayer.loop = true
      audioPlayer.volume = isMusicEnabled ? 1 : 0
      audioPlayer.play()
      isPlayingRef.current = true
      console.log('Flow music started')
    }
  }

  const stopFlowMusic = () => {
    if (audioPlayer && isPlayingRef.current) {
      audioPlayer.pause()
      isPlayingRef.current = false
      console.log('Flow music stopped')
    }
  }

  const setFlowMusicVolume = (volume) => {
    if (audioPlayer) {
      audioPlayer.volume = volume
    }
  }

  const updateMusicSetting = (isMusicEnabled) => {
    if (audioPlayer && isPlayingRef.current) {
      audioPlayer.volume = isMusicEnabled ? 1 : 0
    }
  }

  return (
    <FlowMusicContext.Provider
      value={{
        startFlowMusic,
        stopFlowMusic,
        setFlowMusicVolume,
        updateMusicSetting,
        audioPlayer
      }}
    >
      {children}
    </FlowMusicContext.Provider>
  )
}

export function useFlowMusic() {
  const context = useContext(FlowMusicContext)
  if (!context) {
    throw new Error('useFlowMusic must be used within FlowMusicProvider')
  }
  return context
}
