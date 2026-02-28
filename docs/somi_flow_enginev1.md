# SoMi Flow Engine v1 — Design Discussion

This is a working design document, not a description of current code. It captures the proposed simplified algorithm to replace the current AI-first routine engine.

---

## The Promise

> You give the engine your energy and safety coordinates and a duration. It gives you an expertly curated set of exercises to bring you back home to your body. Black box.

---

## Core Concepts

### Somi Blocks
- Each block is **~60 seconds** (one video, or one programmatic type like body scan)
- `block_type`: `vagal_toning` (video) or `timer` (programmatic — e.g. body scan)

### Integration Interstitials
- **20 seconds**, shown before every video block — no exceptions
- **1:1 ratio**: N video blocks → N integrations
- The rule: an integration always precedes a Somi block

### Actual Duration Formula
```
actual_duration_seconds = block_count * (60 + 20)
                        = block_count * 80
```

---

## Duration Input — Budget, Not Target

The user's duration input is a **time budget (ceiling)**, not a target or promise.

> "I have up to 10 minutes" — the engine assembles as many blocks as fit within that budget.

This framing:
- Eliminates the UX contract that the app can't keep ("you will get exactly 10 minutes")
- Avoids rounding collisions (two different inputs mapping to the same session)
- Is future-proof for variable block lengths — the packing algorithm doesn't change, only the block durations do
- Matches how users actually think about fitting a session into their day

### Block Count Resolution (uniform blocks, MVP)

```
block_count = max(1, floor(budget_seconds / 80))
actual_duration_seconds = block_count * 80
```

The actual duration is always ≤ the budget (except the minimum 1-block case at very low inputs). It is computed and displayed **after assembly**, never before.

### Duration Budget Table

| Budget | Blocks | Actual | Structure | Notes |
|--------|--------|--------|-----------|-------|
| 1 min  | 1      | 1:20   | main only | edge case (+20s over budget) |
| 2 min  | 1      | 1:20   | main only | edge case |
| 3 min  | 2      | 2:40   | warm-up + main | edge case |
| 4 min  | 3      | 4:00   | warm-up + main + integration | first normal case |
| 5 min  | 3      | 4:00   | warm-up + main + integration | |
| 6 min  | 4      | 5:20   | warm-up + main + integration | |
| 7 min  | 5      | 6:40   | warm-up + main + integration | |
| **8 min**  | **6**  | **8:00** | **warm-up + main + integration** | **body scan threshold ↑ exact** |
| 9 min  | 6      | 8:00   | warm-up + main + integration | |
| 10 min | 7      | 9:20   | warm-up + main + integration | |
| 12 min | 9      | 12:00  | warm-up + main + integration | exact |
| 15 min | 11     | 14:40  | warm-up + main + integration | |

Two different budgets can resolve to the same session. With budget semantics this is correct behaviour, not a bug — both users got a session that fit their available time.

**Edge cases (< 4 min / < 3 blocks):** The app still works, it just can't produce all three sections. These are handled silently — no special UX needed beyond knowing there won't be section headers.

### UX: Showing Duration
- The picker shows the budget in whole minutes ("how much time do you have?")
- After assembly, show the actual duration: "Your session: 9:20"
- No tilde, no approximation language — the displayed time is exact

### Future-proofing with variable block lengths

When blocks are no longer uniform, the algorithm becomes a greedy bin-packing:

```
queue = []
remaining = budget_seconds
for each candidate_block in state_filtered_pool:
    cost = block_duration + integration_duration
    if cost <= remaining:
        queue.push(candidate_block)
        remaining -= cost
```

The UX doesn't change. The input is still a budget. The output is still an exact actual duration. Only the internals change.

---

## Simplified Algorithm v1

### Inputs

| Input | Type | Notes |
|-------|------|-------|
| `energy_level` | 0–100 | From the XY picker |
| `safety_level` | 0–100 | From the XY picker |
| `duration_minutes` | integer ≥ 1 | User's time budget |
| `body_scan_start` | boolean | Prepend a body scan segment (ignored if `duration_minutes < 8`) |
| `body_scan_end` | boolean | Append a body scan segment (ignored if `duration_minutes < 8`) |

### Step 1 — Derive Polyvagal State

Use the existing `deriveState(energy, safety)` logic.

Result: one of `shutdown`, `restful`, `steady`, `glowing`, `wired`

### Step 2 — Derive Block Count

Body scans are only available at **8 minutes or more**. Below that threshold the toggles don't exist on the frontend and the backend ignores the inputs.

```
body_scan_enabled  = duration_minutes >= 8
body_scan_seconds  = body_scan_enabled
                     ? (body_scan_start ? 60 : 0) + (body_scan_end ? 60 : 0)
                     : 0
remaining_seconds  = (duration_minutes * 60) - body_scan_seconds
block_count        = max(1, floor(remaining_seconds / 80))
```

**Body scan impact at the 8-min threshold (480s baseline = 6 blocks):**

| Body scans | Remaining | Blocks | Actual |
|------------|-----------|--------|--------|
| none       | 480s      | 6      | 8:00   |
| start only | 420s      | 5      | 7:40   |
| end only   | 420s      | 5      | 7:40   |
| both       | 360s      | 4      | 7:20   |

Enabling body scans reduces the block count. That's greedy packing — just accept it.

### Step 3 — Select Blocks

Pick `block_count` Somi blocks from `somi_blocks` where:
- `active = true`
- `block_type = 'vagal_toning'`
- Selection criteria are guided by polyvagal state (see state filter table below)

### Step 4 — Assemble Segment Queue

The backend builds the full ordered playback queue. Each item is a **segment** with a `type` and a `section`. The section is assigned by hard rules — the frontend never computes it.

**Section assignment by block count (hard rules):**

| Block count | block[0] | block[1..N-2] | block[N-1] |
|-------------|----------|---------------|------------|
| 1           | `main`   | —             | —          |
| 2           | `warm_up`| —             | `main`     |
| 3+          | `warm_up`| `main`        | `integration` |

Each integration interstitial inherits the section of the block it precedes. Body scan at start → always `warm_up`. Body scan at end → always `integration`.

**Assembly pseudocode:**
```
if body_scan_start → { type: "body_scan", section: "warm_up", duration_seconds: 60 }

for i, block in selected_blocks:
    section = assign_section(i, block_count)   // per table above
    append { type: "micro_integration", section: section, duration_seconds: 20 }
    append { type: "somi_block",  section: section, duration_seconds: 60, ...block }

if body_scan_end → { type: "body_scan", section: "integration", duration_seconds: 60 }
```

### Step 5 — Compute Actual Duration

```
actual_duration_seconds = body_scan_seconds + (block_count * 80)
```

### Outputs

```json
{
  "segments": [ ... ],
  "actual_duration_seconds": 280
}
```

**Segment shapes:**

| Type | Fields |
|------|--------|
| `body_scan` | `type`, `section`, `duration_seconds` |
| `micro_integration` | `type`, `section`, `duration_seconds` |
| `somi_block` | `type`, `section`, `duration_seconds`, `id`, `title`, `video_url`, `energy_delta`, `safety_delta`, ... |

`body_scan` and `micro_integration` carry nothing but `type`, `section`, and `duration_seconds`. Only `somi_block` carries full metadata because the video player needs it.

---

### Examples

#### Edge case — 1 block (e.g. 1–2 min budget)
```
→ main only, no section headers
  [micro_integration/main] [somi_block/main]
```

#### Edge case — 2 blocks (e.g. 3 min budget)
```
WARM UP   [micro_integration] [somi_block]
MAIN      [micro_integration] [somi_block]
```

#### First normal case — 3 blocks (e.g. 4 min budget)
```
WARM UP      [micro_integration] [somi_block]
MAIN         [micro_integration] [somi_block]
INTEGRATION  [micro_integration] [somi_block]
```

---

#### Clean baseline — 8 min, no body scans (6 blocks, 8:00 exact)

block_count=6 → block[0]=warm_up · block[1–4]=main · block[5]=integration

```json
{
  "segments": [
    { "type": "micro_integration", "section": "warm_up",     "duration_seconds": 20 },
    { "type": "somi_block",  "section": "warm_up",     "duration_seconds": 60, "id": 47, "title": "Vagus Reset", "video_url": "..." },
    { "type": "micro_integration", "section": "main",        "duration_seconds": 20 },
    { "type": "somi_block",  "section": "main",        "duration_seconds": 60, "id": 12, "title": "Covering the Eyes", "video_url": "..." },
    { "type": "micro_integration", "section": "main",        "duration_seconds": 20 },
    { "type": "somi_block",  "section": "main",        "duration_seconds": 60, "id": 33, "title": "Humming", "video_url": "..." },
    { "type": "micro_integration", "section": "main",        "duration_seconds": 20 },
    { "type": "somi_block",  "section": "main",        "duration_seconds": 60, "id": 8,  "title": "Body Tapping", "video_url": "..." },
    { "type": "micro_integration", "section": "main",        "duration_seconds": 20 },
    { "type": "somi_block",  "section": "main",        "duration_seconds": 60, "id": 21, "title": "Diaphragmatic Breath", "video_url": "..." },
    { "type": "micro_integration", "section": "integration", "duration_seconds": 20 },
    { "type": "somi_block",  "section": "integration", "duration_seconds": 60, "id": 19, "title": "Humming Exhale", "video_url": "..." }
  ],
  "actual_duration_seconds": 480
}
```

Plan view:
```
WARM UP
  1  Vagus Reset

MAIN
  2  Covering the Eyes
  3  Humming
  4  Body Tapping
  5  Diaphragmatic Breath

INTEGRATION
  6  Humming Exhale
```

---

#### 8 min, both body scans on (4 blocks, 7:20 actual)

```
body_scan_seconds = 120
remaining         = 360
block_count       = floor(360/80) = 4
actual_duration   = 120 + 320 = 440s (7:20)
```

```
WARM UP
  ~ Body Scan
  1  [block]

MAIN
  2  [block]

INTEGRATION
  3  [block]
  ~ Body Scan
```

The frontend reads `type` to know what to render and `section` to know where to draw section headers. No flow logic lives in the client.

---

## State → Block Selection

Inherits existing polyvagal state filter logic from `videoSelectionAlgorithm.js`:

| State | Filter |
|-------|--------|
| `shutdown` | `energy_delta >= 0` AND `safety_delta >= 0` |
| `restful` | `energy_delta > 0` |
| `wired` | `safety_delta > 0` |
| `glowing` | `safety_delta >= 0` |
| `steady` | All blocks (no filter) |

Falls back to unfiltered pool if no blocks match the filter.

---

## Open Questions

### Q1: Where do integration interstitials live — RESOLVED

**Backend.** Integration segments are included in the server-returned `segments` array as first-class items. The client never inserts or infers them. See Step 4 and the example above.

### Q2: AI as optional override, not default

Current behavior: AI path is the default when `polyvagalState` is provided (which is always).

Proposed: flip the default. The deterministic algorithm runs first. AI is an opt-in override that can be toggled from the front end (e.g. a switch in the flow setup screen or a per-request flag in the API payload).

This decouples reliability from AI availability and makes the core product testable without Claude.

### Q3: Body scan bookends — RESOLVED

**Folded into the server queue.** `body_scan_start` and `body_scan_end` are inputs to `POST /api/routines/generate`. The backend conditionally prepends/appends `body_scan` segments and accounts for their duration in `actual_duration_seconds`. The client no longer manages body scan logic or timing.

### Q4: Duration UX — RESOLVED

Show the budget on the picker ("how much time do you have?"). Show `actual_duration_seconds` after assembly. No approximation needed — the displayed time is always exact. The budget framing makes the slight undershoot feel correct rather than broken.

### Q5: Block selection — random vs. ordered

Within the state-filtered pool, is selection random (current behavior in `videoSelectionAlgorithm.js`) or ordered/curated? For v1, random is fine. Curation can come later.

---

## What This Replaces

| Current behavior | v1 behavior |
|-----------------|-------------|
| AI path is default | Deterministic algorithm is default |
| Claude Haiku generates block sequence | State filter + random selection |
| Body scan managed client-side | Body scan segments in server-returned queue; client is a dumb player |
| AI assigns warm-up / main / integration sections | Backend assigns `section` to every segment via hard rules |
| Hardcoded fallback (morning/night fixed sequences) | Same deterministic path for all inputs |
| Duration input treated as a target | Duration input treated as a budget (ceiling) |

The AI path is not removed — it becomes an optional override callable from the front end via a flag in the existing `POST /api/routines/generate` payload.
