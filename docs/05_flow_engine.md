# Flow Engine (v2 — context-aware)

This document describes the flow generation logic exactly as implemented. It does not prescribe how it should work.

The engine uses a **context-aware generation path** by default. It calls Claude with a structured session context derived from the user's nervous system state plus optional contextual signals. An **algorithmic fallback** path is preserved in code and activates automatically if the context-aware path fails.

---

## Endpoint

**`POST /api/flows/generate`**

### Request Body

```json
{
  "polyvagal_state": "restful",
  "duration_minutes": 10,
  "body_scan_start": false,
  "body_scan_end": false,
  "local_hour": 14,
  "timezone": "America/New_York"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `polyvagal_state` | string | yes | One of: `shutdown`, `restful`, `steady`, `glowing`, `wired`. Derived client-side via `deriveState(energy, safety)` |
| `duration_minutes` | number | yes | 1-60, user-selected |
| `body_scan_start` | boolean | no | Whether to include opening body scan (default false) |
| `body_scan_end` | boolean | no | Whether to include closing body scan (default false) |
| `local_hour` | number | no | 0–23, client's local hour |
| `timezone` | string | no | IANA timezone string |
| `chronotype` | string | no | `early_bird`, `night_owl`, or `flexible` |
| `sleep_wake_notes` | string | no | Freeform notes about sleep/wake pattern |
| `weather` | string | no | Freeform weather descriptor (e.g. "rainy, 12°C") |
| `season_override` | string | no | `spring`, `summer`, `autumn`, or `winter` |
| `inferred_need` | string | no | `activation`, `stabilization`, or `down_regulation` |
| `support_mode` | string | no | `guided`, `companion`, or `fast_intervention` |
| `recent_usage_summary` | string | no | Freeform recent usage context |
| `use_ai` | boolean | no | Accepted for backward compat but ignored (context-aware is always on) |

### Response

```json
{
  "segments": [
    { "type": "micro_integration", "section": "warm_up", "duration_seconds": 20 },
    { "type": "somi_block", "section": "warm_up", "duration_seconds": 60, "somi_block_id": 1, "canonical_name": "vagus_reset", "name": "Vagus Reset" }
  ],
  "actual_duration_seconds": 480,
  "reasoning": "We put this together for you because...",
  "rationale": "State: shutdown → activation need. Evening session nudged toward stabilization."
}
```

| Field | Description |
|-------|-------------|
| `reasoning` | User-facing explanation of why this flow was assembled |
| `rationale` | System-facing decision summary for debugging/interpretability |

### Segment Types

| Type | Description |
|------|-------------|
| `somi_block` | 60s exercise video — maps to `somi_blocks` row |
| `micro_integration` | 20s interstitial (breathing cue, body awareness prompt) |
| `body_scan` | 60s guided body scan (only when `duration_minutes >= 8` and user opted in) |

---

## Block Count Computation (server-side)

```
body_scan_enabled = duration_minutes >= 8
body_scan_seconds = body_scan_enabled ? (body_scan_start ? 60 : 0) + (body_scan_end ? 60 : 0) : 0
remaining = (duration_minutes * 60) - body_scan_seconds
block_count = max(1, floor(remaining / 80))
```

Each block occupies 80s: 60s video + 20s micro-integration. [VERIFIED]

---

## Session Context Model

**Code location**: `server/lib/sessionContext.js`

The server builds a structured session context from the request body using `buildSessionContext()`. This context separates:

- **Hard context** (always present): `polyvagal_state`, `duration_minutes`
- **Time context**: time of day (classified as morning/afternoon/evening/late_night), timezone, season
- **Body/rhythm context**: chronotype, sleep/wake notes
- **Environment**: weather
- **Regulation context**: inferred need (activation/stabilization/down_regulation), support mode
- **Usage history**: recent usage summary

The inferred regulation need is derived from the polyvagal state and time of day, unless explicitly overridden by the client. Evening/late-night sessions nudge the need toward settling.

The context is formatted into a human-readable block by `formatContextForPrompt()` and injected into the Claude user prompt.

---

## Context-Aware Path (default)

**Code location**: `server/lib/claude.js` → `generateAIRoutine()`, `server/lib/sessionContext.js`

The server calls Claude Haiku with a polyvagal-informed system prompt that includes guidance for:
- State-specific block selection
- Regulation need orientation (activation / stabilization / down-regulation)
- Support mode (guided / companion / fast-intervention)
- Contextual signals (time of day, season, weather, chronotype, recent usage)

Claude returns `{ sections, reasoning, rationale }`. The server then:
1. Normalises section names (`warm-up` → `warm_up`)
2. Assembles segments using the same logic as the algorithmic path (micro_integration interleaving, body scan bookends)
3. Returns `{ segments, actual_duration_seconds, reasoning, rationale }`

On failure, falls back to the algorithmic path.

### Claude Configuration

- Model: `claude-haiku-4-5-20251001`
- Temperature: 0.7
- Max tokens: 1024

---

## Algorithmic Path (fallback)

**Code location**: `server/lib/polyvagal.js` + `server/app/api/flows/generate/route.js`

The algorithmic path is preserved in code as a fallback. Its active wiring in the route handler is commented out. It activates automatically if the context-aware path throws an error.

### Steps

1. **Filter** all active `vagal_toning` blocks by `polyvagal_state` using `filterBlocksByState()`
2. **Select** `block_count` blocks using shuffle-without-replacement (no adjacent repeats)
3. **Assign sections** by position:
   - 1 block: all `main`
   - 2 blocks: `warm_up`, `main`
   - 3+ blocks: first = `warm_up`, last = `integration`, middle = `main`
4. **Assemble segments**: for each block, prepend a `micro_integration` segment. Optionally wrap with `body_scan` bookends.
5. **Generate explanation**: deterministic template from state + block names

### State Filtering

| State | Filter |
|-------|--------|
| shutdown | `energy_delta >= 0` AND `safety_delta >= 0` |
| restful | `energy_delta > 0` |
| wired | `safety_delta > 0` |
| glowing | `safety_delta >= 0` |
| steady | All blocks (no filter) |

Falls back to full pool if no blocks match. [VERIFIED]

---

## Section Labels

All section labels use underscores: `warm_up`, `main`, `integration`. [VERIFIED]

---

## Client Integration

### DailyFlowSetup.js

- Calls `api.generateFlow({ polyvagal_state, duration_minutes, body_scan_start, body_scan_end, local_hour, timezone })`
- Sends `local_hour` and `timezone` from the device for time-of-day context
- Extracts `somi_block` segments as the preview queue for the plan view
- Passes the queue to `routineStore.initializeRoutine()` for the player
- Shows `actual_duration_seconds` after generation
- No mode switch — context-aware generation is the only path

### SoMiRoutineScreen.js (player)

- Iterates the `hardcodedQueue` (which contains `somi_block` segments)
- Interstitials (20s) between blocks are handled by the player's existing phase logic
- Body scan bookends navigate to `BodyScanCountdown` screen
- Only `somi_block` segments are saved to `somi_chain_entries`

### Queue Modification at Runtime

Users can swap blocks from `RoutineQueuePreview` and during `SoMiRoutine` (via edit modal). Swapping replaces a block in the local queue; it does not re-call the server. [VERIFIED]

---

## Body Scan Toggles

### Availability

Body scan toggles are shown in `FlowInit` only when `duration_minutes >= 8`. Below that threshold, the server sets `body_scan_enabled = false` and no scan segments are produced regardless of toggle state.

### Time-budget math

Each scan = 60s. Freed time from disabling a scan may or may not yield +1 block depending on the current floor-division remainder:

| Duration | Both ON | Start OFF | End OFF | Both OFF |
|----------|---------|-----------|---------|----------|
| 8 min    | 4 blocks | 5 (+1) | 5 (+1) | 6 (+2) |
| 9 min    | 5 blocks | 6 (+1) | 6 (+1) | 6 (+1 total) |
| 10 min   | 6 blocks | 6 (same) | 6 (same) | 7 (+1 total) |
| 15 min   | 9 blocks | 10 (+1) | 10 (+1) | 11 (+2) |

The 10-min case yielding no change from a single toggle is mathematically correct, not a bug.

### UI behaviour

Both toggles appear as a "Body Scans" section inline in `FlowInit`'s `ScrollView` when `showBodyScanToggles` is `true`. Toggling either switch triggers `handleToggleBodyScanStart`/`handleToggleBodyScanEnd`, which update the `settingsStore` and call `doGeneratePreview` with the new values.

If a toggle fires while the initial generation is in progress (`isReadyForInputRef.current = false`) or during a subsequent generation (`isGenerating = true`), the store is updated immediately and `pendingRegenRef.current = true`. The `doGeneratePreview` `finally` block checks this flag on completion and fires a follow-up generation with the latest store values.

Rapid toggle flips collapse into a single re-generation using the final state.

### AI behaviour

`hasScanStart` and `hasScanEnd` booleans (derived as `body_scan_enabled && body_scan_start/end`) are passed to `generateAIRoutine()` in `server/lib/claude.js`. A `scanContext` string is injected into the Claude user prompt:

- **Scans present**: AI is told that body scans handle somatic settling at boundaries; warm-up and integration blocks should not duplicate that role.
- **No scans**: AI is told that warm-up and integration blocks carry the full grounding and settling responsibility. [VERIFIED]

---

## Addendum — 2026-03-11: Short-session block count fix + duration display fix

### Bug 1: AI over-allocating blocks for short sessions

**What was wrong:** `generateAIRoutine()` in `server/lib/claude.js` used `Math.max(1, blockCount - 2)` to compute `mainBlocks`, which forced a minimum of 3 total blocks (1 warm-up + 1 main + 1 integration) regardless of `block_count`. A 3-minute session computes `block_count = 2` server-side, but the AI was being asked for 3 blocks = 240s — over budget.

**What changed:** The prompt structure is now conditional on `block_count`, matching the section assignment rules already documented in the Algorithmic Path:

| block_count | Sections sent to Claude |
|---|---|
| 1 | main only |
| 2 | warm-up + main |
| 3+ | warm-up + main + integration |

The system prompt phase guidelines were updated to reflect that warm-up is included only when `block_count ≥ 2` and integration only when `block_count ≥ 3`. The JSON schema in the system prompt now instructs Claude to include only the sections listed in the user prompt's Structure Requirements.

**Files changed:** `server/lib/claude.js`

---

### Bug 2: Duration display mismatch between FlowInit and EditFlowScreen

**What was wrong:** `EditFlowScreen.js` computed `displayMin` by summing only `somi_block` durations (60s each), ignoring `micro_integration` (20s each) and `body_scan` (60s each) segments. `FlowInit.js` displayed `actual_duration_seconds` from the server, which includes all segment types. For a 7-block session: EditFlow showed `Math.ceil(420/60) = 7 min`; FlowInit showed `Math.ceil(560/60) = 10 min`.

**What changed:** `totalSecs` now sums all segments in the array, matching the server's `actual_duration_seconds` formula.

**Files changed:** `mobile/components/Flow/EditFlowScreen.js` (line 45: `queue.reduce` → `segments.reduce`)
