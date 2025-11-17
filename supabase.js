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
        return parseInt(storedChainId, 10)
      }

      // No active chain - create one
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

  // Save embodiment check to chain
  async saveEmbodimentCheck(sliderValue, polyvagalState) {
    try {
      const chainId = await this.getOrCreateActiveChain()

      const { data, error } = await supabase
        .from('embodiment_checks')
        .insert({
          slider_value: Math.round(sliderValue),
          polyvagal_state: polyvagalState,
          somi_chain_id: chainId,
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

  // Save completed SoMi block to chain
  async saveCompletedBlock(somiBlockId, secondsElapsed, orderIndex = 0) {
    try {
      const chainId = await this.getOrCreateActiveChain()

      const { data, error } = await supabase
        .from('completed_somi_blocks')
        .insert({
          somi_block_id: somiBlockId,
          somi_chain_id: chainId,
          seconds_elapsed: secondsElapsed,
          order_index: orderIndex,
        })
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
        .from('completed_somi_blocks')
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
            intensity
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
        completed_blocks: (blocks || []).filter(b => b.somi_chain_id === chain.id),
      }))

      return chainsWithData
    } catch (err) {
      console.error('Unexpected error fetching chains:', err)
      return []
    }
  },
}
