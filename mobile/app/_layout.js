import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useFlowMusicStore } from '../stores/flowMusicStore'
import { soundManager } from '../utils/SoundManager'
import { prefetchVideoBlocks } from '../constants/media'

const FLOW_MUSIC_URL = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20og%20music/fluids%20v2.mp3'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
    },
  },
})

export default function RootLayout() {
  const initialize = useAuthStore((state) => state.initialize)
  const flowAudioPlayer = useAudioPlayer(FLOW_MUSIC_URL)
  const { setAudioPlayer } = useFlowMusicStore()

  useEffect(() => {
    const subscription = initialize()
    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    if (flowAudioPlayer) {
      setAudioPlayer(flowAudioPlayer)
    }
  }, [flowAudioPlayer])

  useEffect(() => {
    // Configure iOS audio session: play sounds even when silent switch is on,
    // and mix with other audio (e.g. flow music + sound effects together)
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    })
    prefetchVideoBlocks()
    soundManager.preloadSounds()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        {/* Flow journey — tab bar hidden automatically */}
        <Stack.Screen name="DailyFlowSetup" options={{ gestureEnabled: false }} />
        <Stack.Screen name="SoMiCheckIn" options={{ gestureEnabled: false }} />
        <Stack.Screen name="RoutineQueuePreview" />
        <Stack.Screen name="SoMiRoutine" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="BodyScanCountdown" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="CompletionScreen" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="Player" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="CategoryDetail" />
        <Stack.Screen name="AccountSettings" />
      </Stack>
    </QueryClientProvider>
  )
}
