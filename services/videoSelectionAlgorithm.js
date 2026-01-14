// ============================================================================
// VIDEO SELECTION ALGORITHM
// ============================================================================
//
// This file contains the core algorithm for selecting the next video
// based on the user's current polyvagal state and embodiment score.
//
// Tweak this logic to change how videos are recommended.
//

// Select the next video based on user's current state
//
// Inputs:
//   - availableBlocks: all active video blocks from database
//   - polyvagalState: 'withdrawn', 'stirring', 'activated', 'settling', 'connected'
//   - sliderValue: embodiment score 0-100 (not used yet, but available for future logic)
//
// Returns: selected video block with media_url, id, name, etc.
//
export function selectNextVideo(availableBlocks, polyvagalState, sliderValue) {
  // Safety check: if no blocks available, return null
  if (!availableBlocks || availableBlocks.length === 0) {
    console.warn('No video blocks available for selection')
    return null
  }

  // ============================================================================
  // ALGORITHM V1: EXACT STATE MATCHING WITH RANDOM FALLBACK
  // ============================================================================
  //
  // Strategy:
  // 1. Try to find videos that match the user's current polyvagal state
  // 2. If matches found, pick one randomly
  // 3. If no matches, fall back to any random video
  //
  // Future improvements could include:
  // - Weighted selection based on intensity levels
  // - Prefer videos user hasn't seen recently
  // - Consider routine_role (warmup, main, cooldown)
  // - Use slider value to fine-tune selection
  // ============================================================================

  // Filter blocks that match the current state
  const matchingBlocks = availableBlocks.filter(
    block => block.state_target === polyvagalState
  )

  // If we found matching videos, pick one randomly
  if (matchingBlocks.length > 0) {
    const randomIndex = Math.floor(Math.random() * matchingBlocks.length)
    const selectedBlock = matchingBlocks[randomIndex]

    console.log(
      `Selected video: "${selectedBlock.name}" ` +
      `(state match: ${polyvagalState}, ` +
      `${matchingBlocks.length} options available)`
    )

    return selectedBlock
  }

  // Fallback: No state matches found, pick any random video
  console.log(
    `No videos found for state "${polyvagalState}", ` +
    `selecting random from ${availableBlocks.length} videos`
  )

  const randomIndex = Math.floor(Math.random() * availableBlocks.length)
  return availableBlocks[randomIndex]
}

// Select the SOS video (emergency intervention)
//
// Always returns the vagus reset video for emergency calming.
//
export function selectSOSVideo(availableBlocks) {
  const sosBlock = availableBlocks.find(
    block => block.canonical_name === 'vagus_reset_lying_down'
  )

  if (!sosBlock) {
    console.error('SOS video (vagus_reset_lying_down) not found in database!')
    // Return first available video as emergency fallback
    return availableBlocks[0] || null
  }

  return sosBlock
}

// ============================================================================
// FUTURE ALGORITHM IDEAS (not yet implemented)
// ============================================================================
//
// 1. PROGRESSIVE INTENSITY
//    - Start with low intensity videos
//    - Gradually increase based on user progress
//
// 2. AVOID RECENT VIDEOS
//    - Track recently played videos in session
//    - Prefer videos user hasn't seen in last N plays
//
// 3. ROUTINE SEQUENCING
//    - Use routine_role field (warmup → main → cooldown)
//    - Create intelligent exercise sequences
//
// 4. SLIDER-AWARE SELECTION
//    - Lower slider values → more gentle/grounding exercises
//    - Higher slider values → more energizing exercises
//
// 5. STATE TRANSITION TARGETING
//    - If withdrawn → show videos targeting stirring (move up one level)
//    - If activated → show videos targeting settling (move down)
//    - Guide users toward 'connected' state
//
