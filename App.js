import { StatusBar } from 'expo-status-bar'
import { NavigationContainer, getFocusedRouteNameFromRoute } from '@react-navigation/native'
import { createStackNavigator } from '@react-navigation/stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import HomeScreen from './components/HomeScreen'
import SoMeCheckIn from './components/SoMeCheckIn'
import PlayerScreen from './components/PlayerScreen'

const Stack = createStackNavigator()
const Tab = createBottomTabNavigator()

// Stack navigator for Check In tab (includes Player modal)
function CheckInStack() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        cardStyle: { backgroundColor: '#000000' },
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
        screenOptions={{
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopColor: '#333333',
          },
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#666666',
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarStyle: {
              backgroundColor: '#000000',
              borderTopColor: '#333333',
            },
          }}
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
                backgroundColor: '#000000',
                borderTopColor: '#333333',
              }
            })(),
          })}
        />
      </Tab.Navigator>
    </NavigationContainer>
  )
}
