import { StatusBar } from 'expo-status-bar'
import { View, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useEffect } from 'react'
import { useAudioPlayer } from 'expo-audio'
import React from 'react'
import HomeScreen from './components/HomeScreen'
import SoMiCheckIn from './components/SoMiCheckIn'
import PlayerScreen from './components/PlayerScreen'
import MySomiScreen from './components/MySomiScreen'
import SoMiTimer from './components/SoMiTimer'
import SoMiRoutineScreen from './components/SoMiRoutineScreen'
import RoutineQueuePreview from './components/RoutineQueuePreview'
import BodyScanCountdown from './components/BodyScanCountdown'
import CompletionScreen from './components/CompletionScreen'
import ExploreScreen from './components/ExploreScreen'
import CategoryDetailScreen from './components/CategoryDetailScreen'
import AccountSettingsScreen from './components/AccountSettingsScreen'
import WelcomeScreen from './components/WelcomeScreen'
import SplashScreen from './components/SplashScreen'
import CreateAccountScreen from './components/CreateAccountScreen'
import DailyFlowSetup from './components/DailyFlowSetup'
import { useAuthStore } from './stores/authStore'
import { prefetchVideoBlocks } from './constants/media'
import { colors } from './constants/theme'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useFlowMusicStore } from './stores/flowMusicStore'
import { soundManager } from './utils/SoundManager'

// The fluids v2.mp3 music that plays throughout the entire SoMi flow
const FLOW_MUSIC_URL = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20og%20music/fluids%20v2.mp3'

// Create React Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 2,
    },
  },
})

const Stack = createStackNavigator()
const RootStack = createStackNavigator()
const Tab = createBottomTabNavigator()

// Stack navigator for Home tab
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
    </Stack.Navigator>
  )
}

// Stack navigator for Explore tab
function ExploreStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="ExploreMain" component={ExploreScreen} />
      <Stack.Screen name="CategoryDetail" component={CategoryDetailScreen} />
    </Stack.Navigator>
  )
}

// Stack navigator for My SoMi tab
function MySomiStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="MySomiMain" component={MySomiScreen} />
      <Stack.Screen
        name="AccountSettings"
        component={AccountSettingsScreen}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  )
}

// Auth stack navigator for welcome and sign in screens
function AuthStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
    </Stack.Navigator>
  )
}

// Three-tab navigator
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused, color }) => {
          let iconName
          if (route.name === 'Home') {
            iconName = focused ? 'home' : 'home-outline'
          } else if (route.name === 'Explore') {
            iconName = focused ? 'search' : 'search-outline'
          } else if (route.name === 'Profile') {
            iconName = focused ? 'person' : 'person-outline'
          }
          return <Ionicons name={iconName} size={22} color={color} />
        },
        tabBarActiveTintColor: '#FFFFFF',
        tabBarInactiveTintColor: 'rgba(255,255,255,0.4)',
        tabBarStyle: tabStyles.bar,
        tabBarBackground: () => <View style={tabStyles.background} />,
        tabBarLabelStyle: tabStyles.label,
      })}
    >
      <Tab.Screen name="Home" component={HomeStack} options={{ title: 'Home' }} />
      <Tab.Screen name="Explore" component={ExploreStack} options={{ title: 'Explore' }} />
      <Tab.Screen name="Profile" component={MySomiStack} options={{ title: 'My SoMi' }} />
    </Tab.Navigator>
  )
}

// Root navigator: tabs + flow journey + player rendered above tabs
function AppNavigator() {
  return (
    <RootStack.Navigator screenOptions={{ headerShown: false, cardStyle: { backgroundColor: '#000000' } }}>
      <RootStack.Screen name="Main" component={MainTabs} />
      {/* Flow journey — rendered above tabs, tab bar hidden automatically */}
      <RootStack.Screen
        name="DailyFlowSetup"
        component={DailyFlowSetup}
        options={{ gestureEnabled: false }}
      />
      <RootStack.Screen
        name="SoMiCheckIn"
        component={SoMiCheckIn}
        options={{ gestureEnabled: false }}
      />
      <RootStack.Screen
        name="SoMiTimer"
        component={SoMiTimer}
        options={{ gestureEnabled: false }}
      />
      <RootStack.Screen name="RoutineQueuePreview" component={RoutineQueuePreview} />
      <RootStack.Screen
        name="SoMiRoutine"
        component={SoMiRoutineScreen}
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <RootStack.Screen
        name="BodyScanCountdown"
        component={BodyScanCountdown}
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <RootStack.Screen
        name="CompletionScreen"
        component={CompletionScreen}
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
      <RootStack.Screen
        name="Player"
        component={PlayerScreen}
        options={{ presentation: 'fullScreenModal', gestureEnabled: false }}
      />
    </RootStack.Navigator>
  )
}

export default function App() {
  // Get auth state
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const initialize = useAuthStore((state) => state.initialize)

  // Initialize auth listener
  useEffect(() => {
    const subscription = initialize()
    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  // Create flow music audio player at app level so it persists
  // Note: useAudioPlayer doesn't accept a callback like useVideoPlayer
  const flowAudioPlayer = useAudioPlayer(FLOW_MUSIC_URL)

  const { setAudioPlayer } = useFlowMusicStore()

  // Set the audio player in the store once on mount
  useEffect(() => {
    if (flowAudioPlayer) {
      setAudioPlayer(flowAudioPlayer)
      console.log('✅ App: Flow music player initialized:', {
        hasPlayer: !!flowAudioPlayer,
        volume: flowAudioPlayer.volume,
        playing: flowAudioPlayer.playing,
        muted: flowAudioPlayer.muted,
        loop: flowAudioPlayer.loop,
        currentTime: flowAudioPlayer.currentTime,
        duration: flowAudioPlayer.duration
      })

      // Test the player to make sure it can play
      try {
        console.log('🧪 Testing flow music player...')
        // Just verify the play method exists
        if (typeof flowAudioPlayer.play === 'function') {
          console.log('✅ Player has play() method')
        } else {
          console.error('❌ Player missing play() method!')
        }
      } catch (testError) {
        console.error('❌ Error testing flow music player:', testError)
      }
    } else {
      console.warn('❌ App: Flow music player is null/undefined')
    }
  }, [flowAudioPlayer])

  // Prefetch video blocks and preload sounds on app startup for better UX
  useEffect(() => {
    prefetchVideoBlocks()
    soundManager.preloadSounds()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <NavigationContainer>
        <StatusBar style="light" />
        {isLoading ? (
          <SplashScreen />
        ) : !isAuthenticated ? (
          <AuthStack />
        ) : (
          <AppNavigator />
        )}
      </NavigationContainer>
    </QueryClientProvider>
  )
}

const tabStyles = StyleSheet.create({
  bar: {
    position: 'absolute',
    bottom: 24,
    left: '8%',
    right: '8%',
    height: 64,
    borderRadius: 32,
    borderTopWidth: 0,
    elevation: 0,
    backgroundColor: 'transparent',
  },
  background: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: 'rgba(18,18,18,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.2,
    marginTop: 2,
  },
})
