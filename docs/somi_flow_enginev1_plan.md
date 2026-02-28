# SoMi Flow Engine v1 — Implementation Plan

References: `docs/somi_flow_enginev1.md` (design spec)

---

## What's Actually Changing

A summary of the delta between current code and v1.

| Dimension | Current | v1 |
|---|---|---|
| Block count computation | Client-side, sent to server | Server-side, derived from `duration_minutes` |
| Default generation path | AI (Claude Haiku) always | Deterministic (state filter + random) |
| Micro-integration interstitials | Client handles (not in server response) | Server includes in `segments` array as `type: "micro_integration"` |
| Body scan bookends | Client-managed, not sent to server | Server inputs `body_scan_start`/`body_scan_end`, injects segments |
| Response shape | `{ queue: [...blocks] }` | `{ segments: [...all segments], actual_duration_seconds }` |
| Section assignment | AI assigns; missing in hardcoded path | Backend assigns via hard rules every time |
| `deriveState` logic | Client-only | Stays client-only — client sends derived `polyvagal_state` string |
| AI path | Always-on default | Opt-in via `use_ai: true` flag |

---

## Scope

### Out of scope for v1
- Variable block lengths (all blocks remain 60s)
- Curated ordering within state-filtered pool (random is fine)
- Any changes to `somi_chain_entries` schema
- Any changes to `embodiment_checks`
- Any UI changes beyond adapting to the new response shape

---

## Terminology

Everywhere the code says "routine" it should say "flow". This affects:
- `generateRoutine` → `generateFlow` in `services/api.js`
- `POST /api/routines/generate` → `/api/flows/generate` (breaking URL change — flag for coordinated deploy)
- `docs/05_routine_engine.md` → rename to `docs/05_flow_engine.md`
- `server/lib/routines.js` → already being deleted, irrelevant

**DB note:** `somi_chains.flow_type` already uses `'daily_flow'` and `'quick_routine'`. The `'quick_routine'` value is stale terminology and potentially a stale concept entirely — see Q6 below.

---

## Backend Changes

### 1. Block selection helper

`deriveState` stays on the client — it's already there for UI purposes and duplicating it server-side adds maintenance overhead with no meaningful gain. The client derives `polyvagal_state` locally and sends the string in the request body, exactly as it does today.

The server only needs the filter logic, which has no client equivalent. Create `server/lib/polyvagal.js`:

```js
export function filterBlocksByState(blocks, state) {
  const filters = {
    shutdown: b => b.energy_delta >= 0 && b.safety_delta >= 0,
    restful:  b => b.energy_delta > 0,
    wired:    b => b.safety_delta > 0,
    glowing:  b => b.safety_delta >= 0,
    steady:   () => true,
  }
  const filtered = blocks.filter(filters[state] ?? (() => true))
  return filtered.length > 0 ? filtered : blocks   // fallback to full pool
}
```

Random selection from filtered pool, no repeat on adjacent blocks (same logic as existing `videoSelectionAlgorithm.js`).

### 2. Rewrite `POST /api/flows/generate`

**New request body:**
```json
{
  "polyvagal_state": "restful",
  "duration_minutes": 1–60,
  "body_scan_start": false,
  "body_scan_end": false,
  "use_ai": false
}
```

Both paths — algorithmic and AI — receive exactly these fields and nothing else. `intensity`, `localHour`, and `timezone` are gone.

**New response:**
```json
{
  "segments": [...],
  "actual_duration_seconds": 480
}
```

**Algorithm (server-side):**

```
1. polyvagal_state arrives in request body (derived client-side)

2. body_scan_enabled = duration_minutes >= 8
   body_scan_seconds = body_scan_enabled
     ? (body_scan_start ? 60 : 0) + (body_scan_end ? 60 : 0)
     : 0
   remaining = (duration_minutes * 60) - body_scan_seconds
   block_count = max(1, floor(remaining / 80))

3. Fetch all active vagal_toning blocks from somi_blocks
   Filter by polyvagal_state
   Randomly select block_count blocks (no adjacent repeat)

4. Assign a section label to each selected block by its position i (0-indexed
   in the selected blocks list — not the segments array):

   block_count == 1 → selected[0].section = "main"
   block_count == 2 → selected[0].section = "warm_up"
                      selected[1].section = "main"
   block_count >= 3 → selected[0].section = "warm_up"
                      selected[1..N-2].section = "main"
                      selected[N-1].section = "integration"

   The micro_integration segment that precedes each somi_block inherits that block's section.

5. Assemble the segments array (this is what gets returned to the client):

   if body_scan_start:
     push { type: "body_scan",        section: "warm_up",        duration_seconds: 60 }

   for each selected block at position i:
     push { type: "micro_integration", section: selected[i].section, duration_seconds: 20 }
     push { type: "somi_block",        section: selected[i].section, duration_seconds: 60, ...block_fields }

   if body_scan_end:
     push { type: "body_scan",        section: "integration",    duration_seconds: 60 }

6. actual_duration_seconds = body_scan_seconds + (block_count * 80)
```

**Concrete example — block_count = 1 (e.g. 1–2 min budget):**
```
segments[0]  { type: "micro_integration", section: "main", duration_seconds: 20 }
segments[1]  { type: "somi_block",        section: "main", duration_seconds: 60, id: ..., ... }
```

**Concrete example — block_count = 3 (e.g. 4 min budget):**
```
segments[0]  { type: "micro_integration", section: "warm_up",     duration_seconds: 20 }
segments[1]  { type: "somi_block",        section: "warm_up",     duration_seconds: 60, ... }
segments[2]  { type: "micro_integration", section: "main",        duration_seconds: 20 }
segments[3]  { type: "somi_block",        section: "main",        duration_seconds: 60, ... }
segments[4]  { type: "micro_integration", section: "integration", duration_seconds: 20 }
segments[5]  { type: "somi_block",        section: "integration", duration_seconds: 60, ... }
```

If `use_ai: true`, run the existing Claude path unchanged and adapt its output to the new `segments` shape using the same assembly logic in step 5.

### 3. Delete `server/lib/routines.js` (hardcoded sequences)

The fixed morning/night sequences become unreachable after this change. Delete the file and the `getRoutineConfig` import in the route handler.

---

## Frontend Changes

### 4. Update `services/api.js` — `generateFlow` method

Rename and change signature from:
```js
generateRoutine(routineType, blockCount, aiParams)
```
To:
```js
generateFlow({ polyvagal_state, duration_minutes, body_scan_start, body_scan_end, use_ai })
```

### 5. Update `DailyFlowSetup.js`

**Remove:**
- `computeBlockCount` function (server now owns this)
- Client-side `blockCount` state and all references to it
- Sending `routineType`, `blockCount` to server
- `getAutoRoutineType` import — dead code after this change (no more morning/night routing)
- `deriveIntensity` call — intensity is gone from the app entirely

**Keep:**
- `deriveState` — still needed for local UI display (state emoji, zone label, picker colouring), and `polyvagal_state` is sent directly
- `bodyScanStart` / `bodyScanEnd` state — now actually sent to server

**Change:**
- `generateFlow` call → new signature, send `polyvagal_state` only (no intensity)
- `selectedMinutes < 8` → hide body scan toggles (enforce threshold in UI)
- Adapt plan-view rendering to iterate `segments` instead of `queue`, grouping by `section`
  - Skip rendering `micro_integration` segments in the plan view (they're implied)
  - Show `body_scan` segments as the lock emoji item

**Show actual duration:**
After generation, display `formatDuration(actual_duration_seconds)` rather than the picker value. Only show the picker value before generation.

### 6. Update the player / flow runner

The player currently iterates a flat list of video blocks. With v1 it receives a `segments` array containing three types.

- `somi_block` → play video, same as current
- `micro_integration` → show 20s interstitial screen (countdown, breathing cue, etc.) — `micro_integration` is the code type; UX label is the designer's call
- `body_scan` → show 60s guided timer screen

**Decision needed (Q1 below):** Does a `body_scan` segment need a custom screen, or does it reuse the micro_integration timer with a different label/duration?

### 7. Update `saveChainEntry` calls in `chainService`

Currently called once per video block. With v1, only `somi_block` segments map to `somi_chain_entries` rows — `micro_integration` and `body_scan` are ephemeral. The `section` field to save is already on each segment.

---

## Implementation Order

**Server**
1. ✅ `server/lib/polyvagal.js` — `filterBlocksByState`, `selectBlocks`, `assignSections`, `generateExplanation`
2. ✅ Rewrite `server/app/api/flows/generate/route.js` (move from `/routines/`) — includes shuffle-without-replacement selection, section assignment, segment assembly, canned explanation generation, and normalising Claude output to `warm_up` underscores when `use_ai: true`
3. ✅ Remove season inference from `server/lib/claude.js`
4. ✅ Delete `server/lib/routines.js`

**Mobile**
5. ✅ Update `mobile/services/api.js` — rename to `generateFlow`, new signature
6. ✅ Update `mobile/components/DailyFlowSetup.js` — new params, `segments` response, hide body scan toggles below 8 min, remove `getAutoRoutineType` import, update `SECTION_LABELS` keys to underscores, add `use_ai` toggle to setup UI
7. ✅ Update player to dispatch on `micro_integration` and `body_scan` segment types (body scan screen already exists) — player already handles interstitials and body scans via existing phase logic; queue shape is compatible
8. ✅ Update `chainService` — only save `somi_block` segments to `chain-entries` — already correct; only somi_block data reaches saveBlockToSession/saveCompletedBlock
9. ✅ Delete `mobile/services/videoSelectionAlgorithm.js`
10. ✅ Delete `mobile/services/routineConfig.js` — also updated `RoutineQueuePreview.js`, `mediaService.js`, and `SoMiRoutineScreen.js` to remove dependencies

**DB**
11. ✅ Migration: `UPDATE somi_chain_entries SET section = 'warm_up' WHERE section = 'warm-up'` — executed against production DB

**Docs**
12. ✅ Rename and update `docs/05_routine_engine.md` → `docs/05_flow_engine.md`
13. ✅ Update `docs/03_architecture.md` — fix route table, remove `routines.js` from system map

---

## Open Questions — RESOLVED

**Q1 — Body scan player screen** ✓
Body scan has its own dedicated screen already. The player dispatches to it when it encounters a `body_scan` segment, same as it dispatches to the video screen for `somi_block`. No new screen needed.

**Q2 — AI response shape** ✓
AI path returns the exact same `{ segments, actual_duration_seconds }` shape as the algorithmic path. The server wraps Claude's output with `micro_integration` segments using the same assembly logic (step 5). Optionally appends `reasoning` as an extra field on the same envelope — the client shows it if present.

**Q3 — `use_ai` toggle placement** ✓
A toggle in the first part of the daily flow setup screen (where the user configures energy/safety, duration, etc.), alongside the existing customisation controls.

**Q4 — Canned explanation when AI is off** ✓
Generate a deterministic explanation from `polyvagal_state` + the selected block list. Template approach:

```
State intro: one sentence describing what the polyvagal state feels like and what the body needs.
  e.g. "Your nervous system is in a [state label] state — [brief description of what that means]."

Block rationale: one sentence per section.
  e.g. "We're starting with [warm_up block name] to gently orient your attention inward,
        building through [main block count] exercises chosen to [state-specific goal],
        and closing with [integration block name] to help your system settle."
```

Use the existing `polyvagalStates.js` descriptions for the state copy. Block names are already on the segments. This produces a different explanation each session (different block names) without requiring AI.

**Q5 — Repeat avoidance** ✓
The pool is guaranteed 10+ videos. Use a shuffle-without-replacement approach: randomise the filtered pool, walk through it in order, restart the shuffle when exhausted. This maximises variety and avoids repeats within any session that fits within the pool size.

**Q6 — `quick_routine` in the DB** ✓
`quick_routine` may return. Leave `somi_chains.flow_type` and all related code untouched for now.

---

## Design Critiques

Things worth reconsidering before building.

### Client block count formula — fixed in v1

`DailyFlowSetup.js:46` uses `round((exerciseTime + 20) / 80)` which can exceed the budget. Moving computation to the server fixes this — the server uses `floor(remaining / 80)` per spec. No separate action needed beyond the route rewrite.

### AI always-on — fixed in v1

`polyvagalState` is always sent today so the hardcoded fallback is unreachable. The v1 flip (deterministic default, AI opt-in flag) fixes this. No separate action needed beyond the route rewrite.

### Block count formula edge: body scans at exactly 8 min

With both body scans enabled at 8 min: `remaining = 480 - 120 = 360s → 4 blocks → 5:20 actual`. The user picked 8 min and gets a 5:20 session. This is a ~35% reduction and might feel confusing even with the budget framing. Consider a soft warning: "Body scans will shorten your session to ~5:20."

### No deduplication guarantee in random selection

Random selection from a small state-filtered pool (some states have very few eligible blocks) can produce repetitions across a session. For `shutdown` and `wired` states especially, the pool may have only 3–5 blocks. With a 7-block session the user will see repeats. This is documented as acceptable for v1 but worth flagging — the AI path never repeated blocks.

### ~~The `section` label "integration" is overloaded~~ — resolved

The original design used "integration" for both the 20s interstitial segment type and the final flow section. The 20s interstitial is now typed `micro_integration` in code, so the two concepts are unambiguous. "Integration" is reserved solely for the section label.

### `timer` block type is defined but unused

`somi_blocks.block_type` has two values: `vagal_toning` and `timer`. There are zero `timer` rows in the DB (verified). The spec mentions `timer` as a programmatic type (e.g. body scan), but body scans in v1 are hardcoded segment injections, not DB rows. Either remove the `timer` value from the schema or decide it's the future home of body scans. Leaving it undefined creates permanent ambiguity.

---

## Code & Design Smells — Actions

### DELETE `mobile/services/videoSelectionAlgorithm.js`

Does runtime in-session video selection. With v1, the full segment queue is pre-assembled server-side and the player walks it sequentially — this file has no caller. Delete it.

### NORMALISE section names to `warm_up` (underscore) everywhere

The AI path returns `"warm-up"` (hyphen). The spec uses `"warm_up"` (underscore). `DailyFlowSetup.js:32` has `SECTION_LABELS` keyed on the hyphen form. Any `somi_chain_entries.section` rows saved today contain `"warm-up"`.

Actions:
- Server: force `"warm-up"` → `"warm_up"` when parsing Claude output, before returning segments
- Client: update `SECTION_LABELS` keys to underscore form
- DB: run a one-time migration to update existing `somi_chain_entries.section` values

### DELETE `getAutoRoutineType` and `routineConfig`

`DailyFlowSetup.js` imports `getAutoRoutineType` to derive morning/night, which feeds `routineType` into the server's hardcoded path. Both disappear in v1. Delete the import, any call sites, and `mobile/services/routineConfig.js` if that's its only consumer.

### Body scan toggles: hide below 8 min

Already in plan (step 5). `bodyScanStart`/`bodyScanEnd` default `true` but are silently ignored by the server below 8 min. Hide the toggles entirely when `selectedMinutes < 8` — don't show controls that do nothing.

### 15s timeout: noted, acceptable for now

Global `AbortController` timeout in `services/api.js`. AI path on a cold Vercel start can push this limit. Acceptable given AI is opt-in and non-default. Revisit if AI response times become a user complaint.

### `blockCount > 10` magic number: gone in v1

Disappears naturally when the route handler is rewritten. No separate action needed.

### REMOVE southern hemisphere season bug from `claude.js`

`server/lib/claude.js` infers season using northern hemisphere calendar only. Remove the season inference entirely from the Claude prompt — it's a niche personalisation that's currently wrong for half the world and adds noise. If season context matters later, do it properly.
