// Video source URL - for MVP, all videos use the same source
const VIDEO_SOURCE = 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4';

// Video mappings for polyvagal slider states
export const VIDEOS = {
  // 0-20: Dorsal Vagal - Shutdown
  DORSAL: VIDEO_SOURCE,

  // 20-40: Dorsal → Sympathetic transition
  DORSAL_TO_SYMPATHETIC: VIDEO_SOURCE,

  // 40-60: Sympathetic - Fight/Flight
  SYMPATHETIC: VIDEO_SOURCE,

  // 60-80: Sympathetic → Ventral transition
  SYMPATHETIC_TO_VENTRAL: VIDEO_SOURCE,

  // 80-100: Ventral Vagal - Social Engagement
  VENTRAL: VIDEO_SOURCE,

  // SOS video
  SOS: VIDEO_SOURCE,
};

export function getVideoForSliderValue(value) {
  if (value >= 0 && value < 20) {
    return VIDEOS.DORSAL;
  } else if (value >= 20 && value < 40) {
    return VIDEOS.DORSAL_TO_SYMPATHETIC;
  } else if (value >= 40 && value < 60) {
    return VIDEOS.SYMPATHETIC;
  } else if (value >= 60 && value < 80) {
    return VIDEOS.SYMPATHETIC_TO_VENTRAL;
  } else {
    // 80-100
    return VIDEOS.VENTRAL;
  }
}
