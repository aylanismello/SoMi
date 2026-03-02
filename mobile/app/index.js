import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import { useAuthStore } from '../stores/authStore'

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (isAuthenticated) {
      router.replace('/(tabs)/Home')
    } else {
      router.replace('/(auth)/welcome')
    }
  }, [isAuthenticated, isLoading])

  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#fff" />
    </View>
  )
}
