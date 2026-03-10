import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect } from 'react'
import { useAudioPlayer, setAudioModeAsync } from 'expo-audio'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useFlowMusicStore } from '../stores/flowMusicStore'
import { View, Image, StyleSheet } from 'react-native'
import { soundManager } from '../utils/SoundManager'
import { prefetchVideoBlocks, WATER_BG_URI } from '../constants/media'
import { initSentry, SentryErrorBoundary } from '../services/sentry'

// Initialize Sentry as early as possible
initSentry()

const FLUIDS_URL = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20og%20music/fluids%20v2.mp3'
const TOGETHER_URL = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20music/Nine%20Inch%20Nails%20-%20Together.mp3'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      retry: 2,
    },
  },
})

function _RootLayout() {
  const initialize = useAuthStore((state) => state.initialize)
  const fluidsPlayer = useAudioPlayer(FLUIDS_URL)
  const togetherPlayer = useAudioPlayer(TOGETHER_URL)
  const { setTrackPlayers } = useFlowMusicStore()

  useEffect(() => {
    const subscription = initialize()
    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    if (fluidsPlayer && togetherPlayer) {
      setTrackPlayers(fluidsPlayer, togetherPlayer)
    }
  }, [fluidsPlayer, togetherPlayer])

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
      <View style={styles.root}>
        {/* Water background — rendered once here, never unmounted, always in GPU memory */}
        <Image source={{ uri: WATER_BG_URI }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        {/* Flow journey — tab bar hidden automatically */}
        <Stack.Screen name="FlowInit" options={{ gestureEnabled: false }} />
        <Stack.Screen name="FlowOutro" options={{ gestureEnabled: false }} />
        <Stack.Screen name="FlowEditPlan" options={{ gestureEnabled: true }} />
        <Stack.Screen name="RoutineQueuePreview" />
        <Stack.Screen name="SoMiRoutine" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="FlowBodyScan" options={{ gestureEnabled: false }} />
        <Stack.Screen name="FlowCompletion" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="Player" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="CategoryDetail" />
        <Stack.Screen name="AccountSettings" />
      </Stack>
      </View>
    </QueryClientProvider>
  )
}

// Wrap with Sentry error boundary to catch unhandled JS errors
export default SentryErrorBoundary(_RootLayout)

const styles = StyleSheet.create({
  root: { flex: 1 },
})
