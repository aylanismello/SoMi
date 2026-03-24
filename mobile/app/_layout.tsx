import { Stack } from 'expo-router'
import { StatusBar } from 'expo-status-bar'
import { useEffect, useState } from 'react'
import { useAudioPlayer, useAudioPlayerStatus, setAudioModeAsync } from 'expo-audio'
import React from 'react'
import * as SplashScreen from 'expo-splash-screen'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuthStore } from '../stores/authStore'
import { useFlowMusicStore } from '../stores/flowMusicStore'
import { View, Image, StyleSheet } from 'react-native'
import { soundManager } from '../utils/SoundManager'
import { prefetchVideoBlocks, WATER_BG_SOURCE } from '../constants/media'

SplashScreen.preventAutoHideAsync()
SplashScreen.setOptions({ duration: 800, fade: true })

const FLUIDS_URL = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20og%20music/fluids%20v2.mp3'
const TOGETHER_URL = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20music/Nine%20Inch%20Nails%20-%20Together.mp3'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      retry: 2,
    },
  },
})

export default function RootLayout(): React.JSX.Element {
  const initialize = useAuthStore((state) => state.initialize)
  const [appReady, setAppReady] = useState(false)
  const fluidsPlayer = useAudioPlayer(FLUIDS_URL)
  const togetherPlayer = useAudioPlayer(TOGETHER_URL)
  const { setTrackPlayers, recoverPlayback, isPlaying, currentTrackId } = useFlowMusicStore()

  // Monitor player status to recover from unexpected stops (AirPods disconnect, interruptions)
  const fluidsStatus = useAudioPlayerStatus(fluidsPlayer)
  const togetherStatus = useAudioPlayerStatus(togetherPlayer)

  useEffect(() => {
    const subscription = initialize()
    setAppReady(true)
    return () => subscription?.unsubscribe()
  }, [])

  useEffect(() => {
    if (appReady) {
      SplashScreen.hideAsync()
    }
  }, [appReady])

  useEffect(() => {
    if (fluidsPlayer && togetherPlayer) {
      setTrackPlayers(fluidsPlayer, togetherPlayer)
    }
  }, [fluidsPlayer, togetherPlayer])

  useEffect(() => {
    // Configure iOS audio session:
    // - playsInSilentMode: works with the silent switch flipped
    // - shouldPlayInBackground: false (flow music is foreground-only)
    // - interruptionMode: mixWithOthers so music + SFX can coexist
    setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'mixWithOthers',
    })
    prefetchVideoBlocks()
    soundManager.preloadSounds()
  }, [])

  // Auto-recover music after route changes (AirPods disconnect) or OS interruptions.
  // When isPlaying is true but the active player stopped, call play() again.
  useEffect(() => {
    if (!isPlaying || currentTrackId === 'none') return

    const activeStatus = currentTrackId === 'fluids' ? fluidsStatus : togetherStatus
    const activePlayer = currentTrackId === 'fluids' ? fluidsPlayer : togetherPlayer

    if (activeStatus && !activeStatus.playing && activePlayer) {
      recoverPlayback()
    }
  }, [fluidsStatus?.playing, togetherStatus?.playing, isPlaying, currentTrackId])

  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="light" />
      <View style={styles.root}>
        {/* Water background — rendered once here, never unmounted, always in GPU memory */}
        <Image source={WATER_BG_SOURCE} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: 'transparent' } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
        {/* Flow journey — tab bar hidden automatically */}
        <Stack.Screen name="FlowInit" options={{ gestureEnabled: false }} />
        <Stack.Screen name="FlowOutro" options={{ gestureEnabled: false }} />
        <Stack.Screen name="RoutineQueuePreview" />
        <Stack.Screen name="SoMiRoutine" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="FlowBodyScan" options={{ gestureEnabled: false }} />
        <Stack.Screen name="FlowCompletion" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="Player" options={{ presentation: 'fullScreenModal', gestureEnabled: false }} />
        <Stack.Screen name="CategoryDetail" />
        <Stack.Screen name="AccountSettings" />
        <Stack.Screen
          name="EditFlow"
          options={{
            gestureEnabled: true,
            presentation: 'transparentModal',
            animation: 'slide_from_right',
          }}
        />
      </Stack>
      </View>
    </QueryClientProvider>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1 },
})
