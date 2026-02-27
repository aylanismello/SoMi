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

// ─── 8-Zone Polyvagal Explanations ────────────────────────────────────────────
// Divides the 2D space into 8 zones (2 safety bands × 4 energy bands)
// energy: 0-100 (0=low, 100=high)
// safety: 0-100 (0=unsafe, 100=safe)
const POLYVAGAL_EXPLANATIONS = [
  {
    id: 'deep_rest',
    test: (e, s) => s > 50 && e < 25,
    title: 'Deep Rest',
    body: "Your nervous system has settled into deep stillness. This is the ventral vagal state at its quietest — safe, slow, and restorative. Your body is doing repair work beneath the surface. Nothing needs to happen right now.",
  },
  {
    id: 'calm',
    test: (e, s) => s > 50 && e >= 25 && e < 50,
    title: 'Calm',
    body: "You're grounded and quietly present. This is your nervous system's home base — regulated, available, and open without needing to perform. There's a steady readiness here, neither pushing nor retreating.",
  },
  {
    id: 'engaged',
    test: (e, s) => s > 50 && e >= 50 && e < 75,
    title: 'Engaged',
    body: "Energized and at ease. Your ventral vagal system is fully online — you have access to creativity, connection, and clear thinking. This is a great state for meaningful work and genuine presence.",
  },
  {
    id: 'alive',
    test: (e, s) => s > 50 && e >= 75,
    title: 'Alive',
    body: "High energy with safety underneath it. You might feel joyful, inspired, or deeply motivated. Your system is fully mobilized in a healthy way — this is aliveness, not threat. Let it move through you.",
  },
  {
    id: 'collapsed',
    test: (e, s) => s <= 50 && e < 25,
    title: 'Collapsed',
    body: "Your nervous system has gone into dorsal vagal shutdown — the oldest survival response. You may feel numb, foggy, heavy, or disconnected. Your body is protecting you by conserving energy. Gentle warmth, slow breath, or light movement can help your system begin to emerge.",
  },
  {
    id: 'frozen',
    test: (e, s) => s <= 50 && e >= 25 && e < 50,
    title: 'Frozen',
    body: "You're caught between shutdown and activation — the freeze response. Your system is braced but unable to move. You might feel stuck, anxious without knowing why, or simply blank. This is a protective state, not a failure. A slow exhale, or any small movement, can begin to thaw it.",
  },
  {
    id: 'anxious',
    test: (e, s) => s <= 50 && e >= 50 && e < 75,
    title: 'Anxious',
    body: "Your sympathetic nervous system is mobilizing in response to perceived threat. You may feel on edge, irritable, or scattered. Cortisol and adrenaline are at work. This is your body's protection response doing its job — grounding and rhythmic movement can help your system recalibrate.",
  },
  {
    id: 'overwhelmed',
    test: (e, s) => s <= 50 && e >= 75,
    title: 'Overwhelmed',
    body: "Full sympathetic activation. Your system is in high-alert survival mode — fight, flight, or panic may feel close. Your body is doing exactly what it was built to do in the face of perceived danger. It needs to know you're safe. Slow, extended exhales are the fastest signal you can send it.",
  },
]

export function getPolyvagalExplanation(energy, safety) {
  const e = energy ?? 50
  const s = safety ?? 50
  const zone = POLYVAGAL_EXPLANATIONS.find(z => z.test(e, s)) ?? POLYVAGAL_EXPLANATIONS[1]
  return { title: zone.title, body: zone.body }
}

