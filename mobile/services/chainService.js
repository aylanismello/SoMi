// Chain service - manages active chain and API calls
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from './api'

const ACTIVE_CHAIN_KEY = 'active_somi_chain_id'

export const chainService = {
  // Get or create active chain
  async getOrCreateActiveChain() {
    try {
      // Check if there's an active chain in storage
      const storedChainId = await AsyncStorage.getItem(ACTIVE_CHAIN_KEY)

      if (storedChainId) {
        const chainId = parseInt(storedChainId, 10)

        // Verify the chain still exists
        const { chain } = await api.getLatestChain()

        if (chain && chain.id === chainId) {
          return chainId
        }
      }

      // Create new chain via API
      const { chain } = await api.createChain()
      await AsyncStorage.setItem(ACTIVE_CHAIN_KEY, String(chain.id))
      return chain.id
    } catch (error) {
      console.error('Error getting/creating active chain:', error)
      return null
    }
  },

  // Save completed block to chain
  async saveCompletedBlock(somiBlockId, secondsElapsed, orderIndex = 0, chainId = null) {
    try {
      const activeChainId = chainId || await this.getOrCreateActiveChain()

      if (!activeChainId) {
        console.error('No active chain available')
        return null
      }

      const { entry } = await api.saveChainEntry(
        activeChainId,
        somiBlockId,
        secondsElapsed,
        orderIndex
      )

      return entry
    } catch (error) {
      console.error('Error saving completed block:', error)
      return null
    }
  },

  // Save embodiment check
  async saveEmbodimentCheck(sliderValue, polyvagalStateCode, journalEntry = null) {
    try {
      const chainId = await this.getOrCreateActiveChain()

      if (!chainId) {
        console.error('No active chain available')
        return null
      }

      const { check } = await api.saveEmbodimentCheck(
        chainId,
        sliderValue,
        polyvagalStateCode,
        journalEntry
      )

      return check
    } catch (error) {
      console.error('Error saving embodiment check:', error)
      return null
    }
  },

  // End active chain (clear from storage)
  async endActiveChain() {
    try {
      await AsyncStorage.removeItem(ACTIVE_CHAIN_KEY)
    } catch (error) {
      console.error('Error ending active chain:', error)
    }
  },

  // Get latest chain
  async getLatestChain() {
    try {
      const { chain } = await api.getLatestChain()
      return chain
    } catch (error) {
      console.error('Error getting latest chain:', error)
      return null
    }
  },

  // Fetch chains with data
  async fetchChainsWithData(limit = 30) {
    try {
      const { chains } = await api.getChains(limit)
      return chains
    } catch (error) {
      console.error('Error fetching chains:', error)
      return []
    }
  },

  // Delete chain
  async deleteChain(chainId) {
    try {
      const response = await fetch(`${API_BASE_URL}/chains/${chainId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete chain')
      }

      const data = await response.json()
      return data
    } catch (error) {
      console.error('Error deleting chain:', error)
      return null
    }
  },
}
