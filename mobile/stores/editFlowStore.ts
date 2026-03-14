import { create } from 'zustand'
import type { EditFlowStore, Segment, SomiBlockSegment } from '../types'

export const useEditFlowStore = create<EditFlowStore>((set, get) => ({
  segments: [],
  reasoning: null,
  generationParams: null,
  setSegments: (segments) => set({ segments }),
  setReasoning: (reasoning) => set({ reasoning }),
  setGenerationParams: (params) => set({ generationParams: params }),
  swapBlock: (blockIndex, newBlock) => set((state) => {
    let queueIdx = -1
    const rebuilt = state.segments.map((s) => {
      if (s.type !== 'somi_block') return s
      queueIdx++
      if (queueIdx === blockIndex) {
        return { ...s, ...newBlock, type: 'somi_block' } as Segment
      }
      return s
    })
    return { segments: rebuilt as Segment[] }
  }),
}))
