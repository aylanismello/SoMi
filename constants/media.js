// Media source configuration
const VIDEO_SOURCE = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4',
  type: 'video',
  somi_block_id: 1, // Default to "Heart Opener" - you can customize this per state
}

const BODY_SCAN = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/5%20Min.%20Body%20Scan%20Meditation_CW2%201.mp3',
  type: 'audio',
  somi_block_id: null, // Body scans don't create completed blocks
}

// Background video for audio playback and toggle option
export const BACKGROUND_VIDEO = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/mountains_boomerang.mp4',
  type: 'video',
}


// Media mappings for polyvagal slider states
export const MEDIA = {
  // 0-20: Dorsal Vagal - Shutdown (withdrawn state)
  DORSAL: {
    ...BODY_SCAN,
    somi_block_id: 2, // Self Havening
  },

  // 20-40: Dorsal → Sympathetic transition (stirring state)
  DORSAL_TO_SYMPATHETIC: {
    ...VIDEO_SOURCE,
    somi_block_id: 7, // Freeze Roll
  },

  // 40-60: Sympathetic - Fight/Flight (activated state)
  SYMPATHETIC: {
    ...VIDEO_SOURCE,
    somi_block_id: 12, // Shaking
  },

  // 60-80: Sympathetic → Ventral transition (settling state)
  SYMPATHETIC_TO_VENTRAL: {
    ...VIDEO_SOURCE,
    somi_block_id: 11, // Vagus Reset
  },

  // 80-100: Ventral Vagal - Social Engagement (connected state)
  VENTRAL: {
    ...VIDEO_SOURCE,
    somi_block_id: 1, // Heart Opener
  },

  SOS: {
    ...VIDEO_SOURCE,
    somi_block_id: 11, // Vagus Reset for emergency
  },

  // Body scan meditation audio

}

export function getMediaForSliderValue(value) {
  if (value >= 0 && value < 20) {
    return MEDIA.DORSAL
  } else if (value >= 20 && value < 40) {
    return MEDIA.DORSAL_TO_SYMPATHETIC
  } else if (value >= 40 && value < 60) {
    return MEDIA.SYMPATHETIC
  } else if (value >= 60 && value < 80) {
    return MEDIA.SYMPATHETIC_TO_VENTRAL
  } else {
    // 80-100
    return MEDIA.VENTRAL
  }
}
