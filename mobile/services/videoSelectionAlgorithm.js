// ============================================================================
// VIDEO SELECTION ALGORITHM
// ============================================================================
//
// Selects the next video based on the user's current polyvagal state and the
// block's energy_delta / safety_delta values.
//
// State model (2D energy × safety):
//   shutdown  — low energy, low safety   → want blocks that raise both
//   restful   — low energy, safe          → want blocks that raise energy
//   wired     — high energy, low safety   → want blocks that raise safety / lower energy
//   glowing   — high energy, safe         → any block that maintains safety
//   steady    — centre                    → any block
//

// Select video for routine (with repeat avoidance), avoiding immediate repeat of previousBlockId
//
// Inputs:
//   - availableBlocks: all active video blocks from database
//   - polyvagalState: 'shutdown' | 'restful' | 'wired' | 'glowing' | 'steady'
//   - previousBlockId: ID of the last played video to avoid immediate repeats
//
// Returns: selected video block with media_url, id, name, etc.
//
export function selectRoutineVideo(availableBlocks, polyvagalState, previousBlockId = null) {
  if (!availableBlocks || availableBlocks.length === 0) {
    console.warn('No video blocks available for routine selection')
    return null
  }

  let candidateBlocks = availableBlocks
  if (previousBlockId) {
    candidateBlocks = availableBlocks.filter(block => block.id !== previousBlockId)
    if (candidateBlocks.length === 0) candidateBlocks = availableBlocks
  }

  const matchingBlocks = filterBlocksForState(candidateBlocks, polyvagalState)
  const pool = matchingBlocks.length > 0 ? matchingBlocks : candidateBlocks

  const randomIndex = Math.floor(Math.random() * pool.length)
  const selectedBlock = pool[randomIndex]

  console.log(
    `Routine video selected: "${selectedBlock.name}" ` +
    `(state: ${polyvagalState}, ${pool.length} options, avoided: ${previousBlockId || 'none'})`
  )

  return selectedBlock
}

// ============================================================================
// PRIVATE HELPERS
// ============================================================================

// Returns blocks whose energy/safety deltas are therapeutic for the given state.
// Falls back to all blocks if nothing matches.
function filterBlocksForState(blocks, polyvagalState) {
  switch (polyvagalState) {
    case 'shutdown':
      // Need to raise both energy and safety — prefer blocks with positive deltas on both axes
      return blocks.filter(b => (b.energy_delta ?? 0) >= 0 && (b.safety_delta ?? 0) >= 0)

    case 'restful':
      // Already safe, need more energy
      return blocks.filter(b => (b.energy_delta ?? 0) > 0)

    case 'wired':
      // Over-activated — need to raise safety (grounding) and/or lower energy
      return blocks.filter(b => (b.safety_delta ?? 0) > 0)

    case 'glowing':
      // Great state — prefer blocks that don't destabilise safety
      return blocks.filter(b => (b.safety_delta ?? 0) >= 0)

    case 'steady':
    default:
      return blocks
  }
}

// ============================================================================
// FUTURE ALGORITHM IDEAS (not yet implemented)
// ============================================================================
//
// 1. AVOID RECENT VIDEOS
//    - Track recently played videos in session
//    - Prefer videos user hasn't seen in last N plays
//
// 2. SLIDER-AWARE SELECTION
//    - Use sliderValue to weight delta magnitude (e.g. higher intensity → larger deltas)
//
// 3. STATE TRANSITION TARGETING
//    - shutdown → prefer blocks with highest combined energy_delta + safety_delta
//    - wired    → prefer blocks with highest safety_delta - energy_delta ratio
//
