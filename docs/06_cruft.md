# Cruft — Dead Code, Unused Files, and Debris

Audit performed 2026-02-27 against `main` branch.
**Cleanup performed 2026-02-27** — sections marked ✅ are resolved.

---

## ✅ Deleted Files (~2,841 lines removed)

| File | Lines | Reason |
|------|-------|--------|
| `mobile/App.js` | 289 | Legacy entry point — bypassed by `expo-router/entry` in package.json |
| `mobile/index.js` | 8 | `registerRootComponent` shim for the dead App.js |
| `mobile/contexts/FlowMusicContext.js` | 71 | Replaced by `stores/flowMusicStore.js` |
| `mobile/contexts/SettingsContext.js` | 37 | Replaced by `stores/settingsStore.js` |
| `mobile/components/FlowMenuScreen.js` | 370 | Not registered in any route, zero imports |
| `mobile/components/SplashScreen.js` | 70 | Only referenced in dead App.js |
| `mobile/components/EmbodimentSlider.js` | 859 | Replaced by `StateXYPicker.js`, zero imports |
| `mobile/components/CollapsibleCategorySelector.js` | 85 | Zero imports, no live UI path |
| `mobile/archived-features/MeditationTimerActive.js` | 649 | Not registered, imports non-existent component, uses dead route names |
| `mobile/archived-features/MeditationTimerSetup.js` | 263 | Not registered, navigates to dead routes |
| `mobile/archived-features/IntervalTimeSelector.js` | 134 | Only reachable from dead MeditationTimerSetup |
| `server/lib/supabase.js` | 6 | No server file imports it; all routes use auth.js |
| `mobile/app/SoMiTimer.js` | ~5 | Route re-export for unreachable screen |
| `mobile/components/SoMiTimer.js` | ~230 | Registered but never navigated to; contains ReferenceError bug (`route` undeclared) |

---

## ✅ Dead Screen Removed from Navigation

**`SoMiTimer`** — removed `<Stack.Screen name="SoMiTimer" />` from `mobile/app/_layout.js`. No component navigated to it.

---

## ✅ Dead Exports Removed from Live Files

| File | Removed |
|------|---------|
| `constants/theme.js` | `typography`, `spacing`, `borderRadius`, `withOpacity` — nobody imports these; all consumers only use `{ colors }` |
| `services/routineConfig.js` | `ROUTINE_TYPE_LABELS`, `ROUTINE_TYPE_EMOJIS` — zero imports |
| `constants/polyvagalStates.js` | `getStateByName`, `POLYVAGAL_STATES_ARRAY` — zero imports |
| `services/mediaService.js` | `getMediaForSliderValue`, `getSOSMedia`, `BODY_SCAN_MEDIA` — never called by any component |
| `services/videoSelectionAlgorithm.js` | `selectNextVideo`, `selectSOSVideo` — only called by the dead functions above |
| `constants/media.js` | Dead re-exports cleaned; now only exports `BACKGROUND_VIDEO` and `prefetchVideoBlocks` |

---

## Remaining Items (not cleaned — require more investigation or are acceptable)

### Convention Violations — Direct Supabase calls from mobile

`CLAUDE.md` rule: "DO NOT make direct Supabase calls from the mobile app."

| File | What |
|------|------|
| `components/RoutineQueuePreview.js` (line 8, ~105) | Imports `supabase` directly, queries `somi_blocks` |
| `components/CategoryDetailScreen.js` (lines 5, 53-59, 105-112) | Imports `supabase` directly, fetches blocks |

### Duplicate Routine Config

`server/lib/routines.js` and `mobile/services/routineConfig.js` define identical `ROUTINE_CONFIGS` data and the same functions. The server version is the source of truth. The mobile version is used as a fallback in `RoutineQueuePreview.js` (which is itself violating the convention above).

### Old Video API

`components/CompletionScreen.js` (line 7) — uses `import { Video } from 'expo-av'`. Rest of app uses `expo-video`. This is the only reason `expo-av` remains in `package.json`.

### Dead npm Dependencies

| Package | Why |
|---------|-----|
| `@react-navigation/bottom-tabs` | Was only imported in the deleted App.js |
| `@react-navigation/stack` | Was only imported in the deleted App.js |
| `@react-native-community/slider` | Zero imports in any source file (verify not a peer dep before removing) |

---

## TODO / HACK Comments (remaining)

| File | Line(s) | Comment |
|------|---------|---------|
| `mobile/supabase.js` | 4 | `TODO: Replace these with your actual values` — stale, credentials are filled in |
| `components/SoMiRoutineScreen.js` | 30-34 | `HACK: VIDEO DURATION CAP — All videos capped at 60s` |
| `components/SoMiRoutineScreen.js` | 602, 619 | `HACK: 60-SECOND CAP` (same thing, two call sites) |
| `components/CompletionScreen.js` | 221 | `TODO: Implement proper streak calculation` — `getStreak()` always returns `1` |

---

## Hardcoded Magic Numbers (remaining)

| File | Line | Value | What |
|------|------|-------|------|
| `components/SoMiRoutineScreen.js` | 30 | `VIDEO_DURATION_CAP_SECONDS = 60` | Temporary cap, see HACK above |
| `components/BodyScanCountdown.js` | 107 | `BODY_SCAN_BLOCK_ID = 20` | Hardcoded DB row ID |
| `components/SoMiTimer.js` | — | `TIMER_BLOCK_ID = 15` | File deleted (was hardcoded DB row ID) |

---

## Silent Bug (remaining)

### `cacheTime` → `gcTime` (React Query v5)

`mobile/app/_layout.js` line 18: `cacheTime: 10 * 60 * 1000` is silently ignored in React Query v5 (renamed to `gcTime`). Garbage collection never triggers at the intended interval.

---

## Hardcoded Credentials in Server Source (remaining)

`server/lib/auth.js` lines 4-5: Supabase URL and anon key are hardcoded. `server/.env.example` defines `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` but the code doesn't use them.
