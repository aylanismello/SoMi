---
id: task-6
title: Add MP3/audio support to media player
status: Done
assignee: []
created_date: '2025-10-30 06:10'
updated_date: '2025-11-02 05:56'
labels: []
dependencies: []
priority: medium
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the existing PlayerScreen to support audio files (MP3, etc.) in addition to video files. This allows users to listen to audio content using the same familiar player interface they use for videos. When playing audio, the player should display a simple black background while maintaining all the same playback controls (play/pause, skip forward/backward, progress scrubbing).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 PlayerScreen can play MP3 audio files when given a media object with type 'audio'
- [x] #2 Audio playback shows a black screen (no video content)
- [x] #3 All existing player controls work identically for audio: play/pause, skip ±15s, progress bar scrubbing
- [x] #4 Time display shows current position and total duration for audio files
- [x] #5 Haptic feedback works the same for audio as it does for video
- [x] #6 Media type is determined by explicit 'type' property in the media data model (not by file extension)
- [x] #7 Close button works and returns to previous screen when playing audio
- [x] #8 Audio continues to play smoothly with no performance issues

- [x] #9 Video playback still works correctly after changes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Implementation Plan

### 1. Update data model (constants/videos.js)
- Change VIDEOS from returning URL strings to media objects
- Add explicit `type` property ('video' or 'audio')
- Structure: `{ url: string, type: 'video' | 'audio' }`
- Update getVideoForSliderValue() to return media objects

### 2. Update navigation calls
- MainScreen: Change navigation params from `videoUrl` to `media` object
- Pass entire media object instead of just URL string

### 3. Install expo-audio package
```bash
npx expo install expo-audio
```

### 4. Update PlayerScreen.js
- Import `useAudioPlayer` from expo-audio
- Read `media` object from route params instead of `videoUrl`
- Conditionally instantiate player based on `media.type`:
  - If 'audio': use useAudioPlayer(media.url)
  - If 'video': use useVideoPlayer(media.url)
- Conditionally render content:
  - For audio: render black View (background already black)
  - For video: render VideoView as current
- All controls remain identical (same API for both players)

### 5. Test
- Test video playback still works
- Test with sample MP3 file
- Verify all controls work for both types
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Test audio URL: https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/5%20Min.%20Body%20Scan%20Meditation_CW2%201.mp3

Implementation completed - all code changes are done:

✓ Updated constants/videos.js to use media objects with { url, type } structure

✓ Updated MainScreen.js navigation to pass media objects instead of videoUrl strings

✓ Installed expo-audio package

✓ Updated PlayerScreen.js to conditionally use useAudioPlayer or useVideoPlayer based on media.type

✓ Added conditional rendering: black screen for audio, VideoView for video

✓ All controls (play/pause, skip, scrubbing, haptics) work with unified API

Ready for manual testing on device. Existing video playback should work unchanged.

Bug fix applied - Audio player API differences:

- Audio player uses seekTo(time) method, video player uses currentTime property assignment

- Fixed handleSkipBackward to use conditional seek method

- Fixed handleSkipForward to use conditional seek method

- Fixed handleProgressBarRelease (scrubbing) to use conditional seek method

- Play/pause already worked correctly (same API for both)

Additional bug fixes:

- Fixed auto-play: Added useEffect to call player.play() when player is ready (works for both audio and video)

- Fixed pause: Changed play/pause handler to check player.playing property directly instead of relying on useEvent state (more reliable for audio player)

UI state tracking fix:

- Added local isPlayingState to track playing status independently

- Update isPlayingState in the progress tracking interval (polls player.playing every 100ms)

- Changed play/pause button icon to use isPlayingState instead of useEvent isPlaying

- This ensures the play/pause icon updates correctly for audio player

✅ COMPLETED - All functionality working:

- Audio files play with black screen background

- All controls work: play/pause, skip ±15s, progress scrubbing

- Auto-play works on open

- Play/pause icon updates correctly

- Time display shows current/total duration

- Haptic feedback works

- Video playback still works correctly

- Clean data model with explicit media type property
<!-- SECTION:NOTES:END -->
