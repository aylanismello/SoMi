import { create } from 'zustand'
import type { RoutineStore, Segment, MediaItem, InitializeRoutineParams } from '../types'

export const useRoutineStore = create<RoutineStore>((set, get) => ({
  // ── Segment-driven state (v1 flow engine) ─────────────────────────────────
  // The segments array is THE source of truth for playback order.
  // Each segment has { type, section, duration_seconds, ...extras }.
  // The player walks segmentIndex forward; segment type dispatches rendering.
  segments: [],
  segmentIndex: 0,

  // ── Legacy session state (still used by player internals) ─────────────────
  currentCycle: 1,
  totalBlocks: 6,
  phase: 'interstitial', // 'video' | 'interstitial' - derived from segment type
  remainingSeconds: 0, // live countdown updated every second by SoMiRoutineScreen

  // Video state
  currentVideo: null,
  selectedVideoId: null,

  // Initial check-in state (preserved for final check-in)
  savedInitialEnergy: null,
  savedInitialSafety: null,
  savedInitialValue: 0,
  savedInitialState: null,

  // Routine config
  routineType: 'morning',
  isQuickRoutine: false,
  flowType: 'daily_flow', // 'daily_flow' | 'quick_routine' | 'single_block'

  // ── Computed helpers ──────────────────────────────────────────────────────
  currentSegment: () => {
    const { segments, segmentIndex } = get()
    return segments[segmentIndex] ?? null
  },

  // ── Actions ───────────────────────────────────────────────────────────────
  setRemainingSeconds: (s) => set({ remainingSeconds: s }),
  setCurrentCycle: (cycle) => set({ currentCycle: cycle }),

  setPhase: (phase) => set({ phase }),

  setSegments: (segments) => set({ segments }),
  setSegmentIndex: (idx) => set({ segmentIndex: idx }),

  advanceSegment: () => set((state) => ({
    segmentIndex: state.segmentIndex + 1,
  })),

  // Update a single segment by index (used for block swapping in RoutineQueuePreview)
  updateSegment: (index, data) => set((state) => ({
    segments: state.segments.map((s, i) => i === index ? { ...s, ...data } as Segment : s),
  })),

  setCurrentVideo: (video) => set({
    currentVideo: video,
    selectedVideoId: video?.somi_block_id || null,
  }),

  initializeRoutine: ({
    totalBlocks,
    routineType,
    savedInitialEnergy = null,
    savedInitialSafety = null,
    savedInitialValue,
    savedInitialState,
    segments = null,
    isQuickRoutine = false,
    flowType = null,
  }) => set({
    totalBlocks,
    routineType,
    savedInitialEnergy,
    savedInitialSafety,
    savedInitialValue,
    savedInitialState,
    isQuickRoutine,
    flowType: flowType || (isQuickRoutine ? 'quick_routine' : 'daily_flow'),
    currentCycle: 1,
    phase: 'interstitial',
    segments: segments || [],
    segmentIndex: 0,
    currentVideo: null,
    selectedVideoId: null,
    remainingSeconds: totalBlocks * 80,
  }),

  advanceCycle: () => set((state) => ({
    currentCycle: state.currentCycle + 1,
  })),

  resetRoutine: () => set({
    currentCycle: 1,
    totalBlocks: 6,
    phase: 'interstitial',
    segments: [],
    segmentIndex: 0,
    currentVideo: null,
    selectedVideoId: null,
    savedInitialEnergy: null,
    savedInitialSafety: null,
    savedInitialValue: 0,
    savedInitialState: null,
    routineType: 'morning',
    isQuickRoutine: false,
    flowType: 'daily_flow',
  }),
}))
