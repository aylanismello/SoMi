// Centralized polyvagal state definitions
// Used across SoMiCheckIn, HomeScreen, EmbodimentSlider, SoMiRoutineScreen, etc.

export const POLYVAGAL_STATES = {
  0: { id: 0, code: 0, label: 'SOS', color: '#ff6b9d', emoji: '🆘' },
  1: { id: 1, code: 1, label: 'Drained', color: '#4A5F8C', emoji: '🌧' },
  2: { id: 2, code: 2, label: 'Foggy', color: '#5B7BB4', emoji: '🌫' },
  3: { id: 3, code: 3, label: 'Wired', color: '#6B9BD1', emoji: '🌪' },
  4: { id: 4, code: 4, label: 'Steady', color: '#7DBCE7', emoji: '🌤' },
  5: { id: 5, code: 5, label: 'Glowing', color: '#90DDF0', emoji: '☀️' },
}

// Map new polyvagal state codes to old database state_target values (for backward compatibility)
export const STATE_CODE_TO_TARGET = {
  1: 'withdrawn', // Drained
  2: 'stirring',  // Foggy
  3: 'activated', // Wired
  4: 'settling',  // Steady
  5: 'connected', // Glowing
}

// Old state_target to state info (for backward compatibility with somi_blocks)
export const OLD_STATE_INFO = {
  withdrawn: { id: 'withdrawn', label: 'Withdrawn', color: '#4A5F8C', emoji: '🌧' },
  stirring: { id: 'stirring', label: 'Stirring', color: '#5B7BB4', emoji: '🌫' },
  activated: { id: 'activated', label: 'Activated', color: '#6B9BD1', emoji: '🌪' },
  settling: { id: 'settling', label: 'Settling', color: '#7DBCE7', emoji: '🌤' },
  connected: { id: 'connected', label: 'Connected', color: '#90DDF0', emoji: '☀️' },
}

// Helper to get state info by code
export const getStateByCode = (code) => {
  return POLYVAGAL_STATES[code] || POLYVAGAL_STATES[1] // Default to Drained
}

// Helper to get state info by old target value
export const getStateByTarget = (target) => {
  return OLD_STATE_INFO[target] || OLD_STATE_INFO.withdrawn // Default to withdrawn
}

// Export as array for components that need it in that format
export const POLYVAGAL_STATES_ARRAY = Object.values(POLYVAGAL_STATES).filter(s => s.code !== 0)

// Export just emojis map
export const STATE_EMOJIS = Object.values(POLYVAGAL_STATES).reduce((acc, state) => {
  acc[state.code] = state.emoji
  return acc
}, {})
