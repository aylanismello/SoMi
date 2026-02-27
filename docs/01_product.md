# Product — What SoMi Is (As Implemented)

SoMi is an iOS mobile app (Expo/React Native) that guides users through somatic exercise routines informed by polyvagal theory. Users check in with their nervous system state, receive a personalized sequence of short video-guided exercises, and check in again afterward. [VERIFIED]

## Screens

All screens verified from `mobile/app/` route files and `mobile/components/`.

### Auth


| Screen         | File                     | Purpose                                                   |
| -------------- | ------------------------ | --------------------------------------------------------- |
| Welcome        | `WelcomeScreen.js`       | Ocean video background, Sign in with Apple, email sign-in |
| Create Account | `CreateAccountScreen.js` | Email/password registration                               |


### Tabs (main navigation)


| Tab     | File               | Purpose                                                                                                            |
| ------- | ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Home    | `HomeScreen.js`    | Weekly streak display, greeting, "Flow" button to start a daily flow, music/settings access                        |
| Explore | `ExploreScreen.js` | Category pills (vagal_toning types), featured practices carousel, pre-built daily flows (5/10/15 min)              |
| Profile | `MySomiScreen.js`  | Calendar streak view, check-in history with gradient bars, stats (blocks completed, total minutes), chain deletion |


### Flow journey


| Screen            | File                   | Purpose                                                                                                                                                                                                                                     |
| ----------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| DailyFlowSetup    | `DailyFlowSetup.js`    | StateXYPicker (energy/safety), duration picker, block queue preview, routine generation                                                                                                                                                     |
| SoMiCheckIn       | `SoMiCheckIn.js`       | Pre/post-routine check-in: StateXYPicker, somatic experience tags, journal entry                                                                                                                                                            |
| BodyScanCountdown | `BodyScanCountdown.js` | 1-minute guided body scan (initial + final), ocean background                                                                                                                                                                               |
| SoMiRoutine       | `SoMiRoutineScreen.js` | Core routine player (`SoMiRoutineScreen`): renders video blocks via `VideoView` in the video phase, and an ocean-background interstitial between blocks; includes 20s integration timer, infinity mode, controls overlay, and queue editing |
| CompletionScreen  | `CompletionScreen.js`  | Celebration animation, session stats (minutes, blocks, state transformation)                                                                                                                                                                |


### Other


| Screen              | File                       | Purpose                                  |
| ------------------- | -------------------------- | ---------------------------------------- |
| RoutineQueuePreview | `RoutineQueuePreview.js`   | View/swap blocks before starting routine |
| Player              | `PlayerScreen.js`          | Standalone video player (outside flow)   |
| CategoryDetail      | `CategoryDetailScreen.js`  | Detail view for a practice category      |
| AccountSettings     | `AccountSettingsScreen.js` | Account management                       |
| SoMiTimer           | `SoMiTimer.js`             | Simple timer with breathing animation    |


## Primary Loop

1. User opens app → Home tab
2. Taps "Flow" → DailyFlowSetup
3. Sets energy/safety on 2D picker, picks duration → routine auto-generates
4. Opening check-in (SoMiCheckIn)
5. Optional body scan (BodyScanCountdown, 1 min)
6. Video blocks play sequentially (SoMiRoutine) with interstitial pauses
7. Optional closing body scan
8. Closing check-in (SoMiCheckIn) with tags + journal
9. Session saved as a chain → CompletionScreen with stats

