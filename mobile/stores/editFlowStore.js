import { create } from 'zustand'

export const useEditFlowStore = create((set, get) => ({
  segments: [],
  reasoning: null,
  setSegments: (segments) => set({ segments }),
  setReasoning: (reasoning) => set({ reasoning }),
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
