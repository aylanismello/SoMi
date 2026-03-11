// ─── Session Context Model ─────────────────────────────────────────────────
// Processes optional contextual signals into a structured session context
// that the flow generation engine uses to improve block selection.
//
// Hard rules (must always be respected):
//   - polyvagal state filtering
//   - block count / duration constraints
//   - warm-up / main / integration structure
//
// Contextual signals (soft — influence but never override hard rules):
//   - time of day
//   - chronotype / sleep-wake schedule
//   - recent usage patterns
//   - season / daylight
//   - weather / environment
//   - inferred need (activation, stabilization, down-regulation)
//   - desired support mode (guided, companion, fast-intervention)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Classify the time of day into a period label and hour.
 * @param {number|null} localHour - 0–23 local hour, or null if unknown
 * @returns {{ period: string, hour: number|null }}
 */
export function classifyTimeOfDay(localHour) {
  if (localHour == null) return { period: null, hour: null }
  if (localHour >= 5 && localHour < 12) return { period: 'morning', hour: localHour }
  if (localHour >= 12 && localHour < 17) return { period: 'afternoon', hour: localHour }
  if (localHour >= 17 && localHour < 22) return { period: 'evening', hour: localHour }
  return { period: 'late_night', hour: localHour }
}

/**
 * Infer the regulation need from polyvagal state and optional signals.
 *
 * @param {string} polyvagalState
 * @param {object} [signals]
 * @param {string} [signals.time_period] - morning | afternoon | evening | late_night
 * @returns {string} - activation | stabilization | down_regulation
 */
export function inferNeed(polyvagalState, signals = {}) {
  // Explicit override from client always wins
  if (signals.inferred_need) return signals.inferred_need

  const stateNeeds = {
    shutdown: 'activation',          // collapsed → gently activate
    restful: 'activation',           // calm but low energy → gentle activation
    steady: 'stabilization',         // balanced → maintain
    glowing: 'stabilization',        // expansive → sustain
    wired: 'down_regulation',        // over-activated → settle
  }

  let need = stateNeeds[polyvagalState] || 'stabilization'

  // Time-of-day nudge: evening/late-night leans toward settling
  if (signals.time_period === 'evening' || signals.time_period === 'late_night') {
    if (need === 'activation') need = 'stabilization'
    else if (need === 'stabilization') need = 'down_regulation'
  }

  return need
}

/**
 * Infer the season from the month (Northern Hemisphere default).
 * @param {number} month - 1-12
 * @returns {string} - spring | summer | autumn | winter
 */
export function inferSeason(month) {
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}

/**
 * Build a full session context from raw request inputs.
 *
 * @param {object} params
 * @param {string} params.polyvagal_state - required
 * @param {number} params.duration_minutes - required
 * @param {number|null} [params.local_hour] - 0–23
 * @param {string|null} [params.timezone]
 * @param {string|null} [params.chronotype] - early_bird | night_owl | flexible
 * @param {string|null} [params.sleep_wake_notes] - freeform
 * @param {string|null} [params.weather] - freeform descriptor (e.g. "rainy, 12°C")
 * @param {string|null} [params.season_override] - spring | summer | autumn | winter
 * @param {string|null} [params.inferred_need] - activation | stabilization | down_regulation
 * @param {string|null} [params.support_mode] - guided | companion | fast_intervention
 * @param {string|null} [params.recent_usage_summary] - freeform
 * @returns {object} structured session context
 */
export function buildSessionContext(params) {
  const {
    polyvagal_state,
    duration_minutes,
    local_hour = null,
    timezone = null,
    chronotype = null,
    sleep_wake_notes = null,
    weather = null,
    season_override = null,
    inferred_need = null,
    support_mode = null,
    recent_usage_summary = null,
  } = params

  const timeOfDay = classifyTimeOfDay(local_hour)

  // Season: explicit override > inferred from current date
  const now = new Date()
  const season = season_override || inferSeason(now.getMonth() + 1)

  const resolvedNeed = inferNeed(polyvagal_state, {
    time_period: timeOfDay.period,
    inferred_need,
  })

  return {
    // ── Hard context (always present) ──────────────────────────────────────
    polyvagal_state,
    duration_minutes,

    // ── Time context ───────────────────────────────────────────────────────
    time_of_day: timeOfDay,
    timezone,
    season,

    // ── Body / rhythm context ──────────────────────────────────────────────
    chronotype,
    sleep_wake_notes,

    // ── Environment ────────────────────────────────────────────────────────
    weather,

    // ── Regulation context ─────────────────────────────────────────────────
    inferred_need: resolvedNeed,
    support_mode: support_mode || 'guided',

    // ── Usage history ──────────────────────────────────────────────────────
    recent_usage_summary,
  }
}

/**
 * Format session context into a human-readable context block for the LLM prompt.
 * Only includes signals that are actually present — avoids noise.
 *
 * @param {object} ctx - output of buildSessionContext
 * @returns {string}
 */
export function formatContextForPrompt(ctx) {
  const lines = []

  lines.push(`Nervous system state: ${ctx.polyvagal_state}`)
  lines.push(`Duration: ${ctx.duration_minutes} minutes`)

  if (ctx.time_of_day.period) {
    lines.push(`Time of day: ${ctx.time_of_day.period} (${ctx.time_of_day.hour}:00)`)
  }

  if (ctx.season) {
    lines.push(`Season: ${ctx.season}`)
  }

  if (ctx.chronotype) {
    lines.push(`Chronotype: ${ctx.chronotype}`)
  }

  if (ctx.sleep_wake_notes) {
    lines.push(`Sleep/wake notes: ${ctx.sleep_wake_notes}`)
  }

  if (ctx.weather) {
    lines.push(`Weather/environment: ${ctx.weather}`)
  }

  lines.push(`Inferred regulation need: ${ctx.inferred_need}`)
  lines.push(`Support mode: ${ctx.support_mode}`)

  if (ctx.recent_usage_summary) {
    lines.push(`Recent usage: ${ctx.recent_usage_summary}`)
  }

  return lines.join('\n')
}
