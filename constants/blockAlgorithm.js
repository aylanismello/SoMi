// Block Selection Algorithm
// Maps the number of blocks to specific canonical_names from somi_blocks table
// Edit this file to change which blocks appear for each time selection

export const BLOCK_SELECTION_MAP = {
  // 5 minutes = 2 blocks
  2: [
    'vagus_reset',
    'self_havening',
  ],

  // 10 minutes = 6 blocks
  6: [
    'vagus_reset',
    'heart_opener',
    'self_havening',
    'brain_hold',
    'freeze_roll',
    'arm_shoulder_hand_circles',
  ],

  // 15 minutes = 10 blocks
  10: [
    'vagus_reset',
    'self_havening',
    'heart_opener',
    'body_tapping',
    'freeze_roll',
    'arm_shoulder_hand_circles',
    'squeeze_hands_release',
    'ear_stretch',
    'shaking',
    'upward_gaze',
  ],
}

// Helper function to get blocks for a given count
export const getBlocksForCount = (blockCount) => {
  return BLOCK_SELECTION_MAP[blockCount] || []
}

// Time to block count mapping (for reference)
export const TIME_TO_BLOCK_COUNT = {
  5: 2,   // 5 minutes
  10: 6,  // 10 minutes
  15: 10, // 15 minutes
}
