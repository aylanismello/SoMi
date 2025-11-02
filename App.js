import { StatusBar } from 'expo-status-bar'
import { View, Pressable } from 'react-native'
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { Ionicons } from '@expo/vector-icons'
import HomeScreen from './components/HomeScreen'
import SoMeCheckIn from './components/SoMeCheckIn'
import PlayerScreen from './components/PlayerScreen'

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

// Stack navigator for Home tab (includes Player modal)
function HomeStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0f0c29' },
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

// Stack navigator for Check In tab (includes Player modal)
function CheckInStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#0f0c29' },
      }}
    >
      <Stack.Screen name="CheckIn" component={SoMeCheckIn} />
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
  return (
    <NavigationContainer>
      <StatusBar style="light" />
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarIcon: ({ focused }) => {
            let iconName

            if (route.name === 'Home') {
              iconName = focused ? 'home' : 'home-outline'
            } else if (route.name === 'Check In') {
              iconName = focused ? 'heart-circle' : 'heart-circle-outline'
            }

            return <Ionicons name={iconName} size={24} color={focused ? '#ffffff' : 'rgba(247, 249, 251, 0.6)'} />
          },
          tabBarButton: (props) => {
            const isFocused = props.accessibilityState?.selected
            return (
              <Pressable
                {...props}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    backgroundColor: isFocused ? '#4ecdc4' : 'transparent',
                    borderRadius: 20,
                    marginHorizontal: 12,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              />
            )
          },
          tabBarStyle: {
            backgroundColor: '#1a1625',
            borderTopColor: 'rgba(255, 255, 255, 0.1)',
            borderTopWidth: 1,
            paddingTop: 12,
            paddingBottom: 32,
            paddingHorizontal: 20,
            height: 90,
          },
          tabBarShowLabel: true,
          tabBarActiveTintColor: '#4ecdc4',
          tabBarInactiveTintColor: 'rgba(247, 249, 251, 0.6)',
          tabBarLabelStyle: {
            fontSize: 13,
            fontWeight: '600',
            letterSpacing: 0.5,
            marginTop: 8,
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
              if (routeName === 'Player') {
                return { display: 'none' }
              }
              return {
                backgroundColor: '#1a1625',
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
          name="Check In"
          component={CheckInStack}
          options={({ route }) => ({
            tabBarLabel: 'Check In',
            tabBarStyle: (() => {
              const routeName = getFocusedRouteNameFromRoute(route)
              if (routeName === 'Player') {
                return { display: 'none' }
              }
              return {
                backgroundColor: '#1a1625',
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
  )
}
