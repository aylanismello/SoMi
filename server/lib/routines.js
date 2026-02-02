// Routine configuration
// Manages different routine types (morning, night) and their block sequences

const ROUTINE_TYPES = {
  MORNING: 'morning',
  NIGHT: 'night',
}

const ROUTINE_CONFIGS = {
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

export function getRoutineConfig(routineType, blockCount) {
  const config = ROUTINE_CONFIGS[routineType]
  if (!config) {
    return null
  }

  const canonicalNames = config[blockCount]
  if (!canonicalNames) {
    return null
  }

  return canonicalNames
}

export function getAutoRoutineType() {
  const hour = new Date().getHours()

  // Night routine: 6pm - 5am
  if (hour >= 18 || hour < 5) {
    return ROUTINE_TYPES.NIGHT
  }

  // Morning routine: 5am - 6pm
  return ROUTINE_TYPES.MORNING
}
