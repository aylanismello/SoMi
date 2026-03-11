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
