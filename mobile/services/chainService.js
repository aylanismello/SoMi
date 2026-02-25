// Chain service - manages active chain and API calls
import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from './api'

const ACTIVE_CHAIN_KEY = 'active_somi_chain_id'
const SESSION_CHECKS_KEY = 'session_embodiment_checks'
const SESSION_BLOCKS_KEY = 'session_completed_blocks'

export const chainService = {
  // Session storage for checks and blocks (before chain creation)
  async saveCheckToSession(sliderValue, polyvagalStateCode, journalEntry = null, tags = null) {
    try {
      const existing = await AsyncStorage.getItem(SESSION_CHECKS_KEY)
      const checks = existing ? JSON.parse(existing) : []

      checks.push({
        sliderValue,
        polyvagalStateCode,
        journalEntry,
        tags: tags && tags.length > 0 ? tags : null,
        timestamp: Date.now(),
      })

      await AsyncStorage.setItem(SESSION_CHECKS_KEY, JSON.stringify(checks))
      console.log(`📝 Saved check to session (${checks.length} total)`)
    } catch (error) {
      console.error('Error saving check to session:', error)
    }
  },

  async saveBlockToSession(somiBlockId, secondsElapsed, orderIndex = 0, section = null) {
    try {
      const existing = await AsyncStorage.getItem(SESSION_BLOCKS_KEY)
      const blocks = existing ? JSON.parse(existing) : []

      blocks.push({
        somiBlockId,
        secondsElapsed,
        orderIndex,
        section,
        timestamp: Date.now(),
      })

      await AsyncStorage.setItem(SESSION_BLOCKS_KEY, JSON.stringify(blocks))
      console.log(`🎯 Saved block to session (${blocks.length} total)`)
    } catch (error) {
      console.error('Error saving block to session:', error)
    }
  },

  async getSessionData() {
    try {
      const checksStr = await AsyncStorage.getItem(SESSION_CHECKS_KEY)
      const blocksStr = await AsyncStorage.getItem(SESSION_BLOCKS_KEY)

      return {
        checks: checksStr ? JSON.parse(checksStr) : [],
        blocks: blocksStr ? JSON.parse(blocksStr) : [],
      }
    } catch (error) {
      console.error('Error getting session data:', error)
      return { checks: [], blocks: [] }
    }
  },

  async clearSessionData() {
    try {
      await AsyncStorage.removeItem(SESSION_CHECKS_KEY)
      await AsyncStorage.removeItem(SESSION_BLOCKS_KEY)
      console.log('🧹 Cleared session data')
    } catch (error) {
      console.error('Error clearing session data:', error)
    }
  },

  // Create chain and upload all session data (called only when flow is complete)
  async createChainFromSession(flowType = 'daily_flow') {
    try {
      console.log('🎉 Creating chain from session data...')

      // Get all session data
      const { checks, blocks } = await this.getSessionData()

      if (checks.length === 0) {
        console.error('❌ No checks in session, cannot create chain')
        return null
      }

      // Create the chain
      const { chain } = await api.createChain(flowType)
      const chainId = chain.id
      console.log(`✅ Created chain ${chainId}`)

      // Upload all embodiment checks
      for (const check of checks) {
        await api.saveEmbodimentCheck(
          chainId,
          check.sliderValue,
          check.polyvagalStateCode,
          check.journalEntry,
          check.tags || null
        )
        console.log(`  ✅ Uploaded check`)
      }

      // Upload all completed blocks
      for (const block of blocks) {
        await api.saveChainEntry(
          chainId,
          block.somiBlockId,
          block.secondsElapsed,
          block.orderIndex,
          block.section || null
        )
        console.log(`  ✅ Uploaded block ${block.somiBlockId}`)
      }

      // Clear session data
      await this.clearSessionData()

      console.log(`🎊 Chain ${chainId} created successfully with ${checks.length} checks and ${blocks.length} blocks`)
      return chainId

    } catch (error) {
      console.error('Error creating chain from session:', error)
      return null
    }
  },

  // Get or create active chain (legacy - only used for quick routines now)
  async getOrCreateActiveChain(flowType = 'daily_flow') {
    try {
      // Check if there's an active chain in storage
      const storedChainId = await AsyncStorage.getItem(ACTIVE_CHAIN_KEY)

      if (storedChainId) {
        const chainId = parseInt(storedChainId, 10)

        // Verify the chain still exists (with error handling for timeout)
        try {
          const { chain } = await api.getLatestChain()

          if (chain && chain.id === chainId) {
            return chainId
          }
        } catch (verifyError) {
          console.warn('Could not verify existing chain, creating new one:', verifyError)
          // Continue to create new chain
        }
      }

      // Create new chain via API (with retry logic)
      let retries = 2
      while (retries > 0) {
        try {
          const { chain } = await api.createChain(flowType)
          await AsyncStorage.setItem(ACTIVE_CHAIN_KEY, String(chain.id))
          return chain.id
        } catch (createError) {
          retries--
          if (retries === 0) {
            throw createError
          }
          // Wait 1 second before retry
          await new Promise(resolve => setTimeout(resolve, 1000))
        }
      }
    } catch (error) {
      console.error('Error getting/creating active chain:', error)
      return null
    }
  },

  // Save completed block - now saves to session for daily flows
  async saveCompletedBlock(somiBlockId, secondsElapsed, orderIndex = 0, chainId = null, flowType = 'daily_flow', section = null) {
    try {
      // For daily flows without a chainId, save to session (will upload when flow completes)
      if (!chainId && flowType === 'daily_flow') {
        return await this.saveBlockToSession(somiBlockId, secondsElapsed, orderIndex, section)
      }

      // For quick routines or when chainId is provided, use old behavior
      const activeChainId = chainId || await this.getOrCreateActiveChain(flowType)

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

  // Save embodiment check - now saves to session for daily flows
  async saveEmbodimentCheck(sliderValue, polyvagalStateCode, journalEntry = null, flowType = 'daily_flow', tags = null) {
    try {
      // For daily flows, save to session (will upload when flow completes)
      if (flowType === 'daily_flow') {
        return await this.saveCheckToSession(sliderValue, polyvagalStateCode, journalEntry, tags)
      }

      // For quick routines, use old behavior
      const chainId = await this.getOrCreateActiveChain(flowType)

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
      const result = await api.deleteChain(chainId)
      return result
    } catch (error) {
      console.error('Error deleting chain:', error)
      throw error
    }
  },
}
