# Archived Features

This folder contains features that have been disabled/removed from the app but kept for future reference.

## Meditation Timer (Archived 2026-01-31)

**Files:**
- `MeditationTimerSetup.js` - Timer setup screen
- `MeditationTimerActive.js` - Active timer screen with bells
- `IntervalTimeSelector.js` - Interval selection screen

**Reason for archival:**
Background audio and lock screen controls proved complex with expo-audio/expo-av. The feature was half-baked and not working properly on iOS.

**What was attempted:**
- Background audio playback
- Lock screen media controls (like Waking Up app)
- Silent audio track to keep session alive
- Meditation bells at intervals

**Issues:**
- expo-audio doesn't have lock screen API implemented yet
- expo-av requires continuous audio to stay active in background
- Complex workarounds didn't work reliably in Expo Go

**To re-enable:**
1. Uncomment the meditation timer button in `HomeScreen.js`
2. Uncomment the routes in `App.js` HomeStack
3. Add back the imports in `App.js`
4. Move files back from `archived-features/` to `components/`

**Better approach if revisiting:**
- Use `react-native-track-player` for proper lock screen support
- Or build native module for Now Playing info
- Or wait for expo-audio to implement lock screen API
