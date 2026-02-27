// New 2D Energy × Safety state model
// X = energy (0=low, 100=high)
// Y = safety (0=unsafe/disconnected, 100=safe/connected)

export const POLYVAGAL_STATES = {
  restful:  { name: 'restful',  label: 'Restful',  icon: '🌦', color: '#4ECDC4' },
  glowing:  { name: 'glowing',  label: 'Glowing',  icon: '☀️', color: '#F4B942' },
  shutdown: { name: 'shutdown', label: 'Shutdown', icon: '🌑', color: '#4A5A72' },
  wired:    { name: 'wired',    label: 'Wired',    icon: '🌪', color: '#8B5CF6' },
  steady:   { name: 'steady',   label: 'Steady',   icon: '⛅', color: '#7DBCE7' },
}

// Derive polyvagal state from energy (0-100) and safety (0-100)
// Within ~15 units of center (50,50) → Steady (overrides quadrant)
export function deriveState(energy, safety) {
  const e = energy ?? 50
  const s = safety ?? 50
  const dist = Math.sqrt(Math.pow(e - 50, 2) + Math.pow(s - 50, 2))
  if (dist < 15) return POLYVAGAL_STATES.steady
  if (e < 50 && s >= 50) return POLYVAGAL_STATES.restful
  if (e >= 50 && s >= 50) return POLYVAGAL_STATES.glowing
  if (e < 50 && s < 50) return POLYVAGAL_STATES.shutdown
  return POLYVAGAL_STATES.wired
}

// Intensity: 0 at center (Steady), 100 at corners
export function deriveIntensity(energy, safety) {
  const e = energy ?? 50
  const s = safety ?? 50
  return Math.min(100, Math.sqrt(Math.pow(e - 50, 2) + Math.pow(s - 50, 2)) / 50 * 100)
}

// Derive target polyvagal state from a block's energy/safety deltas.
// Positive energy_delta = block energises; negative = calms.
// Positive safety_delta = block grounds/connects; negative = activates/destabilises.
export function deriveStateFromDeltas(energy_delta, safety_delta) {
  const e = energy_delta ?? 0
  const s = safety_delta ?? 0
  if (e === 0 && s === 0) return POLYVAGAL_STATES.steady
  if (e >= 0 && s >= 0) return POLYVAGAL_STATES.glowing
  if (e < 0 && s >= 0) return POLYVAGAL_STATES.restful
  if (e < 0 && s < 0) return POLYVAGAL_STATES.shutdown
  return POLYVAGAL_STATES.wired  // e >= 0, s < 0
}

// Helper to get state info by name
export const getStateByName = (name) => {
  return POLYVAGAL_STATES[name] || POLYVAGAL_STATES.steady
}

// Export as array
export const POLYVAGAL_STATES_ARRAY = Object.values(POLYVAGAL_STATES)
