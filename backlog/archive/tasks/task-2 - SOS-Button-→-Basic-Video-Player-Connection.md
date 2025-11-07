---
id: task-2
title: SOS Button → Basic Video Player Connection
status: Done
assignee:
  - Claude
created_date: '2025-10-29 06:02'
updated_date: '2025-10-29 06:40'
labels: []
dependencies: []
priority: high
ordinal: 1000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a basic connection from the SOS button to a simple video player. This is the minimal viable player - just get video playing with basic play/pause control.

**Goal**: Establish the navigation flow and basic video playback infrastructure that can be enhanced in task-3.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SOS button on main screen navigates to a player screen
- [x] #2 Video player displays and plays a video from a URL
- [x] #3 Player has a functional play/pause button
- [x] #4 Basic navigation structure is set up (Stack Navigator)
- [x] #5 Video playback uses expo-video (SDK 54 compatible)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### 1. Install Dependencies
- Install `expo-video` for video playback (SDK 54 compatible)
- Install `@react-navigation/native` and `@react-navigation/stack` for navigation
- Install required navigation dependencies

### 2. Set Up Basic Navigation
- Wrap App.js in Stack Navigator
- Create Main screen (existing slider)
- Create basic Player screen
- Wire SOS button to navigate to Player

### 3. Create Minimal Player Component
- Use expo-video's VideoView and useVideoPlayer
- Display video with basic play/pause button
- Use placeholder video URL for testing
- Simple layout - no fancy controls yet

### 4. Testing
- Verify SOS button navigates to player
- Verify video loads and plays
- Verify play/pause works
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation completed with 'https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/overwhelmed_vagus_tone.mp4' as url. We will only be pulling from supabase.co - so our player MUST be compatible with that.

Created three new files: components/SomiPlayer.js (main player component), components/MainScreen.js (existing slider UI), components/PlayerScreen.js (player screen wrapper)

Installed dependencies: expo-av, @react-navigation/native, @react-navigation/stack, react-native-screens, react-native-safe-area-context

Navigation flow: SOS button on Main screen navigates to Player screen (full-screen modal), X button on player navigates back

Player features: 9:16 aspect ratio video, custom controls (play/pause, 15s skip back/forward, progress bar with timestamps), tap video to toggle controls visibility, haptic feedback on all interactions

Fixed SDK 54 compatibility issue: switched from deprecated expo-av to expo-video

Updated SomiPlayer to use useVideoPlayer hook and VideoView component (expo-video API)

Updated video controls to use new API: player.play(), player.pause(), player.currentTime
<!-- SECTION:NOTES:END -->
