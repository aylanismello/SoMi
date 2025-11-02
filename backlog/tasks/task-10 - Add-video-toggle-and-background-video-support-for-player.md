---
id: task-10
title: Add video toggle and background video support for player
status: To Do
assignee: []
created_date: '2025-10-31 23:39'
labels:
  - feature
  - player
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Enhance the player component with the ability to toggle between the main video and a looping background video. This feature provides visual variety and automatically displays a calming background video when playing audio-only content.

Key requirements:
- Add mountain.mp4 URL to media.js constants: https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/mountain.mp4
- Add toggle button in player overlay to switch between main video and background video
- Background video plays on loop with no sound
- Main video/audio continues playing normally (only visuals change)
- For MP3/audio files, automatically show the background video instead of blank screen
- Background video should be muted and loop seamlessly
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 mountain.mp4 URL added to media.js constants file
- [ ] #2 Toggle button appears in player overlay UI
- [ ] #3 Toggle button switches between main video and background video visuals
- [ ] #4 Background video loops continuously without sound
- [ ] #5 Main audio/video sound continues playing when background video is shown
- [ ] #6 MP3 playback automatically displays background video
- [ ] #7 Background video plays smoothly without audio
- [ ] #8 Toggle state is visually indicated to user
<!-- AC:END -->
