import { create } from 'zustand'

/**
 * Routine Store - Manages active routine session state
 * Replaces scattered useState and navigation params in SoMiRoutineScreen
 */
export const useRoutineStore = create((set, get) => ({
  // Session state
  currentCycle: 1,
  totalBlocks: 6,
  phase: 'interstitial', // 'video' | 'interstitial' - always starts at interstitial

  // Queue management
  hardcodedQueue: [],
  currentVideo: null,
  selectedVideoId: null,

  // Initial check-in state (preserved for final check-in)
  savedInitialValue: 0,
  savedInitialState: null,

  // Routine config
  routineType: 'morning',
  isQuickRoutine: false,

  // Actions
  setCurrentCycle: (cycle) => set({ currentCycle: cycle }),

  setPhase: (phase) => set({ phase }),

  setQueue: (queue) => set({ hardcodedQueue: queue }),

  updateBlockInQueue: (index, block) => set((state) => ({
    hardcodedQueue: state.hardcodedQueue.map((b, i) =>
      i === index ? block : b
    )
  })),

  setCurrentVideo: (video) => set({
    currentVideo: video,
    selectedVideoId: video?.id || null,
  }),

  initializeRoutine: ({
    totalBlocks,
    routineType,
    savedInitialValue,
    savedInitialState,
    customQueue = null,
    isQuickRoutine = false,
  }) => set({
    totalBlocks,
    routineType,
    savedInitialValue,
    savedInitialState,
    isQuickRoutine,
    currentCycle: 1,
    phase: 'interstitial', // Always start at interstitial
    hardcodedQueue: customQueue || [],
    currentVideo: null,
    selectedVideoId: null,
  }),

  advanceCycle: () => set((state) => ({
    currentCycle: state.currentCycle + 1,
  })),

  resetRoutine: () => set({
    currentCycle: 1,
    totalBlocks: 6,
    phase: 'interstitial', // Reset to interstitial
    hardcodedQueue: [],
    currentVideo: null,
    selectedVideoId: null,
    savedInitialValue: 0,
    savedInitialState: null,
    routineType: 'morning',
    isQuickRoutine: false,
  }),
}))
