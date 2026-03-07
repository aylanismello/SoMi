import { NativeTabs, Icon } from 'expo-router/unstable-native-tabs'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const userId = useAuthStore((state) => state.user?.id)
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace('/(auth)/welcome')
    }
  }, [isAuthenticated, isLoading])

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
