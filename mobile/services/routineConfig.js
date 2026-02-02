// Routine configuration service
// Manages different routine types (morning, night) and their block sequences

export const ROUTINE_TYPES = {
  MORNING: 'morning',
  NIGHT: 'night',
}

// Routine configurations: canonical_name arrays for each type and duration
export const ROUTINE_CONFIGS = {
  [ROUTINE_TYPES.MORNING]: {
    2: ['vagus_reset', 'arm_shoulder_hand_circles'],
    6: ['vagus_reset', 'heart_opener', 'self_havening', 'body_tapping', 'freeze_roll', 'arm_shoulder_hand_circles'],
    10: ['vagus_reset', 'heart_opener', 'upward_gaze', 'self_havening', 'humming', 'ear_stretch', 'body_tapping', 'shaking', 'freeze_roll', 'arm_shoulder_hand_circles'],
  },
  [ROUTINE_TYPES.NIGHT]: {
    2: ['eye_covering', 'self_hug_swaying'],
    6: ['eye_covering', 'self_havening', 'humming', 'brain_hold', 'squeeze_hands_release', 'self_hug_swaying'],
    10: ['vagus_reset_lying_down', 'eye_covering', 'upward_gaze', 'self_havening', 'humming', 'ear_stretch', 'brain_hold', 'body_tapping', 'squeeze_hands_release', 'self_hug_swaying'],
  },
}

// Get auto-selected routine type based on time of day
export function getAutoRoutineType() {
  const hour = new Date().getHours()

  // Night routine: 6pm - 5am (18:00 - 05:00)
  if (hour >= 18 || hour < 5) {
    return ROUTINE_TYPES.NIGHT
  }

  // Morning routine: 5am - 6pm (05:00 - 18:00)
  return ROUTINE_TYPES.MORNING
}

// Get routine config for a specific type and block count
export function getRoutineConfig(routineType, blockCount) {
  const config = ROUTINE_CONFIGS[routineType]
  if (!config) {
    console.error(`Unknown routine type: ${routineType}`)
    return null
  }

  const canonicalNames = config[blockCount]
  if (!canonicalNames) {
    console.error(`No config for ${routineType} routine with ${blockCount} blocks`)
    return null
  }

  return canonicalNames
}

// Get friendly labels for routine types
export const ROUTINE_TYPE_LABELS = {
  [ROUTINE_TYPES.MORNING]: 'Morning',
  [ROUTINE_TYPES.NIGHT]: 'Night',
}

// Get routine type emoji/icon
export const ROUTINE_TYPE_EMOJIS = {
  [ROUTINE_TYPES.MORNING]: '☀️',
  [ROUTINE_TYPES.NIGHT]: '🌙',
}
