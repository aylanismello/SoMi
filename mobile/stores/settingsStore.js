import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

/**
 * Settings Store - Global app settings
 * Replaces SettingsContext, persists to AsyncStorage
 */
export const useSettingsStore = create(
  persist(
    (set) => ({
      // Settings
      isMusicEnabled: true,
      showTime: true,

      // Actions
      toggleMusic: () => set((state) => ({
        isMusicEnabled: !state.isMusicEnabled,
      })),

      toggleShowTime: () => set((state) => ({
        showTime: !state.showTime,
      })),

      setMusicEnabled: (enabled) => set({ isMusicEnabled: enabled }),
      setShowTime: (show) => set({ showTime: show }),
    }),
    {
      name: 'somi-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
