import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'

import type { SettingsStore, TrackId } from '../types'

export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      // Settings
      isMusicEnabled: true,
      isSfxEnabled: true,
      bodyScanStart: true,
      bodyScanEnd: true,
      selectedTrackId: 'fluids', // 'fluids' | 'together' | 'none'

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
      setSelectedTrack: (id) => set({ selectedTrackId: id }),
    }),
    {
      name: 'somi-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
)
