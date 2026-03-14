import AsyncStorage from '@react-native-async-storage/async-storage'
import { api } from './api'
import type { SessionCheck, SessionBlock, SessionData, FlowType, SomiChain, ChainEntry, EmbodimentCheck } from '../types'

const ACTIVE_CHAIN_KEY = 'active_somi_chain_id'
const SESSION_CHECKS_KEY = 'session_embodiment_checks'
const SESSION_BLOCKS_KEY = 'session_completed_blocks'
const SESSION_EXTRA_SECONDS_KEY = 'session_extra_play_seconds'

export const chainService = {
  async saveCheckToSession(energyLevel: number, safetyLevel: number, journalEntry: string | null = null, tags: string[] | null = null) {
    try {
      const existing = await AsyncStorage.getItem(SESSION_CHECKS_KEY)
      const checks = existing ? JSON.parse(existing) : []

      checks.push({
        energyLevel,
        safetyLevel,
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

  async saveBlockToSession(somiBlockId: number, secondsElapsed: number, orderIndex = 0, section: string | null = null) {
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

  async getSessionData(): Promise<SessionData> {
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

  async addExtraPlaySeconds(seconds: number) {
    try {
      const existing = await AsyncStorage.getItem(SESSION_EXTRA_SECONDS_KEY)
      const current = existing ? parseInt(existing, 10) : 0
      await AsyncStorage.setItem(SESSION_EXTRA_SECONDS_KEY, String(current + seconds))
    } catch (error) {
      console.error('Error adding extra play seconds:', error)
    }
  },

  async getExtraPlaySeconds(): Promise<number> {
    try {
      const existing = await AsyncStorage.getItem(SESSION_EXTRA_SECONDS_KEY)
      return existing ? parseInt(existing, 10) : 0
    } catch (error) {
      console.error('Error getting extra play seconds:', error)
      return 0
    }
  },

  async logPlayTime(label: string) {
    try {
      const { blocks } = await this.getSessionData()
      const extra = await this.getExtraPlaySeconds()
      const blockSecs = blocks.reduce((sum, b) => sum + (b.secondsElapsed || 0), 0)
      const total = blockSecs + extra
      console.log(
        `\n⏱️  [PLAY TIME] ${label}\n` +
        `   blocks (${blocks.length}): ${blockSecs}s\n` +
        `   interstitials:  ${extra}s\n` +
        `   ─────────────────────\n` +
        `   TOTAL SO FAR:   ${total}s  (need ${Math.max(0, 300 - total)}s more for streak)\n`
      )
    } catch (e) {
      console.error('logPlayTime error:', e)
    }
  },

  async clearSessionData() {
    try {
      await AsyncStorage.removeItem(SESSION_CHECKS_KEY)
      await AsyncStorage.removeItem(SESSION_BLOCKS_KEY)
      await AsyncStorage.removeItem(SESSION_EXTRA_SECONDS_KEY)
      console.log('🧹 Cleared session data')
    } catch (error) {
      console.error('Error clearing session data:', error)
    }
  },

  // Create chain and upload all session data (called only when flow is complete)
  async createChainFromSession(flowType: FlowType = 'daily_flow'): Promise<number | null> {
    try {
      console.log('🎉 Creating chain from session data...')

      // Get all session data
      const { checks, blocks } = await this.getSessionData()
      const extraPlaySeconds = await this.getExtraPlaySeconds()

      if (checks.length === 0) {
        console.error('❌ No checks in session, cannot create chain')
        return null
      }

      // Compute total actual play time: somi blocks + body scans + interstitials
      const blockPlaySeconds = blocks.reduce((sum, b) => sum + (b.secondsElapsed || 0), 0)
      const totalPlaySeconds = blockPlaySeconds + extraPlaySeconds
      console.log(`⏱️ Total play time: ${totalPlaySeconds}s (blocks: ${blockPlaySeconds}s, interstitials: ${extraPlaySeconds}s)`)

      // Create the chain with duration_seconds baked in from the start
      const { chain } = await api.createChain(flowType, totalPlaySeconds)
      const chainId = chain!.id
      console.log(`✅ Created chain ${chainId} with duration_seconds=${totalPlaySeconds}s`)

      // Upload checks and blocks concurrently:
      // - checks via individual calls (typically only 2, can't batch differently)
      // - blocks via a single batch request instead of N sequential calls
      await Promise.all([
        // Parallelize all embodiment checks
        ...checks.map(check =>
          api.saveEmbodimentCheck(
            chainId,
            check.energyLevel,
            check.safetyLevel,
            check.journalEntry,
            check.tags || null
          )
        ),
        // All blocks in one batch call
        blocks.length > 0
          ? api.saveChainEntries(chainId, blocks.map(b => ({
              blockId: b.somiBlockId,
              secondsElapsed: b.secondsElapsed,
              sessionOrder: b.orderIndex,
              section: b.section || null,
            })))
          : Promise.resolve(),
      ])

      console.log(`🎊 Chain ${chainId} saved: ${checks.length} checks + ${blocks.length} blocks`)

      // Clear session data
      await this.clearSessionData()

      return chainId

    } catch (error) {
      console.error('Error creating chain from session:', error)
      return null
    }
  },

  // Get or create active chain (legacy - only used for quick routines now)
  async getOrCreateActiveChain(flowType: FlowType = 'daily_flow'): Promise<number | null> {
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
          await AsyncStorage.setItem(ACTIVE_CHAIN_KEY, String(chain!.id))
          return chain!.id
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
    return null
  },

  // Save completed block - now saves to session for daily flows
  async saveCompletedBlock(somiBlockId: number, secondsElapsed: number, orderIndex = 0, chainId: number | null = null, flowType: FlowType = 'daily_flow', section: string | null = null) {
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

      const result = await api.saveChainEntry(
        activeChainId,
        somiBlockId,
        secondsElapsed,
        orderIndex
      ) as { entry: ChainEntry }

      return result.entry
    } catch (error) {
      console.error('Error saving completed block:', error)
      return null
    }
  },

  // Save embodiment check - now saves to session for daily flows
  async saveEmbodimentCheck(energyLevel: number, safetyLevel: number, journalEntry: string | null = null, flowType: FlowType = 'daily_flow', tags: string[] | null = null) {
    try {
      // For daily flows, save to session (will upload when flow completes)
      if (flowType === 'daily_flow') {
        return await this.saveCheckToSession(energyLevel, safetyLevel, journalEntry, tags)
      }

      // For quick routines, use old behavior
      const chainId = await this.getOrCreateActiveChain(flowType)

      if (!chainId) {
        console.error('No active chain available')
        return null
      }

      const result = await api.saveEmbodimentCheck(
        chainId,
        energyLevel,
        safetyLevel,
        journalEntry
      ) as { check: EmbodimentCheck }

      return result.check
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
  async fetchChainsWithData(limit = 30): Promise<SomiChain[]> {
    try {
      const { chains } = await api.getChains(limit)
      return chains
    } catch (error) {
      console.error('Error fetching chains:', error)
      return []
    }
  },

  // Delete chain
  async deleteChain(chainId: number) {
    try {
      const result = await api.deleteChain(chainId)
      return result
    } catch (error) {
      console.error('Error deleting chain:', error)
      throw error
    }
  },
}
