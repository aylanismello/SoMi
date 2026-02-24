// API client for SoMi backend
// All backend communication goes through this service
import Constants from 'expo-constants'
import { supabase } from '../supabase'

// Determine API URL based on environment:
// 1. If running from EAS update (preview/production channel) → use Vercel
// 2. If in dev mode locally → use local server (from .env or localhost)
// 3. If production build → use Vercel
const isRunningFromEASUpdate = Constants.executionEnvironment === 'storeClient'

let API_BASE_URL

if (isRunningFromEASUpdate) {
  // Running from EAS update in Expo Go (away from computer)
  API_BASE_URL = 'https://so-mi-server.vercel.app/api'
} else if (__DEV__) {
  // Local development - uses .env file (your local IP for phone)
  API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'
} else {
  // Production build
  API_BASE_URL = 'https://so-mi-server.vercel.app/api'
}

console.log('🌐 API URL:', API_BASE_URL)


async function apiRequest(endpoint, options = {}) {
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
  // Routine generation
  // Pass optional { polyvagalState, intensity, durationMinutes } for AI-generated routines
  generateRoutine: async (routineType, blockCount, aiParams = null) => {
    const body = { routineType, blockCount, ...aiParams }
    return apiRequest('/routines/generate', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  },

  // Chains
  getChains: async (limit = 30) => {
    return apiRequest(`/chains?limit=${limit}`)
  },

  getLatestChain: async (flowType = null) => {
    const params = flowType ? `?flow_type=${flowType}` : ''
    return apiRequest(`/chains/latest${params}`)
  },

  createChain: async (flowType = 'daily_flow') => {
    return apiRequest('/chains', {
      method: 'POST',
      body: JSON.stringify({ flow_type: flowType }),
    })
  },

  // Embodiment checks
  saveEmbodimentCheck: async (chainId, sliderValue, polyvagalStateCode, journalEntry = null) => {
    return apiRequest('/embodiment-checks', {
      method: 'POST',
      body: JSON.stringify({
        chainId,
        sliderValue,
        polyvagalStateCode,
        journalEntry,
      }),
    })
  },

  // Chain entries (completed blocks)
  saveChainEntry: async (chainId, blockId, secondsElapsed, sessionOrder = 0) => {
    return apiRequest('/chain-entries', {
      method: 'POST',
      body: JSON.stringify({
        chainId,
        blockId,
        secondsElapsed,
        sessionOrder,
      }),
    })
  },

  // Blocks
  getBlocks: async (canonicalNames) => {
    const namesParam = Array.isArray(canonicalNames)
      ? canonicalNames.join(',')
      : canonicalNames
    return apiRequest(`/blocks?canonical_names=${namesParam}`)
  },

  // Delete chain
  deleteChain: async (chainId) => {
    return apiRequest(`/chains/${chainId}`, {
      method: 'DELETE',
    })
  },
}
