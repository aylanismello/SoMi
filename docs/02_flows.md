# Flows — Screen Transitions

All flows verified from navigation code in `mobile/app/_layout.js` and component implementations.

## Auth Flow

1. App launches → `index.js` checks auth state
2. If unauthenticated → `(auth)/welcome`
   - Tap "Sign in with Apple" → Apple auth → redirect to `(tabs)/Home`
   - Tap email sign-in → `SignInModal` → auth → redirect to `(tabs)/Home`
   - Tap "Create Account" → `(auth)/create-account` → register → redirect to `(tabs)/Home`
3. If authenticated → `(tabs)/Home`

## Daily Flow (primary loop)

1. **Home** → tap "Flow" button → navigate to `DailyFlowSetup`
2. **DailyFlowSetup**
   - User drags 2D StateXYPicker (energy 0-100, safety 0-100)
   - User picks duration (1-60 min, default 10)
   - App calls `POST /api/flows/generate` with state + duration
   - Block queue preview displayed (body scan bookends if enabled in settings)
   - Tap "Start Flow" → navigate to `SoMiCheckIn` (opening)
3. **SoMiCheckIn (opening)**
   - User confirms/adjusts energy+safety on StateXYPicker
   - Check saved to session (AsyncStorage, not yet to server)
   - Navigate to `BodyScanCountdown` (initial) if `bodyScanStart` enabled, else `SoMiRoutine`
4. **BodyScanCountdown (initial)** — 1 min countdown, ocean background
   - Flow music starts here
   - Block saved (BODY_SCAN_BLOCK_ID = 20, section: "warm-up")
   - Navigate to `SoMiRoutine`
5. **SoMiRoutine** — loops through video blocks:
   - Phase: `video` — plays current block video (muted, VIDEO_DURATION_CAP = 60s)
   - Phase: `interstitial` — 20s pause with integration message (rotating every 10s)
   - User can: pause/resume, skip block, toggle infinity mode on interstitial, edit queue, access settings
   - Each completed block saved to session
   - After last block → navigate to `BodyScanCountdown` (final) if `bodyScanEnd` enabled, else `SoMiCheckIn` (closing)
6. **BodyScanCountdown (final)** — 1 min countdown
   - Block saved (BODY_SCAN_BLOCK_ID = 20, section: "integration")
   - Navigate to `SoMiCheckIn` (closing)
7. **SoMiCheckIn (closing)**
   - User sets energy+safety, selects somatic experience tags, optional journal entry
   - On submit: `createChainFromSession()` — batch creates chain + uploads all checks + entries to server
   - Navigate to `CompletionScreen`
8. **CompletionScreen**
   - Shows celebration animation, session stats (total minutes, blocks, state transformation)
   - Flow music stops
   - Tap "Continue" → navigate to Home

## Quick Routine Flow [INFERRED]

Referenced in `chainService.js` and `routineStore.js` as `flowType: 'quick_routine'`. Appears to use direct API calls (not session buffering) for saving blocks/checks. Flow type `'single_block'` also referenced in routineStore. The exact entry point for quick routines from the UI is through the Explore tab's pre-built flows.

## Timer Flow

1. Navigate to `SoMiTimer` (entry point: UNKNOWN — no direct navigation found in main tabs)
2. Timer counts down (MM:SS), breathing animation plays
3. On finish: saves block (TIMER_BLOCK_ID = 15)
4. Navigate back

## Explore Tab

- Search bar filters practices
- Category pills: vagal_toning, havening, humming, movement, gaze_work, etc.
- Tap category → `CategoryDetail`
- Featured practices carousel with play buttons
- Daily Flows section: 6 pre-built flows (Wake Up 5min, Wind Down 5min, Morning Flow 10min, Deep Rest 10min, Full Morning 15min, Night Restore 15min)

## Stubbed / Partially Wired

- **SoMiTimer**: registered in navigation stack but entry point from UI is not obvious [INFERRED]
- **Streak count** on CompletionScreen: shows "TODO" placeholder [VERIFIED — comment in CompletionScreen.js]
- **Customization modal** on Home: toggles for music, SFX, body scan start/end [VERIFIED]

---

## Navigation Diagrams

Each node shows the screen name, filenames, and key UI elements.

### 1. Auth Flow

```mermaid
flowchart TD
    INDEX["index.js<br/>─────────────────────<br/>auth state check on launch"]

    WELCOME["WelcomeScreen<br/>welcome.js · WelcomeScreen.js<br/>─────────────────────<br/>ocean video background<br/>Sign in with Apple btn<br/>email sign-in link · Create Account link"]

    SIGNIN["SignInModal<br/>SignInModal.js<br/>─────────────────────<br/>email + password fields<br/>submit btn"]

    CREATE["CreateAccountScreen<br/>create-account.js · CreateAccountScreen.js<br/>─────────────────────<br/>email + password fields<br/>register btn"]

    HOME["HomeScreen<br/>Home.js · HomeScreen.js"]

    INDEX -->|"authenticated"| HOME
    INDEX -->|"unauthenticated"| WELCOME
    WELCOME -->|"Sign in with Apple"| HOME
    WELCOME -->|"tap email sign-in"| SIGNIN
    SIGNIN -->|"auth success"| HOME
    WELCOME -->|"tap Create Account"| CREATE
    CREATE -->|"register success"| HOME
```

---

### 2. Main Tabs

```mermaid
flowchart LR
    TABBAR["Tab Bar"]

    HOME["HomeScreen<br/>Home.js · HomeScreen.js<br/>─────────────────────<br/>greeting · weekly streak<br/>Flow button<br/>music / settings access"]

    EXPLORE["ExploreScreen<br/>Explore.js · ExploreScreen.js<br/>─────────────────────<br/>search bar<br/>category pills<br/>featured carousel<br/>daily flows 5 / 10 / 15 min"]

    PROFILE["MySomiScreen<br/>Profile.js · MySomiScreen.js<br/>─────────────────────<br/>calendar streak view<br/>check-in history<br/>stats: blocks · minutes<br/>chain deletion"]

    TABBAR --> HOME & EXPLORE & PROFILE
```

---

### 3. Daily Flow Journey

```mermaid
flowchart TD
    HOME["HomeScreen<br/>Home.js · HomeScreen.js<br/>─────────────────────<br/>Flow button"]

    SETUP["DailyFlowSetup<br/>DailyFlowSetup.js<br/>─────────────────────<br/>StateXYPicker: energy + safety<br/>duration picker 1–60 min<br/>block queue preview<br/>Start Flow btn"]

    CHECKIN_OPEN["SoMiCheckIn — opening<br/>SoMiCheckIn.js<br/>─────────────────────<br/>StateXYPicker confirmation<br/>energy + safety"]

    BODYSCAN_INIT["BodyScanCountdown — initial<br/>BodyScanCountdown.js<br/>─────────────────────<br/>1 min countdown · ocean bg<br/>flow music starts here"]

    ROUTINE["SoMiRoutine<br/>SoMiRoutine.js · SoMiRoutineScreen.js<br/>─────────────────────<br/>video phase: VideoView blocks<br/>interstitial: 20s integration msg<br/>pause · skip · infinity mode<br/>queue editing"]

    BODYSCAN_FINAL["BodyScanCountdown — final<br/>BodyScanCountdown.js<br/>─────────────────────<br/>1 min countdown<br/>integration section"]

    CHECKIN_CLOSE["SoMiCheckIn — closing<br/>SoMiCheckIn.js<br/>─────────────────────<br/>energy + safety<br/>somatic experience tags<br/>journal entry<br/>submit → saves chain to server"]

    COMPLETION["CompletionScreen<br/>CompletionScreen.js<br/>─────────────────────<br/>celebration animation<br/>session stats: mins · blocks · delta<br/>Continue btn"]

    HOME -->|"tap Flow"| SETUP
    SETUP -->|"tap Start Flow"| CHECKIN_OPEN
    CHECKIN_OPEN -->|"bodyScanStart ON"| BODYSCAN_INIT
    CHECKIN_OPEN -->|"bodyScanStart OFF"| ROUTINE
    BODYSCAN_INIT --> ROUTINE
    ROUTINE -->|"done + bodyScanEnd ON"| BODYSCAN_FINAL
    ROUTINE -->|"done + bodyScanEnd OFF"| CHECKIN_CLOSE
    BODYSCAN_FINAL --> CHECKIN_CLOSE
    CHECKIN_CLOSE -->|"submit"| COMPLETION
    COMPLETION -->|"Continue"| HOME
```

---

### 4. Explore Sub-Navigation

```mermaid
flowchart TD
    EXPLORE["ExploreScreen<br/>Explore.js · ExploreScreen.js<br/>─────────────────────<br/>search bar · category pills<br/>featured practices carousel<br/>daily flows section"]

    CATEGORY["CategoryDetailScreen<br/>CategoryDetail.js · CategoryDetailScreen.js<br/>─────────────────────<br/>practice list for category<br/>play buttons"]

    PLAYER["PlayerScreen<br/>Player.js · PlayerScreen.js<br/>─────────────────────<br/>standalone video player<br/>PlayerControls.js"]

    ROUTINE["SoMiRoutine — quick flow<br/>SoMiRoutine.js · SoMiRoutineScreen.js"]

    EXPLORE -->|"tap category pill"| CATEGORY
    EXPLORE -->|"tap practice play"| PLAYER
    EXPLORE -->|"tap daily flow"| ROUTINE
    CATEGORY -->|"tap practice"| PLAYER
```

---

### 5. Home Modals & Settings

```mermaid
flowchart TD
    HOME["HomeScreen<br/>Home.js · HomeScreen.js"]

    CUSTOM["CustomizationModal<br/>CustomizationModal.js<br/>─────────────────────<br/>music toggle<br/>SFX toggle<br/>body scan start / end toggles"]

    SETTINGS["AccountSettingsScreen<br/>AccountSettings.js · AccountSettingsScreen.js<br/>─────────────────────<br/>account management"]

    SETUP["DailyFlowSetup<br/>DailyFlowSetup.js"]

    QUEUE["RoutineQueuePreview<br/>RoutineQueuePreview.js<br/>─────────────────────<br/>view + swap blocks before start"]

    HOME -->|"settings icon"| CUSTOM
    HOME -->|"account"| SETTINGS
    SETUP -->|"tap queue preview"| QUEUE
```
