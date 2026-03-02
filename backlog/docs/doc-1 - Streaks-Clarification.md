---
id: doc-1
title: Streaks Clarification
type: other
created_date: '2026-03-02 08:11'
updated_date: '2026-03-02 08:27'
---
# Streaks Clarification

> Discovery phase document. Goal: define what streaks should be, audit what exists, identify the gaps, and design the backend-as-source-of-truth architecture.

---

## 1. What a Streak Should Be (Defined)

### Streak Day
A calendar day counts toward the streak **if and only if** the user completed a SoMi flow with a total active duration of **≥ 5 minutes (300 seconds)**.

### Partial Progress (< 5 min)
If a user completes a flow but the total elapsed time is under 5 minutes, that day still shows a **partial green ring** on the weekly strip — proportional to how much of the 5-minute target they hit. It is not a streak day, but it is not invisible either.

```
ring_percentage = min(100, (total_seconds_elapsed / 300) * 100)
```

### Skip-Through Gate (< 60 seconds)
If a user taps through the entire flow in under **60 seconds** of actual elapsed time, they arrive at the completion screen but:
- The session is **not saved** to the database at all
- A new interstitial screen appears (before CompletionScreen) that says something like:
  *"You moved through that pretty quick — this one won't count toward your streak. Come back when you're ready to practice."*
- UX tone: gentle, not punitive. No session data written.
- **Implementation:** Modal bottom sheet (`FlowTooFast`), one "Got it" button → Home, calls `clearSessionData()` on dismiss.

### Flame Count (Header)
The flame pill in the header shows the number of **consecutive streak days** counting backward from today. "Consecutive" means no gap — missing a day resets to 0.

---

## 2. Current State Audit

### 2a. How Duration Is Currently Tracked

Duration is **not stored directly** on `somi_chains`. It must be derived by summing `somi_chain_entries.seconds_elapsed`.

The chain flow:
1. Each block played calls `chainService.saveBlockToSession(somiBlockId, secondsElapsed, ...)` which buffers to AsyncStorage
2. Body scans (block ID 20) also write an entry with their seconds
3. On flow completion, `chainService.createChainFromSession()` batch-uploads all entries to the server — no duration total is computed or stored

**Question answered: yes, `seconds_elapsed` is logged per block.** The data is there. But it's fragmented across entries with no rolled-up total on the chain row.

### 2b. The 4 Streak Surfaces Today

| Surface | File | Algorithm | Problems |
|---------|------|-----------|----------|
| Flame pill | `SoMiHeader.js:6-23` | Consecutive days backward, week-bounded (resets every Sunday) | No minimum duration check — a 3-second session counts |
| Week strip rings | `HomeScreen.js:104-130` | `sum(seconds_elapsed)` per day / 300, capped at 100% | Correct math, but no minimum enforcement for "streak day" |
| Calendar highlights | `MySomiScreen.js:48-86` | Consecutive days backward, `daily_flow` only, all-time | No minimum duration; all-time but limited to 30-chain fetch |
| Completion screen | `CompletionScreen.js:219-224` | **Always returns 1** — hardcoded stub | TODO comment in code |

### 2c. The Fetch Problem

`useWeeklyFlows()` (`hooks/useSupabaseQueries.js:160-169`) calls `GET /api/chains?limit=30` — a general chain list endpoint. This means:
- The "weekly" data is fetched from the last 30 chains, not filtered by this week
- Users with >30 sessions get silently wrong data on all 3 client-computed surfaces
- There is no server-side streak endpoint

### 2d. What's Missing in the DB

~~The `somi_chains` table has no `duration_seconds` column.~~

**RESOLVED:** `duration_seconds integer` column added to `somi_chains` via migration `add_duration_seconds_to_somi_chains`. Existing rows backfilled from their entries.

---

## 3. Gap Analysis

| Thing Needed | Currently Exists? | Gap |
|---|---|---|
| Per-block duration logging | ✅ Yes — `seconds_elapsed` in `somi_chain_entries` | None |
| Total session duration stored on chain | ✅ Column added | Server must set it after entries upload |
| Skip-through gate (< 60s = no save) | ❌ No | Need client-side check before `createChainFromSession` |
| Server-side streak endpoint | ❌ No | Need `/api/streaks` |
| Single source of truth for streak | ❌ No — 4 surfaces, 3+ algorithms | All must read from server endpoint |
| Minimum duration for streak day (300s) | ❌ Not enforced | Server must apply threshold |
| Week-aware chain fetch (not just limit=30) | ❌ No | Server needs date-range support or a dedicated endpoint |

---

## 4. Proposed Architecture

### Principle: Backend is the Black Box

The client should not compute streaks. It sends data and asks the server for the answer. One endpoint, one algorithm.

### 4a. New Server Endpoint: `GET /api/streaks`

Accepts `?tz=<IANA timezone>` (e.g. `America/New_York`). Returns everything the UI needs for the home screen, header, and profile page:

```json
{
  "current_streak": 3,
  "all_time_streak": 14,
  "week": [
    { "date": "2026-02-23", "day": "S", "percentage": 0,   "counts": false },
    { "date": "2026-02-24", "day": "M", "percentage": 100, "counts": true  },
    { "date": "2026-02-25", "day": "T", "percentage": 82,  "counts": false },
    { "date": "2026-02-26", "day": "W", "percentage": 100, "counts": true  },
    { "date": "2026-02-27", "day": "T", "percentage": 100, "counts": true  },
    { "date": "2026-02-28", "day": "F", "percentage": 0,   "counts": false },
    { "date": "2026-03-01", "day": "S", "percentage": 0,   "counts": false }
  ]
}
```

**Server-side algorithm:**
1. Client passes `?tz=America/New_York` (from `Intl.DateTimeFormat().resolvedOptions().timeZone`)
2. Server converts all UTC `created_at` timestamps to local dates using that timezone
3. For each local calendar day, sum `seconds_elapsed` across all chains on that day → `day_seconds`
4. `percentage = min(100, (day_seconds / 300) * 100)`
5. `counts = day_seconds >= 300`
6. `current_streak`: count consecutive `counts: true` days backward from today (no week boundary)
7. `all_time_streak`: same algorithm over full history

**Why this is better:**
- One query, one place for the algorithm
- No limit=30 bug — explicitly queries by date range
- Threshold (300s) lives in one server constant
- Timezone handled correctly — user's 11pm session is their local day, not UTC next-day
- Client renders dumb: just maps the array

### 4b. DB Migration: `duration_seconds` on `somi_chains`

**DONE.** Column added and backfilled.

Server sets `duration_seconds` after entries are uploaded: after `POST /api/chains` creates the chain and entries are saved, compute `SUM(entries.seconds_elapsed)` and write it back. Prefer server-side auto-compute over a client PATCH to minimize client logic.

### 4c. Client: Skip-Through Gate

In `FlowOutro.js` (`handleFinish`), before calling `chainService.createChainFromSession()`:

```js
const { blocks } = await chainService.getSessionData()
const totalSeconds = blocks.reduce((sum, b) => sum + (b.secondsElapsed || 0), 0)

if (totalSeconds < 60) {
  // navigate to FlowTooFast bottom sheet instead
  // do NOT call createChainFromSession
  navigation.navigate('FlowTooFast')
  return
}
```

The `FlowTooFast` screen:
- Modal bottom sheet (not full screen)
- Message: something like "This one won't count toward your streak — you moved through it pretty fast. Come back when you have a few minutes."
- One button: "Got it" → goes to Home
- Does NOT save anything — `clearSessionData()` is called on dismiss

### 4d. Client: Replace All 4 Surfaces with the New Endpoint

| Surface | Change |
|---------|--------|
| `SoMiHeader` flame pill | Replace `computeStreak()` with `data.current_streak` from `/api/streaks` |
| `HomeScreen` week strip | Replace `getWeekData()` with `data.week` array from `/api/streaks` |
| `MySomiScreen` calendar | Use `data.all_time_streak` + week data from `/api/streaks` |
| `CompletionScreen` | Show `data.current_streak` from freshly-invalidated query |

A single `useStreaks()` React Query hook fetches `/api/streaks?tz=<IANA>`, cached with `staleTime: 30s`, invalidated on flow completion.

---

## 5. Build Order

### Phase 1 — Server Endpoint
1. Add `GET /api/streaks` route to server
2. Accept `?tz` param; query chains + entries for date range (full history for all_time_streak)
3. Convert UTC timestamps to local dates using provided timezone
4. Compute `week[]` + `current_streak` + `all_time_streak`
5. Return JSON

### Phase 2 — Server: Auto-set duration_seconds
1. After entries are saved for a chain, compute SUM and write to `somi_chains.duration_seconds`

### Phase 3 — Client Hook
1. Add `useStreaks()` hook to `hooks/useSupabaseQueries.js`
2. Invalidate it in `FlowOutro.handleFinish` alongside existing cache invalidations

### Phase 4 — Wire Up the 4 Surfaces
1. `SoMiHeader` — use `useStreaks().current_streak`
2. `HomeScreen` week strip — use `useStreaks().week`
3. `MySomiScreen` — use `useStreaks().all_time_streak` + week data
4. `CompletionScreen` — use `useStreaks().current_streak`

### Phase 5 — Skip-Through Gate
1. Add totalSeconds check in `FlowOutro.handleFinish`
2. Build `FlowTooFast` modal bottom sheet
3. Clear session data on dismiss without saving

---

## 6. Open Questions — RESOLVED

| Question | Decision |
|----------|----------|
| **Timezone** | Store UTC (already done). Pass `?tz=<IANA>` from client (`Intl.DateTimeFormat().resolvedOptions().timeZone`). Server groups sessions by local calendar date using that timezone. |
| **Multiple flows in one day** | Already handled — sum across all chains on that local day. Two 3-min flows = 6 min = counts. |
| **FlowTooFast screen format** | Modal bottom sheet. One "Got it" → Home. No option to restart. |
| **duration_seconds column** | Added ✅. Backfilled from entries. Server will set it going forward. |
| **Streak on profile page (MySomiScreen)** | `/api/streaks` returns `all_time_streak` alongside `current_streak`. No separate endpoint needed. |
