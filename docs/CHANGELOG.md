# Changelog

## 2026-02-27 — Flow Engine v1

Complete rewrite of the routine generation system. Key changes:

**Server:**
- New `POST /api/flows/generate` endpoint replaces `/api/routines/generate`
- Block count computed server-side from `duration_minutes` (was client-side)
- Default path is now algorithmic (state filter + shuffle-without-replacement), AI is opt-in via `use_ai: true`
- Response is `{ segments, actual_duration_seconds }` — segments array includes `somi_block`, `micro_integration`, and `body_scan` types
- New `server/lib/polyvagal.js` — block filtering, selection, section assignment, deterministic explanation generation
- Removed season inference from Claude prompt (was NH-only)
- Deleted `server/lib/routines.js` (hardcoded morning/night sequences)

**Mobile:**
- `api.generateFlow()` replaces `api.generateRoutine()` with new signature
- `DailyFlowSetup.js` — removed `computeBlockCount`, `getAutoRoutineType`, `deriveIntensity`; sends new params; shows `actual_duration_seconds`
- Section labels normalised to underscores (`warm_up` not `warm-up`) everywhere
- Deleted `mobile/services/videoSelectionAlgorithm.js` and `mobile/services/routineConfig.js`
- Updated `RoutineQueuePreview.js` and `mediaService.js` to remove deleted dependencies

**DB:**
- Migration: `UPDATE somi_chain_entries SET section = 'warm_up' WHERE section = 'warm-up'`

**Docs:**
- Renamed `docs/05_routine_engine.md` -> `docs/05_flow_engine.md`
- Updated `docs/03_architecture.md` (route table, system map)

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
