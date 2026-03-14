import SunCalc from 'suncalc'
import type {
  SessionContextParams,
  SessionContext,
  TimeOfDay,
  SolarContext,
  SolarPhase,
  PolyvagalStateName,
  RegulationNeed,
  InferNeedSignals,
} from '../types'

// ─── Session Context Model ─────────────────────────────────────────────────
// Hard rules: polyvagal state filtering, block count / duration constraints,
//             warm-up / main / integration structure
// Contextual signals (soft): solar position, time of day, chronotype,
//                            recent usage, weather, inferred need, support mode
// ─────────────────────────────────────────────────────────────────────────────

// ── Approximate coordinates for major IANA timezones ─────────────────────────
// Used to compute solar position without requiring location permission.
// [lat, lng] — representative city for the timezone.
const TIMEZONE_COORDS = {
  // North America
  'America/New_York':          [40.71, -74.01],
  'America/Chicago':           [41.88, -87.63],
  'America/Denver':            [39.74, -104.98],
  'America/Los_Angeles':       [34.05, -118.24],
  'America/Phoenix':           [33.45, -112.07],
  'America/Anchorage':         [61.22, -149.90],
  'America/Honolulu':          [21.31, -157.86],
  'America/Toronto':           [43.65, -79.38],
  'America/Vancouver':         [49.25, -123.12],
  'America/Winnipeg':          [49.90, -97.14],
  'America/Edmonton':          [53.55, -113.47],
  'America/Halifax':           [44.65, -63.58],
  'America/St_Johns':          [47.56, -52.71],
  'America/Mexico_City':       [19.43, -99.13],
  'America/Monterrey':         [25.69, -100.32],
  'America/Bogota':            [4.71, -74.07],
  'America/Lima':              [-12.05, -77.04],
  'America/Santiago':          [-33.46, -70.65],
  'America/Sao_Paulo':         [-23.55, -46.63],
  'America/Manaus':            [-3.10, -60.02],
  'America/Fortaleza':         [-3.72, -38.54],
  'America/Buenos_Aires':      [-34.60, -58.38],
  'America/Argentina/Buenos_Aires': [-34.60, -58.38],
  'America/Caracas':           [10.48, -66.88],
  'America/Guayaquil':         [-2.17, -79.92],
  'America/La_Paz':            [-16.50, -68.15],
  'America/Asuncion':          [-25.28, -57.63],
  'America/Montevideo':        [-34.90, -56.19],
  'America/Panama':            [8.99, -79.52],
  'America/Costa_Rica':        [9.93, -84.08],
  'America/Guatemala':         [14.63, -90.51],
  'America/Tegucigalpa':       [14.09, -87.21],
  'America/Managua':           [12.13, -86.29],
  'America/El_Salvador':       [13.69, -89.19],
  'America/Belize':            [17.25, -88.77],
  'America/Nassau':            [25.06, -77.34],
  'America/Santo_Domingo':     [18.47, -69.90],
  'America/Port-au-Prince':    [18.54, -72.34],
  'America/Jamaica':           [17.99, -76.79],
  'America/Havana':            [23.13, -82.38],
  // Europe
  'Europe/London':             [51.51, -0.13],
  'Europe/Dublin':             [53.33, -6.25],
  'Europe/Lisbon':             [38.72, -9.14],
  'Europe/Paris':              [48.85, 2.35],
  'Europe/Berlin':             [52.52, 13.41],
  'Europe/Madrid':             [40.42, -3.70],
  'Europe/Rome':               [41.90, 12.50],
  'Europe/Amsterdam':          [52.37, 4.90],
  'Europe/Brussels':           [50.85, 4.35],
  'Europe/Vienna':             [48.21, 16.37],
  'Europe/Stockholm':          [59.33, 18.07],
  'Europe/Oslo':               [59.91, 10.75],
  'Europe/Helsinki':           [60.17, 24.94],
  'Europe/Copenhagen':         [55.68, 12.57],
  'Europe/Zurich':             [47.38, 8.54],
  'Europe/Warsaw':             [52.23, 21.01],
  'Europe/Prague':             [50.08, 14.44],
  'Europe/Budapest':           [47.50, 19.04],
  'Europe/Bucharest':          [44.43, 26.10],
  'Europe/Athens':             [37.98, 23.73],
  'Europe/Istanbul':           [41.01, 28.95],
  'Europe/Moscow':             [55.75, 37.62],
  'Europe/Kiev':               [50.45, 30.52],
  'Europe/Kyiv':               [50.45, 30.52],
  'Europe/Minsk':              [53.90, 27.57],
  'Europe/Riga':               [56.95, 24.11],
  'Europe/Tallinn':            [59.44, 24.75],
  'Europe/Vilnius':            [54.69, 25.28],
  'Europe/Sofia':              [42.70, 23.32],
  'Europe/Belgrade':           [44.82, 20.46],
  'Europe/Zagreb':             [45.81, 15.98],
  'Europe/Sarajevo':           [43.85, 18.39],
  'Europe/Skopje':             [41.99, 21.43],
  'Europe/Podgorica':          [42.44, 19.26],
  'Europe/Tirane':             [41.33, 19.83],
  'Europe/Luxembourg':         [49.61, 6.13],
  'Europe/Malta':              [35.90, 14.51],
  'Europe/Nicosia':            [35.17, 33.36],
  // Africa
  'Africa/Cairo':              [30.06, 31.25],
  'Africa/Lagos':              [6.45, 3.39],
  'Africa/Nairobi':            [-1.29, 36.82],
  'Africa/Johannesburg':       [-26.20, 28.04],
  'Africa/Casablanca':         [33.59, -7.62],
  'Africa/Algiers':            [36.74, 3.06],
  'Africa/Tunis':              [36.82, 10.17],
  'Africa/Tripoli':            [32.90, 13.18],
  'Africa/Khartoum':           [15.55, 32.53],
  'Africa/Addis_Ababa':        [9.02, 38.75],
  'Africa/Dar_es_Salaam':      [-6.80, 39.28],
  'Africa/Kampala':            [0.32, 32.57],
  'Africa/Accra':              [5.56, -0.20],
  'Africa/Abidjan':            [5.36, -4.01],
  'Africa/Dakar':              [14.72, -17.47],
  'Africa/Maputo':             [-25.97, 32.58],
  'Africa/Harare':             [-17.83, 31.05],
  'Africa/Lusaka':             [-15.42, 28.28],
  'Africa/Kinshasa':           [-4.32, 15.32],
  'Africa/Luanda':             [-8.84, 13.23],
  // Asia
  'Asia/Dubai':                [25.20, 55.27],
  'Asia/Riyadh':               [24.69, 46.72],
  'Asia/Kuwait':               [29.37, 47.98],
  'Asia/Baghdad':              [33.34, 44.40],
  'Asia/Tehran':               [35.69, 51.42],
  'Asia/Karachi':              [24.86, 67.01],
  'Asia/Kolkata':              [22.57, 88.37],
  'Asia/Mumbai':               [19.08, 72.88],
  'Asia/Dhaka':                [23.72, 90.41],
  'Asia/Colombo':              [6.93, 79.86],
  'Asia/Kathmandu':            [27.72, 85.32],
  'Asia/Almaty':               [43.26, 76.95],
  'Asia/Tashkent':             [41.30, 69.27],
  'Asia/Kabul':                [34.53, 69.17],
  'Asia/Yekaterinburg':        [56.84, 60.61],
  'Asia/Novosibirsk':          [54.99, 82.90],
  'Asia/Krasnoyarsk':          [56.01, 92.87],
  'Asia/Irkutsk':              [52.30, 104.30],
  'Asia/Vladivostok':          [43.10, 131.87],
  'Asia/Bangkok':              [13.75, 100.52],
  'Asia/Jakarta':              [-6.21, 106.85],
  'Asia/Singapore':            [1.35, 103.82],
  'Asia/Kuala_Lumpur':         [3.14, 101.69],
  'Asia/Manila':               [14.60, 120.98],
  'Asia/Ho_Chi_Minh':          [10.82, 106.63],
  'Asia/Yangon':               [16.87, 96.14],
  'Asia/Phnom_Penh':           [11.57, 104.92],
  'Asia/Vientiane':            [17.97, 102.60],
  'Asia/Shanghai':             [31.23, 121.47],
  'Asia/Hong_Kong':            [22.28, 114.16],
  'Asia/Taipei':               [25.05, 121.53],
  'Asia/Seoul':                [37.57, 126.98],
  'Asia/Tokyo':                [35.69, 139.69],
  'Asia/Ulaanbaatar':          [47.91, 106.88],
  'Asia/Bishkek':              [42.87, 74.59],
  'Asia/Dushanbe':             [38.56, 68.77],
  'Asia/Ashgabat':             [37.95, 58.38],
  'Asia/Baku':                 [40.41, 49.87],
  'Asia/Tbilisi':              [41.69, 44.83],
  'Asia/Yerevan':              [40.18, 44.51],
  'Asia/Beirut':               [33.89, 35.50],
  'Asia/Damascus':             [33.51, 36.29],
  'Asia/Amman':                [31.96, 35.95],
  'Asia/Jerusalem':            [31.77, 35.22],
  'Asia/Tel_Aviv':             [32.07, 34.78],
  'Asia/Nicosia':              [35.17, 33.36],
  // Oceania
  'Australia/Sydney':          [-33.87, 151.21],
  'Australia/Melbourne':       [-37.81, 144.96],
  'Australia/Brisbane':        [-27.47, 153.02],
  'Australia/Perth':           [-31.95, 115.86],
  'Australia/Adelaide':        [-34.93, 138.60],
  'Australia/Darwin':          [-12.46, 130.84],
  'Australia/Hobart':          [-42.88, 147.33],
  'Pacific/Auckland':          [-36.87, 174.77],
  'Pacific/Fiji':              [-18.14, 178.44],
  'Pacific/Honolulu':          [21.31, -157.86],
  'Pacific/Guam':              [13.44, 144.79],
  'Pacific/Port_Moresby':      [-9.44, 147.18],
}

/**
 * Get approximate [lat, lng] for a timezone string.
 * Falls back to [45, utcOffset * 15] if not in table.
 */
function getApproxCoords(timezone: string | null): [number, number] | null {
  if (!timezone) return null
  if (TIMEZONE_COORDS[timezone as keyof typeof TIMEZONE_COORDS]) return TIMEZONE_COORDS[timezone as keyof typeof TIMEZONE_COORDS] as [number, number]
  // Rough UTC offset → longitude fallback
  try {
    const now = new Date()
    const localHour = parseInt(new Intl.DateTimeFormat('en-US', {
      timeZone: timezone, hour: 'numeric', hour12: false
    }).format(now))
    const utcHour = now.getUTCHours()
    const offsetHours = localHour - utcHour
    return [40, offsetHours * 15] // temperate latitude default
  } catch {
    return null
  }
}

/**
 * Get the UTC offset in hours for a timezone at the current moment.
 * Handles DST automatically via Intl.
 */
function getUTCOffsetHours(timezone: string | null): number {
  if (!timezone) return 0
  try {
    const now = new Date()
    const fmt = (tz: string) => new Intl.DateTimeFormat('en-US', {
      timeZone: tz, hour: 'numeric', minute: 'numeric', hour12: false,
    }).formatToParts(now)
    const lp = fmt(timezone)
    const up = fmt('UTC')
    const lh = parseInt(lp.find(p => p.type === 'hour')!.value)
    const lm = parseInt(lp.find(p => p.type === 'minute')!.value)
    const uh = parseInt(up.find(p => p.type === 'hour')!.value)
    const um = parseInt(up.find(p => p.type === 'minute')!.value)
    let diff = (lh * 60 + lm) - (uh * 60 + um)
    if (diff > 720) diff -= 1440
    if (diff < -720) diff += 1440
    return diff / 60
  } catch {
    return 0
  }
}

/**
 * Compute solar position context from coordinates, timezone, and local hour.
 * Returns { phase, description } or null if inputs are insufficient.
 *
 * phase: 'deep_night' | 'dawn' | 'early_day' | 'day' | 'pre_sunset' | 'dusk' | 'night'
 */
export function computeSolarContext(lat: number | null, lng: number | null, timezone: string | null, localHour: number | null): SolarContext | null {
  if (lat == null || lng == null || localHour == null) return null
  try {
    const times = SunCalc.getTimes(new Date(), lat, lng)
    const utcOffset = getUTCOffsetHours(timezone)

    // Convert a UTC Date from suncalc to local minutes-from-midnight
    const toLocalMins = (d: Date): number | null => {
      if (!d || isNaN(d.getTime())) return null
      let localH = (d.getUTCHours() + utcOffset + 48) % 24
      return Math.round(localH * 60 + d.getUTCMinutes())
    }

    const sunriseMins = toLocalMins(times.sunrise)
    const sunsetMins  = toLocalMins(times.sunset)
    const dawnMins    = toLocalMins(times.dawn)
    const duskMins    = toLocalMins(times.dusk)

    // If sun doesn't rise/set (polar extremes), skip solar context
    if (sunriseMins == null || sunsetMins == null) return null

    const nowMins = localHour * 60

    const fmt = (mins: number): string => {
      const h = Math.floor(mins / 60)
      const m = mins % 60
      return h > 0 ? `${h}h ${m > 0 ? m + 'min ' : ''}` : `${m}min `
    }

    if (nowMins < (dawnMins ?? sunriseMins)) {
      const minsTo = sunriseMins - nowMins
      return {
        phase: 'deep_night',
        description: minsTo > 120
          ? `deep night — ${fmt(minsTo)}before sunrise`
          : `${fmt(minsTo)}before sunrise (pre-dawn)`,
      }
    }
    if (nowMins < sunriseMins) {
      return {
        phase: 'dawn',
        description: `${fmt(sunriseMins - nowMins)}before sunrise (pre-dawn light)`,
      }
    }
    if (nowMins < sunsetMins) {
      const minsIn  = nowMins - sunriseMins
      const total   = sunsetMins - sunriseMins
      const minsTo  = sunsetMins - nowMins
      const pct     = Math.round((minsIn / total) * 100)
      if (minsIn <= 60) {
        return { phase: 'early_day', description: `${fmt(minsIn)}after sunrise (early light)` }
      }
      if (minsTo <= 60) {
        return { phase: 'pre_sunset', description: `${fmt(minsTo)}before sunset` }
      }
      return {
        phase: 'day',
        description: `${pct}% through daylight — ${fmt(minsTo)}until sunset`,
      }
    }
    if (nowMins < (duskMins ?? sunsetMins + 30)) {
      return {
        phase: 'dusk',
        description: `${fmt(nowMins - sunsetMins)}after sunset (dusk)`,
      }
    }
    return {
      phase: 'night',
      description: `${fmt(nowMins - sunsetMins)}after sunset (night)`,
    }
  } catch {
    return null
  }
}

/**
 * Classify the time of day into a period label and hour.
 */
export function classifyTimeOfDay(localHour: number | null): TimeOfDay {
  if (localHour == null) return { period: null, hour: null }
  if (localHour >= 5 && localHour < 12) return { period: 'morning', hour: localHour }
  if (localHour >= 12 && localHour < 17) return { period: 'afternoon', hour: localHour }
  if (localHour >= 17 && localHour < 22) return { period: 'evening', hour: localHour }
  return { period: 'late_night', hour: localHour }
}

/**
 * Infer the regulation need from polyvagal state and optional signals.
 * Prefers solar phase over crude time_period if available.
 */
export function inferNeed(polyvagalState: PolyvagalStateName, signals: InferNeedSignals = {}): RegulationNeed {
  if (signals.inferred_need) return signals.inferred_need

  const stateNeeds: Record<PolyvagalStateName, RegulationNeed> = {
    shutdown: 'activation',
    restful:  'activation',
    steady:   'stabilization',
    glowing:  'stabilization',
    wired:    'down_regulation',
  }
  let need: RegulationNeed = stateNeeds[polyvagalState] || 'stabilization'

  const settlingPhases: SolarPhase[] = ['pre_sunset', 'dusk', 'night', 'deep_night']
  if (signals.solar_phase && settlingPhases.includes(signals.solar_phase)) {
    if (need === 'activation') need = 'stabilization'
    else if (need === 'stabilization') need = 'down_regulation'
  } else if (!signals.solar_phase) {
    // Fall back to time_period nudge when no solar data
    if (signals.time_period === 'evening' || signals.time_period === 'late_night') {
      if (need === 'activation') need = 'stabilization'
      else if (need === 'stabilization') need = 'down_regulation'
    }
  }

  return need
}

/**
 * Build a full session context from raw request inputs.
 */
export function buildSessionContext(params: SessionContextParams): SessionContext {
  const {
    polyvagal_state,
    duration_minutes,
    local_hour = null,
    timezone = null,
    latitude = null,
    longitude = null,
    chronotype = null,
    sleep_wake_notes = null,
    weather = null,
    inferred_need = null,
    support_mode = null,
    recent_usage_summary = null,
  } = params

  const timeOfDay = classifyTimeOfDay(local_hour)

  // Coordinates: explicit > timezone-derived
  const coords = (latitude != null && longitude != null)
    ? [latitude, longitude]
    : getApproxCoords(timezone)

  const solarContext = coords
    ? computeSolarContext(coords[0], coords[1], timezone, local_hour)
    : null

  const resolvedNeed = inferNeed(polyvagal_state, {
    time_period: timeOfDay.period,
    solar_phase: solarContext?.phase,
    inferred_need,
  })

  return {
    polyvagal_state,
    duration_minutes,
    time_of_day: timeOfDay,
    timezone,
    solar_context: solarContext,
    chronotype,
    sleep_wake_notes,
    weather,
    inferred_need: resolvedNeed,
    support_mode: support_mode || 'guided',
    recent_usage_summary,
  }
}

/**
 * Format session context into a human-readable block for the LLM prompt.
 */
export function formatContextForPrompt(ctx: SessionContext): string {
  const lines: string[] = []

  lines.push(`Nervous system state: ${ctx.polyvagal_state}`)
  lines.push(`Duration: ${ctx.duration_minutes} minutes`)

  if (ctx.time_of_day.period) {
    lines.push(`Time of day: ${ctx.time_of_day.period} (${ctx.time_of_day.hour}:00 local)`)
  }

  if (ctx.solar_context) {
    lines.push(`Solar position: ${ctx.solar_context.description}`)
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
