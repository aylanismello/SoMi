import { supabase } from '../supabase'

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

// Get a random video from the available blocks
function getRandomVideo(blocks) {
  if (!blocks || blocks.length === 0) {
    console.error('No video blocks available!')
    // Return a fallback with proper structure
    return {
      url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4',
      type: 'video',
      somi_block_id: 1,
      canonical_name: 'fallback',
      name: 'Fallback Video',
    }
  }

  const randomIndex = Math.floor(Math.random() * blocks.length)
  const block = blocks[randomIndex]

  return {
    url: block.media_url,
    type: 'video',
    somi_block_id: block.id,
    canonical_name: block.canonical_name,
    name: block.name,
  }
}

// Get the SOS video (vagus_reset_lying_down)
async function getSOSVideo() {
  const blocks = await fetchVideoBlocks()
  const sosBlock = blocks.find(b => b.canonical_name === 'vagus_reset_lying_down')

  if (!sosBlock) {
    console.error('SOS video (vagus_reset_lying_down) not found!')
    // Fallback to any random video if SOS not found
    return getRandomVideo(blocks)
  }

  return {
    url: sosBlock.media_url,
    type: 'video',
    somi_block_id: sosBlock.id,
    canonical_name: sosBlock.canonical_name,
    name: sosBlock.name,
  }
}

// Get media for a given slider value (now returns a random video)
// sliderValue parameter kept for backwards compatibility but not used
export async function getMediaForSliderValue() {
  const blocks = await fetchVideoBlocks()
  const media = getRandomVideo(blocks)

  // Ensure we always return a valid media object with type
  if (!media || !media.type) {
    console.error('Invalid media object returned, using fallback')
    return {
      url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4',
      type: 'video',
      somi_block_id: 1,
      canonical_name: 'fallback',
      name: 'Fallback Video',
    }
  }

  return media
}

// Get SOS media (always vagus_reset_lying_down)
export async function getSOSMedia() {
  const media = await getSOSVideo()

  // Ensure we always return a valid media object with type
  if (!media || !media.type) {
    console.error('Invalid SOS media object returned, using fallback')
    return {
      url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4',
      type: 'video',
      somi_block_id: 16, // vagus_reset_lying_down id from screenshot
      canonical_name: 'vagus_reset_lying_down',
      name: 'Vagus Reset (Lying Down)',
    }
  }

  return media
}

// Body scan audio
// TODO: HARDCODED BULLSHIT - This should come from somi_blocks table
// Currently hardcoded because body scan is audio and we're only fetching videos
export const BODY_SCAN_MEDIA = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/5%20Min.%20Body%20Scan%20Meditation_CW2%201.mp3',
  type: 'audio',
  somi_block_id: null, // Body scans don't create completed blocks
}

// Prefetch video blocks on app startup (optional, for better UX)
export async function prefetchVideoBlocks() {
  await fetchVideoBlocks()
}
