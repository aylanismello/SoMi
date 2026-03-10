import { create } from 'zustand'

/**
 * Lightweight store to bridge FlowInit ↔ FlowEditPlan screens.
 * FlowInit writes segments before navigating; FlowEditPlan reads/updates them;
 * FlowInit reads back on return.
 */
export const useFlowEditStore = create((set) => ({
  segments: [],
  setSegments: (segments) => set({ segments }),
  updateSegment: (index, data) => set((state) => ({
    segments: state.segments.map((s, i) => i === index ? { ...s, ...data } : s),
  })),
  clear: () => set({ segments: [] }),
}))
