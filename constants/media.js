// Media source configuration
const VIDEO_SOURCE = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4',
  type: 'video',
}

const BODY_SCAN = {
  url: 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/5%20Min.%20Body%20Scan%20Meditation_CW2%201.mp3',
  type: 'audio',
}


// Media mappings for polyvagal slider states
export const MEDIA = {
  // 0-20: Dorsal Vagal - Shutdown
  DORSAL: BODY_SCAN,

  // 20-40: Dorsal → Sympathetic transition
  DORSAL_TO_SYMPATHETIC: VIDEO_SOURCE,

  // 40-60: Sympathetic - Fight/Flight
  SYMPATHETIC: VIDEO_SOURCE,

  // 60-80: Sympathetic → Ventral transition
  SYMPATHETIC_TO_VENTRAL: VIDEO_SOURCE,

  // 80-100: Ventral Vagal - Social Engagement
  VENTRAL: VIDEO_SOURCE,

  SOS: VIDEO_SOURCE,

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
