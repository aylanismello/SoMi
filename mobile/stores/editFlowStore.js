import { create } from 'zustand'

export const useEditFlowStore = create((set, get) => ({
  segments: [],
  setSegments: (segments) => set({ segments }),
  swapBlock: (blockIndex, newBlock) => set((state) => {
    let queueIdx = -1
    const rebuilt = state.segments.map((s) => {
      if (s.type !== 'somi_block') return s
      queueIdx++
      if (queueIdx === blockIndex) {
        return { ...s, ...newBlock, type: 'somi_block' }
      }
      return s
    })
    return { segments: rebuilt }
  }),
}))
