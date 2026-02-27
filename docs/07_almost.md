# 07 — Almost: Undercooked & Half-Assed Features

> Features that exist but aren't fully thought out, consistently implemented, or properly wired up. The goal is to surface ambiguity, redundancy, and dangling logic so we can resolve it.

---

## 1. Streaks — 4 Surfaces, 3 Algorithms, 1 Stub

The streak feature is displayed in four places, each computing it differently:


| Surface             | File                          | Algorithm                                                         |
| ------------------- | ----------------------------- | ----------------------------------------------------------------- |
| Header flame pill   | `SoMiHeader.js`               | Consecutive days backward, **week-bounded** (resets every Sunday) |
| Calendar highlights | `MySomiScreen.js:48-86`       | Consecutive days backward, `daily_flow` chains only, all-time     |
| Stats panel         | `MySomiScreen.js:452-489`     | Consecutive days backward, **all flow types**, all-time           |
| Completion screen   | `CompletionScreen.js:219-224` | Stub — always returns `1`. Has a TODO for backend implementation  |


**Problems:**

- Three surfaces can show three different streak numbers simultaneously
- The header streak resets every Sunday regardless of actual streak length
- CompletionScreen always says "1 day streak — Keep it going!" no matter what
- No server-side streak endpoint exists — all calculations are client-side on fetched chain data
- `DailyFlowSetup` warns "minimum 5 minutes to maintain your streak" and `HomeScreen` has a progress ring that fills at 5 min (`FLOW_TARGET_SECONDS = 300`), but **no algorithm enforces a minimum duration** — a 10-second session counts as a streak day
- All algorithms operate on a `limit=30` chain fetch from MySomiScreen, meaning users with 30+ sessions get silently wrong numbers

## 2. Video Playback — Two Unrelated Players

**PlayerScreen** (standalone/explore) and **SoMiRoutineScreen** (daily flow) are completely separate implementations with different behaviors:


| Behavior          | PlayerScreen                                                             | SoMiRoutineScreen            |
| ----------------- | ------------------------------------------------------------------------ | ---------------------------- |
| 60-second cap     | No                                                                       | Yes (acknowledged HACK)      |
| Interstitial      | No                                                                       | Yes (20s between blocks)     |
| Skip block button | Yes (but exits flow entirely)                                            | Yes (advances to next block) |
| Mute policy       | Muted by default, toggleable                                             | Always muted                 |
| Saves chain entry | Orphaned — no chain ID, writes to AsyncStorage buffer that never flushes | Proper chain association     |
| Flow music        | No                                                                       | Yes                          |


PlayerScreen also carries dead params (`savedInitialValue`, `savedInitialState`, `savedPolyvagalState`, `currentStep`, `isBodyScan`) from a previous flow design. These are accepted but the code path that used them is no longer reachable.

## 3. Explore Screen — Largely Cosmetic

Almost every interactive element on ExploreScreen is wired to `onPress={tap}` which just fires a haptic:

- **Search bar**: Captures text in state, does nothing with it
- **Category pills**: All haptic-only. Categories like "Havening", "Humming", "Gaze Work" are aspirational — the DB only has `vagal_toning` and `timer` block types
- **"View all" buttons**: Both are no-ops
- **Featured Practices cards**: Hardcoded array of 8 items with fake durations. Tapping does nothing
- **Daily Flows cards** (Wake Up 5min, Wind Down, etc.): No-ops. These are the intended entry point for quick routines, but they're not wired to anything

## 4. Quick Routines — Logic Exists, No Way to Start One

The codebase has full quick routine support:

- `routineStore` has `flowType: 'quick_routine'` and `isQuickRoutine` states
- `chainService` has separate save paths for quick routines
- `SoMiRoutineScreen` handles quick routine exit (skip body scan, skip check-in, go home)

But **no UI screen starts a quick routine**. The Daily Flows cards on ExploreScreen are the intended entry point but are all haptic-only no-ops.

The `'single_block'` flow type is similarly defined in `routineStore` but has zero UI entry points and no distinct handling.

## 5. Frontend Logic That Should Be Backend

### Block count — client computes, server trusts blindly

`DailyFlowSetup.js:42-47` calculates `blockCount` using the formula `Math.max(1, Math.floor(totalSeconds / 80))`. The constant `80` (60s video + 20s interstitial) exists only client-side. The server accepts whatever `blockCount` the client sends without validation.

### Polyvagal state — client derives, server could but doesn't

`deriveState(energy, safety)` runs on the client. The server receives both raw values AND the pre-derived state, but uses the pre-derived state directly in the AI prompt. A client could send mismatched values and the server wouldn't catch it.

### Duplicate routine config

`ROUTINE_CONFIGS` and `getRoutineConfig()` exist identically in both `mobile/services/routineConfig.js` and `server/lib/routines.js`. Adding a routine type requires updating both. No mechanism prevents drift.

## 6. Direct Supabase Calls From Mobile

The architecture rule says "no direct Supabase calls from mobile — use `services/api.js`." Three files violate this:


| File                             | What it does                                                                                 |
| -------------------------------- | -------------------------------------------------------------------------------------------- |
| `RoutineQueuePreview.js:103-116` | Fetches `somi_blocks` for block swapping modal                                               |
| `CategoryDetailScreen.js:50-77`  | Fetches `somi_blocks` filtered by `block_type` (server endpoint doesn't support this filter) |
| `mediaService.js:16-48`          | Fetches video blocks as fallback when store queue is empty                                   |


## 7. Hardcoded Values & Silent Bugs


| Issue                            | File                           | Detail                                                                                                                  |
| -------------------------------- | ------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| `BODY_SCAN_BLOCK_ID = 20`        | `BodyScanCountdown.js:107`     | Hardcoded DB row ID. If that row changes, saves go to wrong/missing block                                               |
| `STATE_CODE_TO_TARGET` undefined | `SoMiRoutineScreen.js:885,995` | Never defined or imported. `ReferenceError` if the fallback code path is triggered                                      |
| `cacheTime` → `gcTime` rename    | `_layout.js:18`                | React Query v5 renamed this option. Old key is silently ignored, GC runs at default interval instead of intended 10 min |
| Server anon key hardcoded        | `server/lib/auth.js:4-5`       | Ignores env vars. Key rotation requires code change + redeploy                                                          |
| Season derivation                | `server/lib/claude.js`         | Assumes Northern hemisphere. Code has a comment acknowledging the bug                                                   |


## 8. Music Button on HomeScreen — No-Op

The musical notes button on the HomeScreen action row only fires a haptic. No handler, no navigation, no toggle. Presumably intended for music settings but unimplemented.

`HomeScreen.js:194-200`

## 9. RoutineQueuePreview — Shows Wrong Queue in Pre-Flow Mode

In pre-routine mode (before starting), the component calls `getRoutineConfig()` to get canonical block names from the **local hardcoded config**, ignoring the AI-generated queue already stored in `routineStore.hardcodedQueue`. So the preview shows a different order than what the user will actually experience.

In edit mode (mid-routine), it correctly reads from the store. The two modes use different data sources for the same visual.

## 10. CompletionScreen — Last User of `expo-av`

`CompletionScreen.js` imports from `expo-av` (deprecated in favor of `expo-video` and `expo-audio`, which the rest of the app already uses). This is the only remaining consumer.

---

## Priority Buckets

**Will crash / is actively broken:**

- `STATE_CODE_TO_TARGET` undefined — ReferenceError on fallback path
- `cacheTime` silently ignored — memory management not working as intended

**Users see wrong data:**

- Streaks: 3+ different numbers on different screens
- CompletionScreen: always shows "1 day streak"
- MySomiScreen stats: based on max 30 chains, undercounts for active users
- RoutineQueuePreview: shows wrong block order pre-flow

**Dead UI / unreachable code:**

- Explore screen: search, categories, featured practices, daily flows — all no-ops
- Quick routines: full logic exists, no entry point
- Music button: no-op
- PlayerScreen legacy params: dead weight

**Architecture violations / tech debt:**

- 3 direct Supabase calls from mobile
- Duplicate routine config (mobile + server)
- Client-computed values server should own (block count, polyvagal state)
- Hardcoded DB row ID for body scan
- Hardcoded server credentials ignoring env vars

