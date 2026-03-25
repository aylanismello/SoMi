import React from 'react'
import { useRouter } from 'expo-router'
import { useEffect } from 'react'
import { View, ActivityIndicator } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useAuthStore } from '../stores/authStore'

const ONBOARDING_KEY = 'somi_onboarding_seen'

export default function Index(): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const isLoading = useAuthStore((state) => state.isLoading)
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return
    if (!isAuthenticated) {
      router.replace('/(auth)/welcome')
      return
    }

    AsyncStorage.getItem(ONBOARDING_KEY).then((seen) => {
      if (seen === 'true') {
        router.replace('/(tabs)/Home')
      } else {
        router.replace('/onboarding')
      }
    })
  }, [isAuthenticated, isLoading])

  return (
    <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator color="#fff" />
    </View>
  )
}
