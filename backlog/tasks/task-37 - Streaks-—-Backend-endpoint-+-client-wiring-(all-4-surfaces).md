---
id: task-37
title: Streaks — Backend endpoint + client wiring (all 4 surfaces)
status: In Progress
assignee: []
created_date: '2026-03-02 08:26'
updated_date: '2026-03-02 08:28'
labels:
  - streaks
  - backend
  - mobile
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the full streaks architecture from doc-1 (Streaks Clarification).

## Scope

### Phase 1 — Server: GET /api/streaks
- Add route to server
- Accept `?tz=<IANA>` param (e.g. `America/New_York`) — use it to group UTC timestamps into local calendar days
- Query `somi_chains` joined with `somi_chain_entries` for the user, date-range filtered (need enough history to compute all-time streak for MySomiScreen)
- For each local calendar day: `day_seconds = SUM(seconds_elapsed)`, `percentage = min(100, day_seconds/300*100)`, `counts = day_seconds >= 300`
- `current_streak`: consecutive `counts: true` days backward from today (no week boundary)
- Also return `all_time_streak` (or support `?window=all-time` param) for MySomiScreen
- Return week array + current_streak + all_time_streak

### Phase 2 — Server: PATCH /api/chains/:id to set duration_seconds
- After `POST /api/chains` uploads entries, the client should PATCH to set `duration_seconds = SUM(entries.seconds_elapsed)`
- OR: server auto-computes it after entries are saved (preferred — less client logic)
- The `duration_seconds` column already exists (migration applied)

### Phase 3 — Client: useStreaks() hook
- Add `useStreaks()` to `hooks/useSupabaseQueries.js`
- Calls `GET /api/streaks?tz=<IANA>` (get timezone via `Intl.DateTimeFormat().resolvedOptions().timeZone`)
- `staleTime: 30s`, invalidate on flow completion in `FlowOutro.handleFinish`

### Phase 4 — Wire up 4 surfaces
- `SoMiHeader` flame pill → `useStreaks().current_streak`
- `HomeScreen` week strip → `useStreaks().week`
- `MySomiScreen` calendar → `useStreaks().all_time_streak` / week data
- `CompletionScreen` → `useStreaks().current_streak`

### Phase 5 — Skip-through gate (FlowTooFast)
- In `FlowOutro.handleFinish`: sum session block seconds; if < 60s, do NOT save, navigate to FlowTooFast instead
- `FlowTooFast` screen: modal bottom sheet, calm tone, one "Got it" button → Home, calls `clearSessionData()` on dismiss
<!-- SECTION:DESCRIPTION:END -->
