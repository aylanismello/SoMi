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
      isSfxEnabled: true,
      bodyScanStart: true,
      bodyScanEnd: true,

      // Actions
      toggleMusic: () => set((state) => ({
        isMusicEnabled: !state.isMusicEnabled,
      })),

      toggleSfx: () => set((state) => ({
        isSfxEnabled: !state.isSfxEnabled,
      })),

      setMusicEnabled: (enabled) => set({ isMusicEnabled: enabled }),
      setSfxEnabled: (enabled) => set({ isSfxEnabled: enabled }),
      setBodyScanStart: (val) => set({ bodyScanStart: val }),
      setBodyScanEnd: (val) => set({ bodyScanEnd: val }),
    }),
    {
      name: 'somi-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
