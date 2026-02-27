import { Tabs, Redirect } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { View, StyleSheet } from 'react-native'
import { useAuthStore } from '../../stores/authStore'

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />

  return (
    <Tabs
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
        tabBarStyle: styles.bar,
        tabBarBackground: () => <View style={styles.background} />,
        tabBarLabelStyle: styles.label,
      })}
    >
      <Tabs.Screen name="Home" options={{ title: 'Home' }} />
      <Tabs.Screen name="Explore" options={{ title: 'Explore' }} />
      <Tabs.Screen name="Profile" options={{ title: 'My SoMi' }} />
    </Tabs>
  )
}

const styles = StyleSheet.create({
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
