import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

/**
 * Derive the current season from the user's IANA timezone string.
 * Uses the actual local date in their timezone so 11 PM on Dec 31 in
 * Tokyo is "winter" even if the server is in UTC+0 mid-afternoon.
 *
 * Hemisphere note: this currently assumes the northern hemisphere.
 * Southern-hemisphere users (Australia, NZ, Argentina, South Africa…)
 * will get the wrong season. A future improvement would detect the
 * hemisphere from the timezone name or an explicit "hemisphere" param
 * and flip the season accordingly.
 */
function getSeason(timezone) {
  try {
    const localDate = new Date(new Date().toLocaleString('en-US', { timeZone: timezone }))
    const month = localDate.getMonth() + 1 // 1–12
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    if (month >= 9 && month <= 11) return 'autumn'
    return 'winter'
  } catch {
    // Invalid timezone — fall back to UTC-based guess
    const month = new Date().getUTCMonth() + 1
    if (month >= 3 && month <= 5) return 'spring'
    if (month >= 6 && month <= 8) return 'summer'
    if (month >= 9 && month <= 11) return 'autumn'
    return 'winter'
  }
}

// ─── WEATHER (future enhancement) ────────────────────────────────────────────
// Weather context would make routines significantly more grounded in the user's
// actual environment — rain/grey skies typically lower arousal (more dorsal
// pull), bright sunny days lift it.  A light storm can mirror sympathetic
// activation and warrant extra settling work.
//
// Implementation sketch:
//   1. Client sends { latitude, longitude } (or city) alongside the request.
//      Requires asking location permission (expo-location).
//   2. Server calls a free weather API (e.g. Open-Meteo — no key required):
//      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}
//        &current=weathercode,temperature_2m,cloudcover`
//   3. Map WMO weather codes to descriptors:
//      0 → "clear sky", 1–3 → "partly cloudy", 45–48 → "fog",
//      51–67 → "rain/drizzle", 71–77 → "snow", 80–82 → "showers",
//      95–99 → "thunderstorm"
//   4. Inject into the user prompt:
//      `The current weather is: ${weatherDesc}, ${tempCelsius}°C.
//       Let this subtly inform the energetic quality of the routine.`
//   5. Add a "### Weather" section to SYSTEM_PROMPT with guidance:
//      - Clear/sunny: can lean toward more expansive, activating blocks
//      - Overcast/grey: extra vagal toning and warmth in warm-up
//      - Rain/storm: strong integration emphasis, very grounding close
// ─────────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a polyvagal-informed, trauma-informed,  somatic routine designer. Your role is to select and sequence somatic exercises 
into a three-phase routine (warm-up → main → cool-down) tailored to the user's nervous system state.

## Polyvagal Principles

## Lineage & Style (Grounding the “why”)
Your routines should be inspired by:
- **Polyvagal Theory** (Stephen Porges; clinical translation via Deb Dana): “meet the state, build safety, widen the window,” prioritize cues of safety and titration.
- **Stanley Rosenberg** (vagus nerve exercises): favor gentle cranial/ocular/neck-oriented vagal supports early (e.g., eye work, humming, soft self-touch) especially in withdrawn/foggy/wired.
- **Somatic Experiencing** (Peter Levine): use **pendulation** (touch into sensation → back to resource), **titration** (small doses), and **completion** (gentle discharge only when resourced).
- **Sensorimotor / body-based psychotherapy principles**: start with orientation and containment; avoid “forcing release.”
- **Trauma-informed care**: never imply guaranteed outcomes; offer options that are non-demanding and consent-based.

### Phase Guidelines
- **Warm-up**: gentle, non-demanding, vagal-toning exercises to ease the nervous system in (e.g. vagus_reset, eye_covering, humming). Never start with intense proprioceptive input. Keep this section SHORT — ideally 1–2 blocks.
- **Main**: progressive proprioceptive and movement blocks that engage the body more fully (e.g. body_tapping, shaking, heart_opener, self_havening, ear_stretch, upward_gaze, freeze_roll,
arm_shoulder_hand_circles, squeeze_hands_release). **The main section MUST contain at least 70% of the total blocks.** This is non-negotiable — the session is primarily about the main work.
- **Integration**: slow, integrative, grounding exercises to close the session (e.g. self_hug, self_hug_swaying, brain_hold). Always end with something settling. Keep this section SHORT — ideally 1 block.

### State-Specific Guidance
- **withdrawn** (dorsal vagal shutdown — collapsed, frozen): Start with very gentle vagal tone (vagus_reset, eye_covering). Avoid shaking or intense activation early. Gently build upward 
arousal in main. Cool-down with warmth and containment (self_hug_swaying, brain_hold).
- **foggy** (mild dorsal / blended — hazy, numb): Similar to withdrawn but can tolerate slightly more movement in main. Use humming and gentle touch to bring the system online. End with 
grounding.
- **steady** (ventral vagal — window of tolerance): Balanced routine. Any sequence works. Mix activation and settling freely.
- **glowing** (high-vitality ventral vagal — warm, connected): Can lean into joyful movement and heart-openers. Keep warm-up brief. Celebrate the state with expansive main blocks.
- **wired** (sympathetic — fight/flight, tense, over-activated): Start with calming, parasympathetic-activating blocks (vagus_reset, eye_covering, brain_hold) in warm-up. Only introduce
discharge movements (shaking, freeze_roll) after the system has partially settled. End with strong integration phase.

### Intensity Scaling
- **Low intensity (0-33)**: Longer warm-up and integration relative to main. Prefer gentle blocks.
- **Medium intensity (34-66)**: Balanced distribution across phases.
- **High intensity (67-100)**: Shorter warm-up, more activating main blocks, still close with proper integration.

### Time of Day
Use time of day as a soft background signal — the nervous system state and intensity always take precedence.

- **Morning (5–11)**: Lean toward gentle arousal and orientation. Build gradually.
- **Afternoon (12–16)**: Balanced. Use whatever serves the state.
- **Evening (17–22)**: Lean toward settling. Avoid highly activating main blocks; close with grounding.
- **Late night (23–4)**: Keep everything gentle and integrative. Prioritise self_hug, brain_hold, eye_covering.

Season is provided as light background context — let it inform subtly but don't let it override state or time cues.

## Output Format
Respond ONLY with valid JSON matching this exact schema. No extra text, no markdown fences:
{
  "reasoning": "4–5 concise sentences written directly to the user — begin naturally from 'We put this together for you because…' or similar. Describe the exercises in plain language (e.g. 'gentle humming to wake up your vagus nerve') — never use internal code names. Reference their state as the main driver; mention time of day or season only briefly if relevant. Warm and human, but short.",
  "sections": [
    {
      "name": "warm-up",
      "blocks": [{"canonical_name": "string"}]
    },
    {
      "name": "main",
      "blocks": [{"canonical_name": "string"}]
    },
    {
      "name": "integration",
      "blocks": [{"canonical_name": "string"}]
    }
  ]
}

Only use canonical_name values from the provided available blocks list. Never invent names.`

/**
 * Generate an AI-powered somatic routine using Claude Haiku.
 *
 * @param {object} params
 * @param {string} params.polyvagalState - One of: withdrawn, foggy, steady, glowing, wired
 * @param {number} params.intensity - 0–100 intensity value
 * @param {number} params.durationMinutes - Target duration in minutes (5, 10, or 15)
 * @param {string[]} params.availableBlocks - Array of canonical_name strings available in DB
 * @returns {Promise<{sections: Array<{name: string, blocks: Array<{canonical_name: string}>}>}>}
 */
export async function generateAIRoutine({ polyvagalState, intensity, durationMinutes, availableBlocks, blockCount: explicitBlockCount, localHour, timezone }) {
  // Use client-computed count if provided (accounts for body scan time); fallback to 1 block/min
  const blockCount = explicitBlockCount ?? Math.round(durationMinutes)

  const timeOfDayStr = localHour != null
    ? (() => {
        if (localHour >= 5 && localHour < 12) return `morning (${localHour}:00)`
        if (localHour >= 12 && localHour < 17) return `afternoon (${localHour}:00)`
        if (localHour >= 17 && localHour < 23) return `evening (${localHour}:00)`
        return `late night (${localHour}:00)`
      })()
    : null

  const season = timezone ? getSeason(timezone) : null

  const mainMinBlocks = Math.max(1, Math.ceil(blockCount * 0.7))
  const userPrompt = `Design a ${durationMinutes}-minute somatic routine (exactly ${blockCount} exercise blocks at ~60 seconds each) for someone who feels: ${polyvagalState} at intensity
  ${intensity}/100.${timeOfDayStr ? ` It is currently ${timeOfDayStr} for this person.` : ''}${season ? ` The season is ${season}.` : ''}

Available blocks (use only these canonical names — repetition is allowed and encouraged for longer routines):
${availableBlocks.join(', ')}

You MUST include exactly ${blockCount} blocks total across warm-up, main, and integration phases. Repeat blocks as needed to reach exactly ${blockCount}.
CRITICAL CONSTRAINT: The main section must contain AT LEAST ${mainMinBlocks} blocks (≥70% of total). Warm-up: 1–2 blocks max. Integration: 1 block.
Apply polyvagal principles for the ${polyvagalState} state at intensity ${intensity}.`

  console.log('[claude] system prompt:\n', SYSTEM_PROMPT)
  console.log('[claude] user prompt:\n', userPrompt)

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    temperature: 0.7,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userPrompt }],
  })

  const rawText = response.content[0]?.text ?? ''
  // Strip markdown code fences if the model wraps the JSON despite instructions
  const cleaned = rawText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/i, '').trim()
  const parsed = JSON.parse(cleaned)

  console.log('[claude] reasoning:', parsed.reasoning ?? '(none)')

  // Validate and strip unknown canonical names
  const availableSet = new Set(availableBlocks)
  parsed.sections = parsed.sections.map(section => ({
    ...section,
    blocks: section.blocks.filter(b => availableSet.has(b.canonical_name)),
  }))

  return parsed
}
