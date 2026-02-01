import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, somiChainService } from '../supabase'

/**
 * React Query hooks for server state management
 * Handles all Supabase data fetching and mutations with automatic caching and revalidation
 */

// Query Keys
export const QUERY_KEYS = {
  blocks: (canonicalNames) => ['blocks', ...(canonicalNames || [])],
  chains: ['chains'],
  latestChain: ['latestChain'],
}

/**
 * Fetch blocks by canonical names
 * @param {string[]} canonicalNames - Array of canonical names to fetch
 * @returns {UseQueryResult} Query result with blocks data
 */
export function useBlocks(canonicalNames) {
  return useQuery({
    queryKey: QUERY_KEYS.blocks(canonicalNames),
    queryFn: async () => {
      if (!canonicalNames || canonicalNames.length === 0) {
        return []
      }

      const { data, error } = await supabase
        .from('somi_blocks')
        .select('id, canonical_name, name, description, state_target, media_url')
        .in('canonical_name', canonicalNames)

      if (error) {
        throw new Error(error.message)
      }

      // Sort blocks to match canonical names order
      const sortedBlocks = canonicalNames.map(canonicalName =>
        data.find(block => block.canonical_name === canonicalName)
      ).filter(Boolean)

      return sortedBlocks
    },
    enabled: !!canonicalNames && canonicalNames.length > 0,
    staleTime: 10 * 60 * 1000, // 10 minutes - blocks don't change often
  })
}

/**
 * Fetch user's SoMi chains/history
 * @param {number} limit - Maximum number of chains to fetch
 * @returns {UseQueryResult} Query result with chains data
 */
export function useChains(limit = 30) {
  return useQuery({
    queryKey: QUERY_KEYS.chains,
    queryFn: async () => {
      return await somiChainService.fetchChainsWithData(limit)
    },
    staleTime: 1 * 60 * 1000, // 1 minute - refresh more frequently for user data
  })
}

/**
 * Fetch the latest chain with checks and entries
 * @returns {UseQueryResult} Query result with latest chain data
 */
export function useLatestChain() {
  return useQuery({
    queryKey: QUERY_KEYS.latestChain,
    queryFn: async () => {
      return await somiChainService.getLatestChain()
    },
    staleTime: 30 * 1000, // 30 seconds - fresh data for home screen
  })
}

/**
 * Mutation for saving embodiment checks
 * @returns {UseMutationResult} Mutation result
 */
export function useSaveEmbodimentCheck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sliderValue, polyvagalStateCode, journalEntry = null }) => {
      return await somiChainService.saveEmbodimentCheck(
        sliderValue,
        polyvagalStateCode,
        journalEntry
      )
    },
    onSuccess: () => {
      // Invalidate and refetch chains to show the new check
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chains })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestChain })
    },
  })
}

/**
 * Mutation for saving chain entries (completed blocks)
 * @returns {UseMutationResult} Mutation result
 */
export function useSaveChainEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ somiBlockId, secondsElapsed, orderIndex = 0, chainId = null }) => {
      return await somiChainService.saveCompletedBlock(
        somiBlockId,
        secondsElapsed,
        orderIndex,
        chainId
      )
    },
    onSuccess: () => {
      // Invalidate and refetch chains to show the new entry
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chains })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestChain })
    },
  })
}

/**
 * Mutation for deleting a chain
 * @returns {UseMutationResult} Mutation result
 */
export function useDeleteChain() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (chainId) => {
      return await somiChainService.deleteChain(chainId)
    },
    onSuccess: () => {
      // Invalidate and refetch chains after deletion
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chains })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestChain })
    },
  })
}
