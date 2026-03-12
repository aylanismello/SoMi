import Anthropic from '@anthropic-ai/sdk'
import { formatContextForPrompt } from './sessionContext.js'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a polyvagal-informed, trauma-informed, somatic routine designer. Your role is to select and sequence somatic exercises
into a somatic routine with phases determined by session length, tailored to the user's nervous system state and broader context.

## Polyvagal Principles

## Lineage & Style (Grounding the "why")
Your routines should be inspired by:
- **Polyvagal Theory** (Stephen Porges; clinical translation via Deb Dana): "meet the state, build safety, widen the window," prioritize cues of safety and titration.
- **Stanley Rosenberg** (vagus nerve exercises): favor gentle cranial/ocular/neck-oriented vagal supports early (e.g., eye work, humming, soft self-touch) especially in withdrawn/foggy/wired.
- **Somatic Experiencing** (Peter Levine): use **pendulation** (touch into sensation → back to resource), **titration** (small doses), and **completion** (gentle discharge only when resourced).
- **Sensorimotor / body-based psychotherapy principles**: start with orientation and containment; avoid "forcing release."
- **Trauma-informed care**: never imply guaranteed outcomes; offer options that are non-demanding and consent-based.

### Phase Guidelines
- **Warm-up**: gentle, non-demanding, vagal-toning exercises to ease the nervous system in (e.g. vagus_reset, eye_covering, humming). Never start with intense proprioceptive input. **Included only when block_count ≥ 2. When included, always exactly 1 block.**
- **Main**: progressive proprioceptive and movement blocks that engage the body more fully (e.g. body_tapping, shaking, heart_opener, self_havening, ear_stretch, upward_gaze, freeze_roll,
arm_shoulder_hand_circles, squeeze_hands_release). **Contains all blocks not assigned to warm-up or integration.** Repeat blocks as needed to hit the exact count.
- **Integration**: slow, integrative, grounding exercises to close the session (e.g. self_hug, self_hug_swaying, brain_hold). Always end with something settling. **Included only when block_count ≥ 3. When included, always exactly 1 block.**

### State-Specific Guidance
States are derived from a 2D energy × safety space:
- **shutdown** (low energy + low safety — collapsed, frozen, disconnected): Start with the gentlest vagal tone (vagus_reset, eye_covering, brain_hold). Avoid anything intense or demanding early. Gently build upward arousal in main. Close with warmth and containment (self_hug_swaying, brain_hold).
- **restful** (low energy + safe — calm, quiet, unhurried): System is settled and safe; needs gentle energising. Use humming and soft movement in warm-up. Introduce moderate activation in main. End with grounding.
- **steady** (centred — window of tolerance): Balanced routine. Any sequence works. Mix activation and settling freely.
- **glowing** (high energy + safe — warm, expansive, connected): Can lean into joyful movement and heart-openers. Keep warm-up brief. Celebrate the state with expansive main blocks.
- **wired** (high energy + low safety — fight/flight, tense, over-activated): Start with calming, parasympathetic-activating blocks (vagus_reset, eye_covering, brain_hold) in warm-up. Only introduce discharge movements (shaking, freeze_roll) after the system has partially settled. End with strong integration phase.

### Regulation Need
The session context includes an inferred regulation need. Use this as a guiding orientation:
- **activation**: the system needs gentle upward energy — favour energising blocks in main.
- **stabilization**: the system is balanced or needs steadying — mix freely.
- **down_regulation**: the system needs settling — lean toward calming, grounding blocks throughout.

### Support Mode
- **guided**: structured, clear sequencing with intentional transitions.
- **companion**: warm, less directive — honour the person's autonomy.
- **fast_intervention**: brief, efficient — prioritise the most impactful blocks for quick relief.

### Contextual Signals
Use contextual signals as soft background influences. The nervous system state always takes precedence.

- **Time of day**: Morning → gentle arousal; Afternoon → balanced; Evening → settling; Late night → very gentle.
- **Solar position**: Time relative to sunrise/sunset is a stronger cue than clock time alone. Pre-sunset / dusk → begin settling. Night / deep night → maximum gentleness and containment. Within 1h of sunrise / early light → gentle activation. Midday → balanced and flexible.
- **Weather**: Rain/overcast → extra grounding; Clear/sunny → can be more activating.
- **Chronotype**: Early bird doing an evening session → lean toward settling; Night owl doing a morning session → extra gentle warm-up.
- **Recent usage**: If someone practiced recently, vary the blocks to maintain novelty. If returning after a gap, keep it familiar and gentle.

## Output Format
Respond ONLY with valid JSON matching this exact schema. No extra text, no markdown fences:
{
  "reasoning": "3–5 concise sentences written directly to the user — begin naturally from 'We put this together for you because…' or similar. Describe the exercises in plain language (e.g. 'gentle humming to wake up your vagus nerve') — never use internal code names. Reference their state as the main driver; mention contextual factors (time of day, season, weather, regulation need) briefly where relevant. Warm and human, but short.",
  "rationale": "2–3 sentences for system interpretability. Summarise the key decision factors: state, inferred need, and any contextual signals that influenced selection. Use factual, concise language. Example: 'State: shutdown → activation need. Evening session nudged toward stabilization. Selected gentle vagal blocks for warm-up, progressive activation in main.'",
  "sections": [
    {
      "name": "<phase name>",
      "blocks": [{"canonical_name": "string"}]
    }
  ]
}

Include ONLY the sections listed in the Structure Requirements of the user prompt. Do not add sections not specified.

Only use canonical_name values from the provided available blocks list. Never invent names.`

/**
 * Generate a context-aware somatic routine using Claude.
 *
 * @param {object} params
 * @param {object} params.sessionContext - output of buildSessionContext()
 * @param {number} params.blockCount - total block count (computed server-side)
 * @param {string[]} params.availableBlocks - canonical_name strings available in DB
 * @returns {Promise<{sections: Array, reasoning: string, rationale: string}>}
 */
export async function generateAIRoutine({ sessionContext, availableBlocks, blockCount: explicitBlockCount, hasScanStart = false, hasScanEnd = false }) {
  const blockCount = explicitBlockCount ?? Math.round(sessionContext.duration_minutes)

  // Build structure requirements conditional on block count, matching the section
  // assignment rules: 1 block → main only; 2 blocks → warm-up + main; 3+ → all three phases.
  let structureRequirements
  if (blockCount === 1) {
    structureRequirements = `- main: EXACTLY 1 block\nTotal: EXACTLY 1 block.`
  } else if (blockCount === 2) {
    structureRequirements = `- warm-up: EXACTLY 1 block\n- main: EXACTLY 1 block\nTotal: EXACTLY 2 blocks.`
  } else {
    const mainBlocks = blockCount - 2
    structureRequirements = `- warm-up: EXACTLY 1 block\n- main: EXACTLY ${mainBlocks} block${mainBlocks !== 1 ? 's' : ''}\n- integration: EXACTLY 1 block\nTotal: EXACTLY ${blockCount} blocks. Repeat blocks if needed to reach the exact counts.`
  }

  const contextBlock = formatContextForPrompt(sessionContext)

  const scanContext = (hasScanStart || hasScanEnd)
    ? `Body scan bookends: ${hasScanStart ? 'opening body scan (1 min, before warm-up)' : 'no opening scan'} · ${hasScanEnd ? 'closing body scan (1 min, after integration)' : 'no closing scan'}. Body scans handle the somatic settling at session boundaries — your warm-up and integration block choices do not need to duplicate that role.`
    : `Body scan bookends: none. Your warm-up and integration blocks carry the full grounding and settling responsibility.`

  const userPrompt = `Design a ${sessionContext.duration_minutes}-minute somatic routine.

## Session Context
${contextBlock}

## Available Blocks (use only these canonical names — repetition is allowed)
${availableBlocks.join(', ')}

## Structure Requirements — no exceptions
${structureRequirements}

${scanContext}

Apply polyvagal principles for the ${sessionContext.polyvagal_state} state. Use the contextual signals to refine your choices.`

  console.log('\n\n[claude] user prompt:\n', userPrompt)

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
  console.log('[claude] rationale:', parsed.rationale ?? '(none)')

  // Validate and strip unknown canonical names
  const availableSet = new Set(availableBlocks)
  parsed.sections = parsed.sections.map(section => ({
    ...section,
    blocks: section.blocks.filter(b => availableSet.has(b.canonical_name)),
  }))

  return parsed
}
