import { StatusBar } from 'expo-status-bar'
import { Pressable, View, Text } from 'react-native'
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import { useEffect } from 'react'
import HomeScreen from './components/HomeScreen'
import SoMiCheckIn from './components/SoMiCheckIn'
import PlayerScreen from './components/PlayerScreen'
import MySomiScreen from './components/MySomiScreen'
import SoMiTimer from './components/SoMiTimer'
import SoMiRoutineScreen from './components/SoMiRoutineScreen'
import RoutineQueuePreview from './components/RoutineQueuePreview'
import BodyScanCountdown from './components/BodyScanCountdown'
import ExploreScreen from './components/ExploreScreen'
import CategoryDetailScreen from './components/CategoryDetailScreen'
import MeditationTimerSetup from './components/MeditationTimerSetup'
import MeditationTimerActive from './components/MeditationTimerActive'
import IntervalTimeSelector from './components/IntervalTimeSelector'
import { prefetchVideoBlocks } from './constants/media'
import { colors } from './constants/theme'
import { SettingsProvider } from './contexts/SettingsContext'
import { FlowMusicProvider } from './contexts/FlowMusicContext'

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
        name="MeditationTimerSetup"
        component={MeditationTimerSetup}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="IntervalTimeSelector"
        component={IntervalTimeSelector}
        options={{
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="MeditationTimerActive"
        component={MeditationTimerActive}
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

// Stack navigator for Check In tab (includes Player modal and SoMi Timer)
function CheckInStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: colors.background.primary },
      }}
    >
      <Stack.Screen name="CheckIn" component={SoMiCheckIn} />
      <Stack.Screen name="SoMiCheckIn" component={SoMiCheckIn} />
      <Stack.Screen
        name="SoMiTimer"
        component={SoMiTimer}
        options={{
          presentation: 'card',
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

// Stack navigator for My SoMi tab (includes Player modal)
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

export default function App() {
  // Prefetch video blocks on app startup for better UX
  useEffect(() => {
    prefetchVideoBlocks()
  }, [])

  return (
    <SettingsProvider>
      <FlowMusicProvider>
        <NavigationContainer>
          <StatusBar style="light" />
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
            } else if (route.name === 'My SoMi') {
              iconName = focused ? 'leaf' : 'leaf-outline'
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
              // Hide tab bar on Player and Meditation Timer screens
              if (routeName === 'Player' || routeName === 'MeditationTimerSetup' || routeName === 'IntervalTimeSelector' || routeName === 'MeditationTimerActive') {
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
        <Tab.Screen
          name="Flow"
          component={CheckInStack}
          options={({ route }) => ({
            tabBarLabel: 'Flow',
            tabBarStyle: (() => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'CheckIn'
              // Hide tab bar when on CheckIn screen, SoMiTimer, SoMiRoutine, BodyScanCountdown, RoutineQueuePreview, or Player
              if (routeName === 'Player' || routeName === 'CheckIn' || routeName === 'SoMiTimer' || routeName === 'SoMiRoutine' || routeName === 'BodyScanCountdown' || routeName === 'SoMiCheckIn' || routeName === 'RoutineQueuePreview') {
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
          name="My SoMi"
          component={MySomiStack}
          options={({ route }) => ({
            tabBarLabel: 'My SoMi',
            tabBarStyle: (() => {
              const routeName = getFocusedRouteNameFromRoute(route) ?? 'MySomiMain'
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
        </Tab.Navigator>
      </NavigationContainer>
      </FlowMusicProvider>
    </SettingsProvider>
  )
}
