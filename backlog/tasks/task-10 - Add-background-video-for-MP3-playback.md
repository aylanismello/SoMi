---
id: task-10
title: Add background video for MP3 playback
status: To Do
assignee: []
created_date: '2025-10-31 23:41'
updated_date: '2025-10-31 23:45'
labels:
  - feature
  - player
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement the background video infrastructure and auto-display it for MP3 playback. This task builds the core background video functionality that will be reused by the toggle feature.

Scope:
- Add mountain.mp4 URL to media.js constants under VISUALIZATIONS section
- Build background video player component that loops seamlessly (video has no audio track)
- Add logic to detect MP3/audio-only content
- Automatically show background video when playing MP3s
- Ensure main audio continues playing normally while background video displays
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 mountain.mp4 URL added to media.js under VISUALIZATIONS
- [ ] #2 Background video player component created that loops continuously
- [ ] #3 Player detects when content is MP3/audio-only
- [ ] #4 Background video automatically displays for MP3 playback
- [ ] #5 Main audio plays normally with background video showing
<!-- AC:END -->
