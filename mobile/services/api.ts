import Constants from 'expo-constants'
import { supabase } from '../supabase'
import type {
  GenerateFlowParams, GenerateFlowResponse,
  ChainsResponse, ChainResponse, BlocksResponse,
  StreaksResponse, QuoteResponse,
} from '../types'

// Determine API URL based on environment:
// 1. If running from EAS update (preview/production channel) → use Vercel
// 2. If in dev mode locally → use local server (from .env or localhost)
// 3. If production build → use Vercel
const isRunningFromEASUpdate = Constants.executionEnvironment === 'storeClient'

let API_BASE_URL: string

if (isRunningFromEASUpdate) {
  // Running from EAS update in Expo Go (away from computer)
  API_BASE_URL = 'https://so-mi-server.vercel.app/api'
} else if (__DEV__) {
  // Local development - uses .env file (your local IP for phone)
  API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3003/api'
} else {
  // Production build
  API_BASE_URL = 'https://so-mi-server.vercel.app/api'
}


async function apiRequest<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`

  // Get current session token
  const { data: { session } } = await supabase.auth.getSession()
  const accessToken = session?.access_token

  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
      ...options.headers,
    },
    ...options,
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 15000) // 15 second timeout

    const response = await fetch(url, {
      ...config,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'API request failed')
    }

    return data
  } catch (error) {
    console.error(`API Error (${endpoint}):`, error)
    throw error
  }
}

export const api = {
  generateFlow: async ({ polyvagal_state, duration_minutes, body_scan_start = false, body_scan_end = false, local_hour = null, timezone = null }: GenerateFlowParams): Promise<GenerateFlowResponse> => {
    return apiRequest('/flows/generate', {
      method: 'POST',
      body: JSON.stringify({
        polyvagal_state,
        duration_minutes,
        body_scan_start,
        body_scan_end,
        local_hour,
        timezone,
      }),
    })
  },

  // Chains
  getChains: async (limit = 30): Promise<ChainsResponse> => {
    return apiRequest(`/chains?limit=${limit}`)
  },

  getLatestChain: async (flowType: string | null = null): Promise<ChainResponse> => {
    const params = flowType ? `?flow_type=${flowType}` : ''
    return apiRequest(`/chains/latest${params}`)
  },

  createChain: async (flowType = 'daily_flow', durationSeconds = 0): Promise<ChainResponse> => {
    return apiRequest('/chains', {
      method: 'POST',
      body: JSON.stringify({ flow_type: flowType, duration_seconds: durationSeconds }),
    })
  },

  // Embodiment checks
  saveEmbodimentCheck: async (chainId: number, energyLevel: number, safetyLevel: number, journalEntry: string | null = null, tags: string[] | null = null) => {
    return apiRequest('/embodiment-checks', {
      method: 'POST',
      body: JSON.stringify({
        chainId,
        energyLevel,
        safetyLevel,
        journalEntry,
        ...(tags && tags.length > 0 ? { tags } : {}),
      }),
    })
  },

  // Chain entries (completed blocks)
  saveChainEntry: async (chainId: number, blockId: number, secondsElapsed: number, sessionOrder = 0, section: string | null = null) => {
    return apiRequest('/chain-entries', {
      method: 'POST',
      body: JSON.stringify({
        chainId,
        blockId,
        secondsElapsed,
        sessionOrder,
        ...(section ? { section } : {}),
      }),
    })
  },

  // Batch-save multiple chain entries in a single request
  saveChainEntries: async (chainId: number, entries: Array<{ blockId: number; secondsElapsed: number; sessionOrder: number; section?: string | null }>) => {
    return apiRequest('/chain-entries/batch', {
      method: 'POST',
      body: JSON.stringify({ chainId, entries }),
    })
  },

  // Blocks
  getAllBlocks: async (): Promise<BlocksResponse> => {
    return apiRequest('/blocks')
  },

  getBlocks: async (canonicalNames: string | string[]): Promise<BlocksResponse> => {
    const namesParam = Array.isArray(canonicalNames)
      ? canonicalNames.join(',')
      : canonicalNames
    return apiRequest(`/blocks?canonical_names=${namesParam}`)
  },

  // Streaks
  getStreaks: async (): Promise<StreaksResponse> => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
    return apiRequest(`/streaks?tz=${encodeURIComponent(tz)}`)
  },

  // Delete chain
  deleteChain: async (chainId: number) => {
    return apiRequest(`/chains/${chainId}`, {
      method: 'DELETE',
    })
  },

  // Grounding quotes
  getRandomGroundingQuote: async (): Promise<QuoteResponse> => {
    return apiRequest('/grounding-quotes/random')
  },
}
