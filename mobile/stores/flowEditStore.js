import { create } from 'zustand'

// Lightweight store to share flow segments between FlowInit ↔ EditFlow screens
export const useFlowEditStore = create((set) => ({
  segments: [],
  setSegments: (segments) => set({ segments }),

  // Replace a somi_block at the given queue index within the full segments array
  swapBlock: (queueIndex, newBlockData) => set((state) => {
    const segments = [...state.segments]
    // Find the nth somi_block (matching queueIndex)
    let count = 0
    for (let i = 0; i < segments.length; i++) {
      if (segments[i].type === 'somi_block') {
        if (count === queueIndex) {
          segments[i] = { ...segments[i], ...newBlockData }
          break
        }
        count++
      }
    }
    return { segments }
  }),
}))
