import Constants from 'expo-constants'
import { supabase } from '../supabase'
import type {
  GenerateFlowParams, GenerateFlowResponse,
  ChainsResponse, ChainResponse, BlocksResponse,
  StreaksResponse, QuoteResponse,
} from '../types'

export class AIServiceError extends Error {
  public statusCode: number | null
  public isRateLimit: boolean
  public isNetworkError: boolean

  constructor(message: string, opts: { statusCode?: number | null, isRateLimit?: boolean, isNetworkError?: boolean } = {}) {
    super(message)
    this.name = 'AIServiceError'
    this.statusCode = opts.statusCode ?? null
    this.isRateLimit = opts.isRateLimit ?? false
    this.isNetworkError = opts.isNetworkError ?? false
  }
}

export function isAIServiceError(error: unknown): error is AIServiceError {
  return error instanceof AIServiceError
}

const isRunningFromEASUpdate = Constants.executionEnvironment === 'storeClient'
const PRODUCTION_API_BASE_URL = 'https://so-mi-server.vercel.app/api'
const LOCAL_API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://127.0.0.1:3003/api'

let API_BASE_URL: string

if (isRunningFromEASUpdate) {
  API_BASE_URL = PRODUCTION_API_BASE_URL
} else if (__DEV__) {
  API_BASE_URL = LOCAL_API_BASE_URL
} else {
  API_BASE_URL = PRODUCTION_API_BASE_URL
}

function shouldRetryAgainstProduction(error: unknown, baseUrl: string): boolean {
  if (!__DEV__ || isRunningFromEASUpdate || baseUrl === PRODUCTION_API_BASE_URL) {
    return false
  }

  return (
    error instanceof TypeError ||
    (error instanceof Error && error.name === 'AbortError')
  )
}

async function performRequest<T = unknown>(baseUrl: string, endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${baseUrl}${endpoint}`
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
    throw error
  }
}

async function apiRequest<T = unknown>(endpoint: string, options: RequestInit = {}): Promise<T> {
  try {
    return await performRequest<T>(API_BASE_URL, endpoint, options)
  } catch (error) {
    if (shouldRetryAgainstProduction(error, API_BASE_URL)) {
      API_BASE_URL = PRODUCTION_API_BASE_URL
      console.warn(`Retrying ${endpoint} against production API`)
      return performRequest<T>(PRODUCTION_API_BASE_URL, endpoint, options)
    }

    console.warn(`API Error (${endpoint}) via ${API_BASE_URL}:`, error)
    throw error
  }
}

export const api = {
  generateFlow: async ({ polyvagal_state, duration_minutes, body_scan_start = false, body_scan_end = false, local_hour = null, timezone = null }: GenerateFlowParams): Promise<GenerateFlowResponse> => {
    try {
      return await apiRequest('/flows/generate', {
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
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Flow generation unavailable'
      const isNetwork = error instanceof TypeError || (error instanceof Error && error.name === 'AbortError')
      const isRateLimit = message.toLowerCase().includes('rate limit') || message.includes('429')
      throw new AIServiceError(message, { isRateLimit, isNetworkError: isNetwork })
    }
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
