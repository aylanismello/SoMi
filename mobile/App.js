import { StatusBar } from 'expo-status-bar'
import { Pressable, View, Text } from 'react-native'
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useEffect, useState } from 'react'
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
import SignInModal from './components/SignInModal'
import CreateAccountScreen from './components/CreateAccountScreen'
import FlowMenuScreen from './components/FlowMenuScreen'
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
const Tab = createBottomTabNavigator()

// Stack navigator for Home tab (includes Player modal and Meditation Timer)
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="HomeMain" component={HomeScreen} />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  )
}

// Stack navigator for Flow tab (includes all flow screens)
function CheckInStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen
        name="FlowMenu"
        component={FlowMenuScreen}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="SoMiCheckIn"
        component={SoMiCheckIn}
        options={{
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="SoMiTimer"
        component={SoMiTimer}
        options={{
          presentation: 'card',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="RoutineQueuePreview"
        component={RoutineQueuePreview}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="SoMiRoutine"
        component={SoMiRoutineScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="BodyScanCountdown"
        component={BodyScanCountdown}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="CompletionScreen"
        component={CompletionScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  )
}

// Stack navigator for Explore tab (includes category detail and player)
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
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
      />
    </Stack.Navigator>
  )
}

// Stack navigator for My SoMi tab (includes Player modal and Account Settings)
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
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="Player"
        component={PlayerScreen}
        options={{
          presentation: 'fullScreenModal',
          gestureEnabled: false,
        }}
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
  const flowAudioPlayer = useAudioPlayer(FLOW_MUSIC_URL, (player) => {
    player.loop = true
  })

  const { setAudioPlayer } = useFlowMusicStore()

  // Set the audio player in the store once on mount
  useEffect(() => {
    if (flowAudioPlayer) {
      setAudioPlayer(flowAudioPlayer)
      console.log('App: Flow music player initialized')
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
          <View style={{ flex: 1, backgroundColor: colors.background.primary }} />
        ) : !isAuthenticated ? (
          <AuthStack />
        ) : (
        <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            // Special handling for Flow tab with wave emoji
            if (route.name === 'Flow') {
              return (
                <View style={{ alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 24 }}>🌊</Text>
                </View>
              )
            }

            // Regular Ionicons for other tabs
            let iconName
            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline'
            } else if (route.name === 'Explore') {
              iconName = focused ? 'compass' : 'compass-outline'
            } else if (route.name === 'Profile') {
              iconName = focused ? 'person' : 'person-outline'
            }

            return (
              <Ionicons
                name={iconName}
                size={24}
                color={focused ? '#FFFFFF' : colors.text.muted}
              />
            )
          },
          tabBarButton: (props) => {
            const isFocused = props.accessibilityState?.selected
            return (
              <Pressable
                {...props}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    paddingVertical: 12,
                    paddingHorizontal: 8,
                    backgroundColor: isFocused ? colors.accent.primary : 'transparent',
                    borderRadius: 20,
                    marginHorizontal: 6,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                {props.children}
              </Pressable>
            )
          },
          tabBarStyle: {
            backgroundColor: colors.background.secondary,
            borderTopColor: colors.border.subtle,
            borderTopWidth: 1,
            paddingTop: 12,
            paddingBottom: 32,
            paddingHorizontal: 8,
            height: 90,
          },
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.text.primary,
          tabBarInactiveTintColor: colors.text.muted,
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '600',
            letterSpacing: 0.3,
            marginTop: 4,
          },
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={({ route }) => ({
            tabBarLabel: 'Home',
            tabBarStyle: (() => {
              const routeName = getFocusedRouteNameFromRoute(route)
              // Hide tab bar on Player screen
              if (routeName === 'Player') {
                return { display: 'none' }
              }
              return {
                backgroundColor: colors.background.secondary,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
                borderTopWidth: 1,
                paddingTop: 12,
                paddingBottom: 32,
                paddingHorizontal: 20,
                height: 90,
              }
            })(),
          })}
        />
        {/* MVP: Flow tab hidden - no routines for now
        <Tab.Screen
          name="Flow"
          component={CheckInStack}
          options={({ route }) => ({
            tabBarLabel: 'Flow',
            tabBarStyle: (() => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'FlowMenu'
              // Hide tab bar when on flow screens (except FlowMenu)
              if (routeName === 'Player' || routeName === 'SoMiTimer' || routeName === 'SoMiRoutine' || routeName === 'BodyScanCountdown' || routeName === 'SoMiCheckIn' || routeName === 'RoutineQueuePreview' || routeName === 'CompletionScreen') {
                return { display: 'none' }
              }
              return {
                backgroundColor: colors.background.secondary,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
                borderTopWidth: 1,
                paddingTop: 12,
                paddingBottom: 32,
                paddingHorizontal: 20,
                height: 90,
              }
            })(),
          })}
        />
        */}
        {/* Temporarily hidden - coming back later
        <Tab.Screen
          name="Explore"
          component={ExploreStack}
          options={({ route }) => ({
            tabBarLabel: 'Explore',
            tabBarStyle: (() => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'ExploreMain'
              // Hide tab bar when on Player
              if (routeName === 'Player') {
                return { display: 'none' }
              }
              return {
                backgroundColor: colors.background.secondary,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
                borderTopWidth: 1,
                paddingTop: 12,
                paddingBottom: 32,
                paddingHorizontal: 20,
                height: 90,
              }
            })(),
          })}
        />
        */}
        <Tab.Screen
          name="Profile"
          component={MySomiStack}
          options={({ route }) => ({
            tabBarLabel: 'My SoMi',
            tabBarStyle: (() => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'MySomiMain'
              // Hide tab bar when on Player or AccountSettings
              if (routeName === 'Player' || routeName === 'AccountSettings') {
                return { display: 'none' }
              }
              return {
                backgroundColor: colors.background.secondary,
                borderTopColor: 'rgba(255, 255, 255, 0.1)',
                borderTopWidth: 1,
                paddingTop: 12,
                paddingBottom: 32,
                paddingHorizontal: 20,
                height: 90,
              }
            })(),
          })}
        />
        </Tab.Navigator>
        )}
      </NavigationContainer>
    </QueryClientProvider>
  )
}
