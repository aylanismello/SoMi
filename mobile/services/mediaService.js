import { supabase } from '../supabase'
import { getRoutineConfig } from './routineConfig'

// Cache for video blocks to avoid redundant fetches
let videoBlocksCache = null
let lastFetchTime = null
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes

// Background video for audio playback
export const BACKGROUND_VIDEO = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/mountains_boomerang.mp4',
  type: 'video',
}

// Fetch all video blocks from somi_blocks table
async function fetchVideoBlocks() {
  // Return cached data if fresh
  if (videoBlocksCache && lastFetchTime && (Date.now() - lastFetchTime) < CACHE_DURATION) {
    return videoBlocksCache
  }

  try {
    const { data, error } = await supabase
      .from('somi_blocks')
      .select('*')
      .eq('media_type', 'video')
      .eq('active', true)
      .not('media_url', 'is', null)
      .neq('block_type', 'timer') // Exclude timer blocks

    if (error) {
      console.error('Error fetching video blocks:', error)
      console.error('Supabase error details:', JSON.stringify(error))
      return []
    }

    console.log(`Fetched ${data?.length || 0} video blocks from Supabase`)

    // Update cache
    videoBlocksCache = data || []
    lastFetchTime = Date.now()

    return videoBlocksCache
  } catch (err) {
    console.error('Unexpected error fetching video blocks:', err)
    return []
  }
}

// Convert a block from database format to media player format
function blockToMedia(block) {
  if (!block) {
    console.error('No block provided, using fallback')
    return {
      url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4',
      type: 'video',
      somi_block_id: 1,
      canonical_name: 'fallback',
      name: 'Fallback Video',
    }
  }

  return {
    url: block.media_url,
    type: 'video',
    somi_block_id: block.id,
    canonical_name: block.canonical_name,
    name: block.name,
  }
}

// Prefetch video blocks on app startup (optional, for better UX)
export async function prefetchVideoBlocks() {
  await fetchVideoBlocks()
}

/**
 * Get blocks for a specific routine type and block count
 *
 * @param {number} blockCount - Number of blocks (2, 6, or 10)
 * @param {string} routineType - Routine type ('morning' or 'night')
 * @returns {Array} Array of media objects ready for the player
 */
export async function getBlocksForRoutine(blockCount, routineType) {
  // Get all blocks from database
  const allBlocks = await fetchVideoBlocks()

  // Get the canonical names for this routine type and block count
  const canonicalNames = getRoutineConfig(routineType, blockCount)

  if (!canonicalNames || canonicalNames.length === 0) {
    console.error(`No blocks configured for ${routineType} routine with ${blockCount} blocks`)
    return []
  }

  console.log(`Building queue for ${routineType} routine with ${blockCount} blocks:`, canonicalNames)

  // Filter and order blocks based on the algorithm's canonical names
  const selectedBlocks = canonicalNames
    .map(canonicalName => {
      const block = allBlocks.find(b => b.canonical_name === canonicalName)
      if (!block) {
        console.warn(`❌ Block not found for canonical_name: ${canonicalName}`)
      } else {
        console.log(`✓ Found block: ${block.name} (${canonicalName})`)
      }
      return block
    })
    .filter(block => block !== undefined) // Remove any missing blocks
    .map(block => blockToMedia(block)) // Convert to media format

  console.log(`Selected ${selectedBlocks.length} blocks for routine (requested ${blockCount})`)
  console.log('Final queue:', selectedBlocks.map(b => b.name))
  return selectedBlocks
}
