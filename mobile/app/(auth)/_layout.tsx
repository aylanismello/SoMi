import React from 'react'
import { Stack } from 'expo-router'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { useAuthStore } from '../../stores/authStore'

export default function AuthLayout(): React.JSX.Element | null {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const router = useRouter()

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(tabs)/Home')
    }
  }, [isAuthenticated])

  if (isAuthenticated) return null

  return <Stack screenOptions={{ headerShown: false }} />
}
