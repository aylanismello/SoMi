# Flow Engine (v1)

This document describes the flow generation logic exactly as implemented. It does not prescribe how it should work.

There are two generation paths: **algorithmic** (default) and **AI-powered** (opt-in via `use_ai: true`). The server endpoint `POST /api/flows/generate` (`server/app/api/flows/generate/route.js`) handles both.

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
  "use_ai": false
}
```

| Field | Type | Description |
|-------|------|-------------|
| `polyvagal_state` | string | One of: `shutdown`, `restful`, `steady`, `glowing`, `wired`. Derived client-side via `deriveState(energy, safety)` |
| `duration_minutes` | number | 1-60, user-selected |
| `body_scan_start` | boolean | Whether to include opening body scan |
| `body_scan_end` | boolean | Whether to include closing body scan |
| `use_ai` | boolean | `false` = algorithmic (default), `true` = Claude AI |

### Response

```json
{
  "segments": [
    { "type": "micro_integration", "section": "warm_up", "duration_seconds": 20 },
    { "type": "somi_block", "section": "warm_up", "duration_seconds": 60, "somi_block_id": 1, "canonical_name": "vagus_reset", "name": "Vagus Reset" },
    ...
  ],
  "actual_duration_seconds": 480,
  "reasoning": "Your nervous system is..."
}
```

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

## Algorithmic Path (default)

**Code location**: `server/lib/polyvagal.js` + `server/app/api/flows/generate/route.js`

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

## AI Path (opt-in)

**Code location**: `server/lib/claude.js` -> `generateAIRoutine()`

When `use_ai: true`, the server calls Claude Haiku with the polyvagal-informed system prompt. Claude returns `sections` with block selections. The server then:

1. Normalises section names (`warm-up` -> `warm_up`)
2. Assembles segments using the same logic as the algorithmic path (micro_integration interleaving, body scan bookends)
3. Returns the same `{ segments, actual_duration_seconds, reasoning }` shape

On AI failure, falls back to the algorithmic path.

### Claude Configuration

- Model: `claude-haiku-4-5-20251001`
- Temperature: 0.7
- Max tokens: 1024
- Intensity: fixed at 50 (intensity removed from v1 request)
- Season: removed (was NH-only, now excluded)

---

## Section Labels

All section labels use underscores: `warm_up`, `main`, `integration`. A DB migration normalised existing `warm-up` entries. [VERIFIED]

---

## Client Integration

### DailyFlowSetup.js

- Calls `api.generateFlow({ polyvagal_state, duration_minutes, body_scan_start, body_scan_end, use_ai })`
- Extracts `somi_block` segments as the preview queue for the plan view
- Passes the queue to `routineStore.initializeRoutine()` for the player
- Shows `actual_duration_seconds` after generation

### SoMiRoutineScreen.js (player)

- Iterates the `hardcodedQueue` (which contains `somi_block` segments)
- Interstitials (20s) between blocks are handled by the player's existing phase logic
- Body scan bookends navigate to `BodyScanCountdown` screen
- Only `somi_block` segments are saved to `somi_chain_entries`

### Queue Modification at Runtime

Users can swap blocks from `RoutineQueuePreview` and during `SoMiRoutine` (via edit modal). Swapping replaces a block in the local queue; it does not re-call the server. [VERIFIED]
