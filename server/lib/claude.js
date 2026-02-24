import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

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
- **Warm-up**: gentle, non-demanding, vagal-toning exercises to ease the nervous system in (e.g. vagus_reset, eye_covering, humming). Never start with intense proprioceptive input.
- **Main**: progressive proprioceptive and movement blocks that engage the body more fully (e.g. body_tapping, shaking, heart_opener, self_havening, ear_stretch, upward_gaze, freeze_roll, 
arm_shoulder_hand_circles, squeeze_hands_release).
- **Integration**: slow, integrative, grounding exercises to close the session (e.g. self_hug, self_hug_swaying, brain_hold). Always end with something settling.

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
- **Morning (5–11)**: Favour gentle arousal and orientation — help the nervous system wake up gradually. Prioritise vagal toning, humming, and upward-gaze in warm-up; can build to activating main blocks.
- **Afternoon (12–16)**: Balanced. The nervous system is typically mid-range; use whatever serves the state and intensity.
- **Evening (17–22)**: Favour settling and parasympathetic activation throughout. Avoid highly activating blocks in main; emphasise grounding, self-touch, and containment in integration.
- **Late night (23–4)**: Strongly parasympathetic. Keep everything gentle and integrative. Prioritise self_hug, brain_hold, eye_covering.

## Output Format
Respond ONLY with valid JSON matching this exact schema. No extra text, no markdown fences:
{
  "reasoning": "2-3 sentence explanation of why you chose these blocks and this order given the state and intensity",
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

  const timeOfDayStr = localHour != null
    ? (() => {
        if (localHour >= 5 && localHour < 12) return `morning (${localHour}:00)`
        if (localHour >= 12 && localHour < 17) return `afternoon (${localHour}:00)`
        if (localHour >= 17 && localHour < 23) return `evening (${localHour}:00)`
        return `late night (${localHour}:00)`
      })()
    : null

  const userPrompt = `Design a ${durationMinutes}-minute somatic routine (exactly ${blockCount} exercise blocks at ~60 seconds each) for someone who feels: ${polyvagalState} at intensity 
  ${intensity}/100.${timeOfDayStr ? ` It is currently ${timeOfDayStr} for this person — let time of day subtely inform the energy and settling arc of the routine.` : ''}

Available blocks (use only these canonical names — repetition is allowed and encouraged for longer routines):
${availableBlocks.join(', ')}

You MUST include exactly ${blockCount} blocks total across warm-up, main, and cool-down phases. Repeat blocks as needed to reach exactly ${blockCount}. 
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
