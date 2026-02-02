// API client for SoMi backend
// All backend communication goes through this service

// For development: Check env var first (for physical device), fallback to localhost (for simulator)
// For production: your deployed server URL
const API_BASE_URL = __DEV__
  ? (process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000/api')
  : 'https://your-vercel-app.vercel.app/api'

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
    const response = await fetch(url, config)
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
