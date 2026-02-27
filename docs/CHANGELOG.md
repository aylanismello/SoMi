# Changelog

## 2026-02-27 — Fix block-end sound + docs clarification

- `_layout.js`: call `setAudioModeAsync({ playsInSilentMode: true, interruptionMode: 'mixWithOthers' })` on startup so sound effects play even when the iOS silent switch is on and mix correctly with flow music
- `docs/01_product.md`: updated SoMiRoutine row to explicitly name the component (`SoMiRoutineScreen`) and describe both the video and interstitial phases

## 2026-02-27 — Dead code cleanup

Deleted 14 files (~2,841 lines), removed 1 unreachable route (`SoMiTimer`), and pruned dead named exports from 6 live files:
- Deleted: App.js, index.js, FlowMusicContext, SettingsContext, FlowMenuScreen, SplashScreen, EmbodimentSlider, CollapsibleCategorySelector, archived-features/ (3 files), server/lib/supabase.js, SoMiTimer screen (app + component)
- Removed from _layout.js: SoMiTimer Stack.Screen registration
- Trimmed from live files: typography/spacing/borderRadius/withOpacity (theme.js), ROUTINE_TYPE_LABELS/EMOJIS (routineConfig.js), getStateByName/POLYVAGAL_STATES_ARRAY (polyvagalStates.js), getMediaForSliderValue/getSOSMedia/BODY_SCAN_MEDIA (mediaService.js), selectNextVideo/selectSOSVideo (videoSelectionAlgorithm.js), dead re-exports (constants/media.js)

## 2026-02-27 — Cruft audit

Added `CRUFT.md` — comprehensive dead code and tech debt audit covering:
- 10 deletable files (~2,841 lines)
- 1 unreachable screen (SoMiTimer — registered but never navigated to, plus runtime bug)
- 12+ dead exports in live files
- 3 dead npm dependencies
- Duplicated routine config (server + mobile)
- 2 convention violations (direct Supabase calls from mobile)
- 5 TODO/HACK comments with locations
- 3 hardcoded magic numbers
- 1 silent bug (cacheTime→gcTime rename in React Query v5)
- Hardcoded credentials in server source

## 2026-02-27 — Documentation system created

Created `/docs/` with initial documentation derived from the codebase:

- **README.md** — doc index and sync guidelines
- **PRODUCT.md** — screens, features, primary loop as implemented
- **FLOWS.md** — step-by-step screen transitions
- **ARCHITECTURE.md** — system map (mobile, server, Supabase, Anthropic Claude)
- **DATA_MODEL.md** — all 4 Supabase tables with verified schema
- **ROUTINE_ENGINE.md** — AI + hardcoded routine generation logic
- **CHANGELOG.md** — this file

Updated root `CLAUDE.md` with docs maintenance workflow.
