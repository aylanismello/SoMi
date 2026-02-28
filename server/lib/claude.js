import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })


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
- **Warm-up**: gentle, non-demanding, vagal-toning exercises to ease the nervous system in (e.g. vagus_reset, eye_covering, humming). Never start with intense proprioceptive input. **ALWAYS exactly 1 block — never more, never less.**
- **Main**: progressive proprioceptive and movement blocks that engage the body more fully (e.g. body_tapping, shaking, heart_opener, self_havening, ear_stretch, upward_gaze, freeze_roll,
arm_shoulder_hand_circles, squeeze_hands_release). **Contains ALL remaining blocks after assigning 1 warm-up and 1 integration.** Repeat blocks as needed to hit the exact count.
- **Integration**: slow, integrative, grounding exercises to close the session (e.g. self_hug, self_hug_swaying, brain_hold). Always end with something settling. **ALWAYS exactly 1 block — never more, never less.**

### State-Specific Guidance
States are derived from a 2D energy × safety space:
- **shutdown** (low energy + low safety — collapsed, frozen, disconnected): Start with the gentlest vagal tone (vagus_reset, eye_covering, brain_hold). Avoid anything intense or demanding early. Gently build upward arousal in main. Close with warmth and containment (self_hug_swaying, brain_hold).
- **restful** (low energy + safe — calm, quiet, unhurried): System is settled and safe; needs gentle energising. Use humming and soft movement in warm-up. Introduce moderate activation in main. End with grounding.
- **steady** (centred — window of tolerance): Balanced routine. Any sequence works. Mix activation and settling freely.
- **glowing** (high energy + safe — warm, expansive, connected): Can lean into joyful movement and heart-openers. Keep warm-up brief. Celebrate the state with expansive main blocks.
- **wired** (high energy + low safety — fight/flight, tense, over-activated): Start with calming, parasympathetic-activating blocks (vagus_reset, eye_covering, brain_hold) in warm-up. Only introduce discharge movements (shaking, freeze_roll) after the system has partially settled. End with strong integration phase.

### Intensity Scaling
Intensity affects which blocks you choose within each fixed phase, not the phase sizes (those are always exactly 1 warm-up + N main + 1 integration):
- **Low intensity (0-33)**: Prefer gentler blocks across all phases.
- **Medium intensity (34-66)**: Balanced block selection.
- **High intensity (67-100)**: Lean toward more activating blocks in main.

### Time of Day
Use time of day as a soft background signal — the nervous system state and intensity always take precedence.

- **Morning (5–11)**: Lean toward gentle arousal and orientation. Build gradually.
- **Afternoon (12–16)**: Balanced. Use whatever serves the state.
- **Evening (17–22)**: Lean toward settling. Avoid highly activating main blocks; close with grounding.
- **Late night (23–4)**: Keep everything gentle and integrative. Prioritise self_hug, brain_hold, eye_covering.

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
export async function generateAIRoutine({ polyvagalState, intensity, durationMinutes, availableBlocks, blockCount: explicitBlockCount, localHour }) {
  // Use client-computed count if provided (accounts for body scan time); fallback to 1 block/min
  const blockCount = explicitBlockCount ?? Math.round(durationMinutes)

  // Always 1 warm-up + 1 integration; main gets the rest.
  // For short sessions (blockCount ≤ 2) guarantee at least 1 main block.
  const mainBlocks = Math.max(1, blockCount - 2)
  const effectiveBlockCount = mainBlocks + 2  // 1 warm-up + mainBlocks + 1 integration

  const timeOfDayStr = localHour != null
    ? (() => {
        if (localHour >= 5 && localHour < 12) return `morning (${localHour}:00)`
        if (localHour >= 12 && localHour < 17) return `afternoon (${localHour}:00)`
        if (localHour >= 17 && localHour < 23) return `evening (${localHour}:00)`
        return `late night (${localHour}:00)`
      })()
    : null

  const userPrompt = `Design a ${durationMinutes}-minute somatic routine for someone who feels: ${polyvagalState} at intensity ${intensity}/100.${timeOfDayStr ? ` It is currently ${timeOfDayStr} for this person.` : ''}

Available blocks (use only these canonical names — repetition is allowed):
${availableBlocks.join(', ')}

EXACT STRUCTURE REQUIRED — no exceptions:
- warm-up: EXACTLY 1 block
- main: EXACTLY ${mainBlocks} block${mainBlocks !== 1 ? 's' : ''}
- integration: EXACTLY 1 block
Total: EXACTLY ${effectiveBlockCount} blocks. Repeat blocks if needed to reach the exact counts.
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
