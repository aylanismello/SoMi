import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../services/api'
import { chainService } from '../services/chainService'
import { useRoutineStore } from '../stores/routineStore'

/**
 * React Query hooks for server state management
 * Handles all Supabase data fetching and mutations with automatic caching and revalidation
 */

// Query Keys
export const QUERY_KEYS = {
  blocks: (canonicalNames) => ['blocks', ...(canonicalNames || [])],
  chains: ['chains'],
  latestChain: ['latestChain'],
  latestDailyFlow: ['latestChain', 'daily_flow'],
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

      const { blocks } = await api.getBlocks(canonicalNames)

      // Sort blocks to match canonical names order
      const sortedBlocks = canonicalNames.map(canonicalName =>
        blocks.find(block => block.canonical_name === canonicalName)
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
      const { chains } = await api.getChains(limit)
      return chains
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
      const { chain } = await api.getLatestChain()
      return chain
    },
    staleTime: 30 * 1000, // 30 seconds - fresh data for home screen
  })
}

/**
 * Fetch the latest daily flow chain with checks and entries
 * Only returns chains where flow_type = 'daily_flow'
 * @returns {UseQueryResult} Query result with latest daily flow chain data
 */
export function useLatestDailyFlow() {
  return useQuery({
    queryKey: QUERY_KEYS.latestDailyFlow,
    queryFn: async () => {
      const { chain } = await api.getLatestChain('daily_flow')
      return chain
    },
    staleTime: 30 * 1000, // 30 seconds - fresh data for completion checks
  })
}

/**
 * Mutation for saving embodiment checks
 * @returns {UseMutationResult} Mutation result
 */
export function useSaveEmbodimentCheck() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ sliderValue, polyvagalStateCode, journalEntry = null, flowType = null }) => {
      // Get flowType from routine store if not provided
      const finalFlowType = flowType || useRoutineStore.getState().flowType
      return await chainService.saveEmbodimentCheck(
        sliderValue,
        polyvagalStateCode,
        journalEntry,
        finalFlowType
      )
    },
    onSuccess: (data, variables) => {
      // Only invalidate queries for quick routines (daily flows save to session, not DB)
      const finalFlowType = variables.flowType || useRoutineStore.getState().flowType
      if (finalFlowType !== 'daily_flow') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chains })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestChain })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestDailyFlow })
      }
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
    mutationFn: async ({ somiBlockId, secondsElapsed, orderIndex = 0, chainId = null, flowType = null }) => {
      // Get flowType from routine store if not provided
      const finalFlowType = flowType || useRoutineStore.getState().flowType
      return await chainService.saveCompletedBlock(
        somiBlockId,
        secondsElapsed,
        orderIndex,
        chainId,
        finalFlowType
      )
    },
    onSuccess: (data, variables) => {
      // Only invalidate queries for quick routines (daily flows save to session, not DB)
      const finalFlowType = variables.flowType || useRoutineStore.getState().flowType
      if (finalFlowType !== 'daily_flow') {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chains })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestChain })
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestDailyFlow })
      }
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
      return await chainService.deleteChain(chainId)
    },
    onSuccess: () => {
      // Invalidate and refetch chains after deletion
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.chains })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestChain })
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.latestDailyFlow })
    },
  })
}
