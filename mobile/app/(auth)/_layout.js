import { Stack } from 'expo-router'
import { Redirect } from 'expo-router'
import { useAuthStore } from '../../stores/authStore'

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)

  if (isAuthenticated) return <Redirect href="/(tabs)/Home" />

  return <Stack screenOptions={{ headerShown: false }} />
}
