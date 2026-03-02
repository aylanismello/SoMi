import { NativeTabs, Icon } from 'expo-router/unstable-native-tabs'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'

const EXPLORE_BETA_EMAIL = 'francescoflows@gmail.com'

export default function TabsLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const user = useAuthStore((state) => state.user)

  if (isLoading) return null
  if (!isAuthenticated) return <Redirect href="/(auth)/welcome" />

  const canSeeExplore = user?.email === EXPLORE_BETA_EMAIL

  return (
    <NativeTabs>
      <NativeTabs.Trigger name="Home">
        <Icon sf="house.fill" />
      </NativeTabs.Trigger>
      {canSeeExplore && (
        <NativeTabs.Trigger name="Explore">
          <Icon sf="magnifyingglass" />
        </NativeTabs.Trigger>
      )}
      <NativeTabs.Trigger name="Profile">
        <Icon sf="person.fill" />
      </NativeTabs.Trigger>
    </NativeTabs>
  )
}
