// API client for SoMi backend
// All backend communication goes through this service
import Constants from 'expo-constants'

// Determine API URL based on environment:
// 1. If running from EAS update (preview/production channel) → use Vercel
// 2. If in dev mode locally → use local server (from .env or localhost)
// 3. If production build → use Vercel
const isRunningFromEASUpdate = Constants.executionEnvironment === 'storeClient'

let API_BASE_URL

// if (isRunningFromEASUpdate) {
  // Running from EAS update in Expo Go (away from computer)
  // API_BASE_URL = 'https://so-mi-server.vercel.app/api'
// } else if (__DEV__) {
  // Local development
  // API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api'
// } else {
  // Production build
  API_BASE_URL = 'https://so-mi-server.vercel.app/api'
// }

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`

  const config = {
    headers: {
      'Content-Type': 'application/json',
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
  generateRoutine: async (routineType, blockCount) => {
    return apiRequest('/routines/generate', {
      method: 'POST',
      body: JSON.stringify({ routineType, blockCount }),
    })
  },

  // Chains
  getChains: async (limit = 30) => {
    return apiRequest(`/chains?limit=${limit}`)
  },

  getLatestChain: async () => {
    return apiRequest('/chains/latest')
  },

  createChain: async () => {
    return apiRequest('/chains', {
      method: 'POST',
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
}
