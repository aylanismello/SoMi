import { NativeTabs, Icon } from 'expo-router/unstable-native-tabs'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const userId = useAuthStore((state) => state.user?.id)

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />

  return (
    <NativeTabs key={userId}>
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
