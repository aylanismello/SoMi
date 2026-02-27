# Routine Engine

This document describes the routine generation logic exactly as implemented. It does not prescribe how it should work.

There are two generation paths: **AI-powered** (Claude Haiku) and **hardcoded fallback**. The server endpoint `POST /api/routines/generate` (`server/app/api/routines/generate/route.js`) decides which path to use.

---

## Path Selection

```
if polyvagalState is provided OR blockCount > 10:
    → AI path (with fallback to hardcoded on failure)
else:
    → Hardcoded path
```

In practice, the mobile client (`DailyFlowSetup.js`) always sends `polyvagalState`, so the AI path is the default for daily flows. [VERIFIED]

---

## AI Path

**Code location**: `server/lib/claude.js` → `generateAIRoutine()`

### Inputs

| Parameter | Source | Description |
|-----------|--------|-------------|
| `polyvagalState` | Derived client-side via `deriveState(energy, safety)` | One of: `shutdown`, `restful`, `steady`, `glowing`, `wired` |
| `intensity` | Derived client-side via `deriveIntensity(energy, safety)` | 0-100, distance from center of energy×safety space |
| `durationMinutes` | User-selected (1-60, default 10) | Target session length |
| `blockCount` | Client-computed (see formula below) | Number of exercise blocks |
| `localHour` | Client's current hour (0-23) | For time-of-day context |
| `timezone` | Client's IANA timezone | For season derivation |
| `availableBlocks` | Fetched from `somi_blocks` WHERE `active=true` AND `block_type='vagal_toning'` | Canonical names of all eligible blocks |

### Block Count Formula (client-side, in `DailyFlowSetup.js`)

```
totalSeconds = durationMinutes * 60
bodyScanSeconds = (bodyScanStart ? 60 : 0) + (bodyScanEnd ? 60 : 0)
exerciseTime = totalSeconds - bodyScanSeconds
blockCount = max(1, round((exerciseTime + 20) / 80))
```

Rationale: approximately 80 seconds per block (60s video + 20s interstitial). [VERIFIED]

### Processing (server-side)

1. **Phase sizing**: `mainBlocks = max(1, blockCount - 2)`, effective total = mainBlocks + 2 (1 warm-up + N main + 1 integration)
2. **Time of day**: Maps `localHour` to morning/afternoon/evening/late night
3. **Season**: Derives from timezone (northern hemisphere assumed; southern hemisphere gets wrong season — noted in code comment) [VERIFIED]
4. **Claude API call**:
   - Model: `claude-haiku-4-5-20251001`
   - Temperature: 0.7
   - Max tokens: 1024
   - System prompt: polyvagal-informed somatic routine designer with phase guidelines, state-specific guidance, intensity scaling, time-of-day rules
   - User prompt: includes state, intensity, time, season, available block names, exact structure requirement
5. **Response parsing**: Strips markdown fences, parses JSON, filters out any canonical names not in `availableBlocks`

### Output Structure

```json
{
  "reasoning": "4-5 sentence explanation written to the user",
  "sections": [
    { "name": "warm-up", "blocks": [{"canonical_name": "..."}] },
    { "name": "main", "blocks": [{"canonical_name": "..."}, ...] },
    { "name": "integration", "blocks": [{"canonical_name": "..."}] }
  ]
}
```

The server flattens sections into a `queue` array with full block metadata (id, name, url, deltas, section label, order index) by joining against `somi_blocks`. [VERIFIED]

### State-Specific Guidance (from system prompt)

| State | Warm-up | Main | Integration |
|-------|---------|------|-------------|
| shutdown | Gentlest vagal tone (vagus_reset, eye_covering, brain_hold) | Gently build upward arousal | Warmth and containment (self_hug_swaying, brain_hold) |
| restful | Humming and soft movement | Moderate activation | Grounding |
| steady | Any sequence | Mix activation and settling freely | Any settling block |
| glowing | Brief, can be expressive | Joyful movement, heart-openers | Grounding |
| wired | Calming parasympathetic blocks (vagus_reset, eye_covering, brain_hold) | Discharge movements only after settling | Strong integration |

### Intensity Scaling

- Low (0-33): Gentler blocks across all phases
- Medium (34-66): Balanced
- High (67-100): More activating blocks in main

### Error Handling

If the AI call fails (network error, parse error, etc.), the server falls through to the hardcoded path. [VERIFIED — try/catch in route.js]

---

## Hardcoded Fallback Path

**Code location**: `server/lib/routines.js` → `getRoutineConfig()` (also duplicated in `mobile/services/routineConfig.js`)

### Inputs

| Parameter | Description |
|-----------|-------------|
| `routineType` | `morning` or `night` |
| `blockCount` | Must be exactly 2, 6, or 10 |

If `durationMinutes` is provided instead of `blockCount`, the mapping is: 5→2, 10→6, 15→10, 20→10. [VERIFIED]

If `routineType` is not provided, it is auto-selected by time of day: 5am-6pm → morning, 6pm-5am → night. [VERIFIED]

### Fixed Sequences

#### Morning
| Blocks | Sequence |
|--------|----------|
| 2 | vagus_reset → arm_shoulder_hand_circles |
| 6 | vagus_reset → heart_opener → self_havening → body_tapping → freeze_roll → arm_shoulder_hand_circles |
| 10 | vagus_reset → heart_opener → upward_gaze → self_havening → humming → ear_stretch → body_tapping → shaking → freeze_roll → arm_shoulder_hand_circles |

#### Night
| Blocks | Sequence |
|--------|----------|
| 2 | eye_covering → self_hug_swaying |
| 6 | eye_covering → self_havening → humming → brain_hold → squeeze_hands_release → self_hug_swaying |
| 10 | vagus_reset_lying_down → eye_covering → upward_gaze → self_havening → humming → ear_stretch → brain_hold → body_tapping → squeeze_hands_release → self_hug_swaying |

### Output

Same `queue` format as AI path, but without `section` labels or `reasoning`. [VERIFIED]

---

## Client-Side Video Selection Algorithm

**Code location**: `mobile/services/videoSelectionAlgorithm.js`

This is a separate selection mechanism used for individual block selection outside of full routine generation (e.g., single-block plays, SOS). It is **not** used in the daily flow — the daily flow uses the server-generated queue. [INFERRED from code usage patterns]

### Functions

- `selectNextVideo(blocks, polyvagalState, sliderValue)` — random pick from state-filtered pool
- `selectSOSVideo(blocks)` — returns `vagus_reset_lying_down`
- `selectRoutineVideo(blocks, polyvagalState, previousBlockId)` — random with repeat avoidance

### State Filtering

| State | Filter criteria |
|-------|----------------|
| shutdown | `energy_delta >= 0` AND `safety_delta >= 0` |
| restful | `energy_delta > 0` |
| wired | `safety_delta > 0` |
| glowing | `safety_delta >= 0` |
| steady | All blocks (no filter) |

Falls back to unfiltered pool if no blocks match. [VERIFIED]

---

## Queue Modification at Runtime

Users can swap blocks in the queue from `RoutineQueuePreview` and during `SoMiRoutine` (via edit modal). The library modal shows all `vagal_toning` blocks. Swapping replaces a block in the local queue array; it does not re-call the server. [VERIFIED]

---

## Body Scan Bookends

Body scans (1 minute each) are optionally prepended/appended to the block queue by the client (`DailyFlowSetup.js`), controlled by `settingsStore.bodyScanStart` and `settingsStore.bodyScanEnd`. They use a hardcoded `BODY_SCAN_BLOCK_ID = 20`. The body scan is not part of the server-generated routine. [VERIFIED]
