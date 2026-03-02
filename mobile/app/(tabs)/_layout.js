import { NativeTabs, Icon } from 'expo-router/unstable-native-tabs'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="Home">
        <Icon sf="house.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="Explore">
        <Icon sf="magnifyingglass" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="Profile">
        <Icon sf="person.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
