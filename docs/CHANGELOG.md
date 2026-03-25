# Changelog

## 2026-03-24 — Haptic feedback on flow completion

**Mobile:**
- `mobile/components/Flow/FlowCompletion.tsx` — Replaced initial notification haptic with a subtle 2-tap medium impact pattern (200ms gap) on mount, reinforcing the somatic "Bodyfullness" philosophy.

---

## 2026-03-12 — Body Scan Toggles full integration

**Mobile:**
- `mobile/components/Flow/FlowInit.js` — Added body scan toggle UI (Opening/Closing Body Scan switches) visible when `duration_minutes >= 8`. Added `pendingRegenRef` to handle toggles during active generation; final block re-fires with latest store state.

**Server:**
- `server/lib/claude.js` — `generateAIRoutine()` now accepts `hasScanStart`/`hasScanEnd` and injects a `scanContext` line into the Claude prompt so the AI knows whether body scans handle boundary settling.
- `server/app/api/flows/generate/route.js` — Passes `hasScanStart`/`hasScanEnd` to `generateAIRoutine`.

**Docs:**
- `docs/05_flow_engine.md` — Added "Body Scan Toggles" section documenting availability, time-budget math, UI behaviour, race condition handling, and AI behaviour.

---

## 2026-03-11 — Fix short-session block over-allocation + duration display mismatch

**Server:**
- `server/lib/claude.js` — `generateAIRoutine()` now builds conditional structure requirements based on `block_count`: 1 block → main only; 2 blocks → warm-up + main; 3+ → warm-up + main + integration. Removes `Math.max(1, blockCount - 2)` which was forcing a minimum of 3 blocks regardless of session length. System prompt updated to make warm-up and integration conditional phases.

**Mobile:**
- `mobile/components/Flow/EditFlowScreen.js` — `totalSecs` now sums all segment types (somi_block + micro_integration + body_scan), matching the server's `actual_duration_seconds` formula. Previously only somi_block durations were counted, causing the EditFlow duration display to show ~30% less than the FlowInit pill.

**Docs:**
- `docs/05_flow_engine.md` — addendum added

## 2026-03-11 — Context-aware flow generation (Flow Engine v2)

Refactored the flow generation system to support richer session context modeling. Context-aware generation is now the default path; the old algorithmic path is preserved as a fallback.

**Server:**
- New `server/lib/sessionContext.js` — structured session context model that processes optional signals (time of day, chronotype, sleep/wake, weather, season, inferred need, support mode, recent usage)
- `server/lib/claude.js` — rewrote prompts to accept full session context; added `rationale` field for system interpretability; removed intensity parameter; added contextual signal guidance sections
- `server/app/api/flows/generate/route.js` — accepts optional context fields (`local_hour`, `timezone`, `chronotype`, `weather`, etc.); always uses context-aware path; algorithmic path wiring commented out but preserved; `use_ai` accepted for backward compat but ignored

**Mobile:**
- `mobile/services/api.js` — sends `local_hour` and `timezone` instead of `use_ai`
- `mobile/components/Flow/FlowInit.js` — removed `useAi` state, `useAiRef`, and `handleToggleAi`; sends local time context on every generation
- `mobile/components/Flow/FlowPlanSheet.js` — removed AI toggle switch UI and related styles

**Docs:**
- `docs/05_flow_engine.md` — rewritten for v2 (session context model, context-aware path, updated endpoint spec)
- `docs/03_architecture.md` — updated system map, route table, and component descriptions

## 2026-02-27 — Segments as source of truth (Flow Engine v1 cont.)

The `segments` array from the server now drives the player end-to-end. Key changes:

- `routineStore.js`: added `segments[]`, `segmentIndex`, `advanceSegment()`, `setSegmentIndex()`
- `SoMiRoutineScreen.js`: rewritten as thin orchestrator — walks `segments[segmentIndex]`, dispatches by type
- New `FlowIntegration.js`: renders `micro_integration` segments (20s interstitial, ocean bg, preview card)
- New `FlowVideoPlayer.js`: renders `somi_block` segments (60s video playback)
- `body_scan` segments trigger navigation to `BodyScanCountdown` screen
- `DailyFlowSetup.js`: passes full segments array to `initializeRoutine()`
- `FlowProgressHeader.js`: derives body scan presence from segments (no longer reads settingsStore)
- `BodyScanCountdown.js`: fixed section label `'warm-up'` → `'warm_up'`
- Updated `docs/somi_flow_enginev1.md` with client architecture section and file map

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
