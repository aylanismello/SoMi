# Cruft — Dead Code, Unused Files, and Debris

Audit performed 2026-02-27 against current `main` branch. All items verified by tracing imports, navigation calls, and grep across the codebase.

---

## Deletable Files (~2,841 lines)

### `mobile/App.js` (289 lines) — HIGH

Legacy entry point. `package.json` sets `"main": "expo-router/entry"`, so this file is never loaded. Contains old React Navigation stack, stale `cacheTime` (v4 name), and debug `console.log`s.

### `mobile/index.js` (8 lines) — HIGH

`registerRootComponent(App)` shim for the dead `App.js`. Never executed.

### `mobile/contexts/FlowMusicContext.js` (71 lines) — HIGH

Replaced by `stores/flowMusicStore.js` (which comments "Replaces FlowMusicContext"). Zero imports in any active file.

### `mobile/contexts/SettingsContext.js` (37 lines) — HIGH

Replaced by `stores/settingsStore.js` (which comments "Replaces SettingsContext"). Zero imports in any active file.

### `mobile/components/FlowMenuScreen.js` (370 lines) — HIGH

Not registered in any route (`_layout.js` or `(tabs)/_layout.js`). Zero imports. Superseded by `HomeScreen` + `ExploreScreen` tabs.

### `mobile/components/SplashScreen.js` (70 lines) — HIGH

Only imported in the dead `App.js`. The live `_layout.js` handles loading state inline.

### `mobile/components/EmbodimentSlider.js` (859 lines) — HIGH

Original 1D ring-based state picker. Replaced by `StateXYPicker.js`. Zero imports in any active file. Also exports dead constants `POLYVAGAL_STATE_MAP` and `STATE_DESCRIPTIONS`.

### `mobile/components/CollapsibleCategorySelector.js` (85 lines) — HIGH

Zero imports in any active file. The live flow uses AI-generated queues or hardcoded `routineConfig`; no UI for manual category selection exists.

### `mobile/archived-features/` directory (1,046 lines total) — HIGH

Three files: `MeditationTimerActive.js` (649 lines), `MeditationTimerSetup.js` (263 lines), `IntervalTimeSelector.js` (134 lines). None are registered in routes. `MeditationTimerActive` imports a component (`SettingsModal`) that doesn't exist and navigates to `'HomeMain'` (a dead App.js route name). Uses old `expo-av` Audio API.

### `server/lib/supabase.js` (6 lines) — HIGH

Exports a Supabase client, but no server file imports it. All routes use `getAuthenticatedUser()` from `lib/auth.js` which creates its own client.

---

## Dead Screens / Unreachable Routes

### `SoMiTimer` — registered but never navigated to — HIGH

Registered in `app/_layout.js` but no component calls `router.push('/SoMiTimer')` or equivalent. Additionally contains a runtime bug: `handleFinish()` references `route?.params?.initialValue` but `route` is never declared — would throw `ReferenceError` if somehow reached.

- `mobile/app/SoMiTimer.js` (re-export)
- `mobile/components/SoMiTimer.js` (implementation, ~230 lines)

---

## Dead Exports in Live Files

| File | Export(s) | Why dead |
|------|-----------|----------|
| `constants/theme.js` | `typography`, `spacing`, `borderRadius`, `withOpacity` | Every import from this file destructures only `{ colors }` |
| `services/routineConfig.js` | `ROUTINE_TYPE_LABELS`, `ROUTINE_TYPE_EMOJIS` | Zero imports across codebase |
| `constants/polyvagalStates.js` | `getStateByName`, `POLYVAGAL_STATES_ARRAY` | Zero imports; live code uses `deriveState`, `deriveIntensity`, `deriveStateFromDeltas`, `getPolyvagalExplanation` |
| `services/mediaService.js` | `getMediaForSliderValue`, `getSOSMedia`, `BODY_SCAN_MEDIA` | Re-exported via `constants/media.js` but never imported by any component. `BODY_SCAN_MEDIA` has a `TODO: HARDCODED BULLSHIT` comment |
| `services/videoSelectionAlgorithm.js` | `selectNextVideo`, `selectSOSVideo` | Only called by dead functions in `mediaService.js`. (`selectRoutineVideo` IS live — used by `SoMiRoutineScreen`) |
| `constants/media.js` | 4 of 6 re-exports are dead | Only `prefetchVideoBlocks` and `BACKGROUND_VIDEO` are consumed; the rest (`getMediaForSliderValue`, `getSOSMedia`, `getBlocksForRoutine`, `BODY_SCAN_MEDIA`) are not |

---

## Dead npm Dependencies

| Package | Why dead |
|---------|----------|
| `@react-navigation/bottom-tabs` | Only imported in dead `App.js`. Live tabs use Expo Router `NativeTabs` |
| `@react-navigation/stack` | Only imported in dead `App.js`. Live stack uses Expo Router `Stack` |
| `@react-native-community/slider` | Zero imports in any source file. Verify no Expo module uses it as peer dep before removing |

---

## Duplicated Code

### Routine config — `server/lib/routines.js` vs `mobile/services/routineConfig.js`

Nearly identical `ROUTINE_CONFIGS` data object and `getRoutineConfig`/`getAutoRoutineType` functions duplicated in both server and mobile. The server version is the source of truth (runs during generation). The mobile version is used as a fallback in `RoutineQueuePreview.js`.

---

## Convention Violations (live code, architecturally wrong)

### Direct Supabase calls from mobile

`CLAUDE.md` rule: "DO NOT make direct Supabase calls from the mobile app."

| File | What it does |
|------|-------------|
| `components/RoutineQueuePreview.js` (line 8, ~105) | Imports `supabase` directly, queries `somi_blocks` |
| `components/CategoryDetailScreen.js` (lines 5, 53-59, 105-112) | Imports `supabase` directly, fetches blocks |

### Old video API in one file

`components/CompletionScreen.js` (line 7) — uses `import { Video } from 'expo-av'`. Rest of app uses `expo-video`/`VideoView`. This is the only reason `expo-av` remains in `package.json`.

---

## TODO / FIXME / HACK Comments

| File | Line(s) | Comment |
|------|---------|---------|
| `mobile/supabase.js` | 4 | `TODO: Replace these with your actual values` — stale, credentials are filled in |
| `mobile/components/SoMiRoutineScreen.js` | 30-34 | `HACK: VIDEO DURATION CAP — All videos capped at 60s. TODO: Remove this hack when videos are properly edited` |
| `mobile/components/SoMiRoutineScreen.js` | 602, 619 | `HACK: 60-SECOND CAP` repeated in two code blocks |
| `mobile/components/CompletionScreen.js` | 221 | `TODO: Implement proper streak calculation from backend` — `getStreak()` always returns `1` |
| `mobile/services/mediaService.js` | 108 | `TODO: HARDCODED BULLSHIT - This should come from somi_blocks table` |

---

## Hardcoded Magic Numbers

| File | Line | Value | What it is |
|------|------|-------|------------|
| `mobile/components/SoMiTimer.js` | 142 | `TIMER_BLOCK_ID = 15` | Hardcoded DB row ID for timer block |
| `mobile/components/BodyScanCountdown.js` | 107 | `BODY_SCAN_BLOCK_ID = 20` | Hardcoded DB row ID for body scan block |
| `mobile/components/SoMiRoutineScreen.js` | 30 | `VIDEO_DURATION_CAP_SECONDS = 60` | Temporary cap (see HACK above) |

---

## Silent Bug

### `cacheTime` → `gcTime` rename (React Query v5)

`mobile/app/_layout.js` line 18: sets `cacheTime: 10 * 60 * 1000` in QueryClient defaults. React Query v5 (`@tanstack/react-query@5`, which this project uses at `^5.90.20`) renamed this to `gcTime`. The old name is silently ignored, so garbage collection never triggers at the configured interval.

---

## Hardcoded Credentials in Source

| File | Lines | What |
|------|-------|------|
| `server/lib/auth.js` | 4-5 | Supabase URL + anon key hardcoded instead of using `process.env` |
| `server/lib/supabase.js` | 3-4 | Same (file is also dead — see above) |

The `.env.example` defines the env vars correctly but the code doesn't use them.
