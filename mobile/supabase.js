import { createClient } from '@supabase/supabase-js'
import AsyncStorage from '@react-native-async-storage/async-storage'

// TODO: Replace these with your actual values from Supabase Dashboard
// Project Settings → API
const supabaseUrl = 'https://qujifwhwntqxziymqdwu.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF1amlmd2h3bnRxeHppeW1xZHd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3MDA5MzcsImV4cCI6MjA3NzI3NjkzN30.-zi38lElFSGhPs7TzVYqYhYFuM8t0eGgrbAsLce5zF0' // Long string starting with eyJ...

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Active SoMi Chain management
const ACTIVE_CHAIN_KEY = 'active_somi_chain_id'

export const somiChainService = {
  // Create a new SoMi Chain
  async createChain() {
    try {
      const { data, error } = await supabase
        .from('somi_chains')
        .insert({})
        .select()
        .single()

      if (error) {
        console.error('Error creating SoMi Chain:', error)
        return null
      }

      // Store as active chain
      await AsyncStorage.setItem(ACTIVE_CHAIN_KEY, String(data.id))
      return data.id
    } catch (err) {
      console.error('Unexpected error creating chain:', err)
      return null
    }
  },

  // Get or create active chain
  async getOrCreateActiveChain() {
    try {
      // Check if there's an active chain in storage
      const storedChainId = await AsyncStorage.getItem(ACTIVE_CHAIN_KEY)

      if (storedChainId) {
        const chainId = parseInt(storedChainId, 10)

        // Verify the chain still exists in the database
        const { data, error } = await supabase
          .from('somi_chains')
          .select('id')
          .eq('id', chainId)
          .single()

        if (!error && data) {
          // Chain exists, use it
          return chainId
        }

        // Chain no longer exists - clear the invalid stored ID and create a new one
        console.log(`Stored chain ${chainId} no longer exists, creating new chain`)
        await AsyncStorage.removeItem(ACTIVE_CHAIN_KEY)
      }

      // No active chain or invalid chain - create one
      return await this.createChain()
    } catch (err) {
      console.error('Error getting active chain:', err)
      return await this.createChain()
    }
  },

  // End the current chain (when user exits flow)
  async endActiveChain() {
    try {
      await AsyncStorage.removeItem(ACTIVE_CHAIN_KEY)
    } catch (err) {
      console.error('Error ending active chain:', err)
    }
  },

  // Create a NEW chain (always creates, never reuses)
  async createNewChain() {
    try {
      // End any existing active chain first
      await this.endActiveChain()
      // Create new chain
      return await this.createChain()
    } catch (err) {
      console.error('Error creating new chain:', err)
      return null
    }
  },

  // Save embodiment check to chain
  async saveEmbodimentCheck(sliderValue, polyvagalStateCode, journalEntry = null) {
    try {
      const chainId = await this.createNewChain()

      const { data, error} = await supabase
        .from('embodiment_checks')
        .insert({
          embodiment_level: Math.round(sliderValue),
          polyvagal_state_code: polyvagalStateCode,
          somi_chain_id: chainId,
          journal_entry: journalEntry,
        })
        .select()
        .single()

      if (error) {
        console.error('Error saving embodiment check:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Unexpected error saving embodiment check:', err)
      return null
    }
  },

  // Save completed SoMi block
  // chainId is optional - if not provided, block is saved without chain association (à la carte viewing)
  async saveCompletedBlock(somiBlockId, secondsElapsed, orderIndex = 0, chainId = null) {
    try {
      const blockData = {
        somi_block_id: somiBlockId,
        seconds_elapsed: secondsElapsed,
        order_index: orderIndex,
      }

      // Only include chain_id if explicitly provided
      if (chainId !== null) {
        blockData.somi_chain_id = chainId
      }

      const { data, error } = await supabase
        .from('somi_chain_entries')
        .insert(blockData)
        .select()
        .single()

      if (error) {
        console.error('Error saving completed block:', error)
        return null
      }

      return data
    } catch (err) {
      console.error('Unexpected error saving completed block:', err)
      return null
    }
  },

  // Fetch all chains with their embodiment checks and completed blocks
  async fetchChainsWithData(limit = 30) {
    try {
      const { data: chains, error: chainsError } = await supabase
        .from('somi_chains')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit)

      if (chainsError) {
        console.error('Error fetching chains:', chainsError)
        return []
      }

      // Fetch embodiment checks for all chains
      const chainIds = chains.map(c => c.id)

      const { data: checks, error: checksError } = await supabase
        .from('embodiment_checks')
        .select('*')
        .in('somi_chain_id', chainIds)
        .order('created_at', { ascending: true })

      if (checksError) {
        console.error('Error fetching embodiment checks:', checksError)
      }

      // Fetch completed blocks for all chains
      const { data: blocks, error: blocksError } = await supabase
        .from('somi_chain_entries')
        .select(`
          *,
          somi_blocks (
            id,
            name,
            canonical_name,
            block_type,
            media_type,
            description,
            state_target,
            intensity,
            media_url,
            thumbnail_url
          )
        `)
        .in('somi_chain_id', chainIds)
        .order('order_index', { ascending: true })

      if (blocksError) {
        console.error('Error fetching completed blocks:', blocksError)
      }

      // Group data by chain
      const chainsWithData = chains.map(chain => ({
        ...chain,
        embodiment_checks: (checks || []).filter(c => c.somi_chain_id === chain.id),
        somi_chain_entries: (blocks || []).filter(b => b.somi_chain_id === chain.id),
      }))

      return chainsWithData
    } catch (err) {
      console.error('Unexpected error fetching chains:', err)
      return []
    }
  },

  // Delete a SoMi Chain (for MVP debugging)
  // This will cascade delete embodiment_checks and somi_chain_entries
  // but NOT somi_blocks (those are canonical references)
  async deleteChain(chainId) {
    try {
      // Delete embodiment checks first
      const { error: checksError } = await supabase
        .from('embodiment_checks')
        .delete()
        .eq('somi_chain_id', chainId)

      if (checksError) {
        console.error('Error deleting embodiment checks:', checksError)
        return false
      }

      // Delete completed blocks
      const { error: blocksError } = await supabase
        .from('somi_chain_entries')
        .delete()
        .eq('somi_chain_id', chainId)

      if (blocksError) {
        console.error('Error deleting completed blocks:', blocksError)
        return false
      }

      // Finally delete the chain itself
      const { error: chainError } = await supabase
        .from('somi_chains')
        .delete()
        .eq('id', chainId)

      if (chainError) {
        console.error('Error deleting chain:', chainError)
        return false
      }

      console.log(`Successfully deleted chain ${chainId}`)
      return true
    } catch (err) {
      console.error('Unexpected error deleting chain:', err)
      return false
    }
  },

  // Get most played/watched blocks across all users
  async getMostPlayedBlocks(limit = 10) {
    try {
      const { data, error } = await supabase
        .from('somi_chain_entries')
        .select(`
          somi_block_id,
          somi_blocks (
            id,
            name,
            canonical_name,
            block_type,
            media_type,
            description,
            state_target,
            intensity,
            thumbnail_url,
            media_url
          )
        `)

      if (error) {
        console.error('Error fetching most played blocks:', error)
        return []
      }

      // Count frequency of each block
      const blockCounts = {}
      data.forEach(item => {
        const blockId = item.somi_block_id
        if (!blockCounts[blockId]) {
          blockCounts[blockId] = {
            count: 0,
            block: item.somi_blocks
          }
        }
        blockCounts[blockId].count++
      })

      // Sort by count and return top N
      const sorted = Object.values(blockCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(item => ({
          ...item.block,
          play_count: item.count
        }))

      return sorted
    } catch (err) {
      console.error('Unexpected error fetching most played blocks:', err)
      return []
    }
  },

  // Get the latest SoMi chain with embodiment checks and entries
  async getLatestChain() {
    try {
      // Get the most recent chain
      const { data: chains, error: chainError } = await supabase
        .from('somi_chains')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)

      if (chainError) {
        console.error('Error fetching latest chain:', chainError)
        return null
      }

      // If no chains exist yet, return null
      if (!chains || chains.length === 0) {
        return null
      }

      const chain = chains[0]

      // Get embodiment checks for this chain
      const { data: checks, error: checksError } = await supabase
        .from('embodiment_checks')
        .select('*')
        .eq('somi_chain_id', chain.id)
        .order('created_at', { ascending: true })

      if (checksError) {
        console.error('Error fetching embodiment checks:', checksError)
        return { ...chain, embodiment_checks: [], somi_chain_entries: [] }
      }

      // Get chain entries for this chain to calculate total minutes
      const { data: entries, error: entriesError } = await supabase
        .from('somi_chain_entries')
        .select('seconds_elapsed')
        .eq('somi_chain_id', chain.id)

      if (entriesError) {
        console.error('Error fetching chain entries:', entriesError)
        return { ...chain, embodiment_checks: checks || [], somi_chain_entries: [] }
      }

      return { ...chain, embodiment_checks: checks || [], somi_chain_entries: entries || [] }
    } catch (err) {
      console.error('Unexpected error fetching latest chain:', err)
      return null
    }
  },
}
