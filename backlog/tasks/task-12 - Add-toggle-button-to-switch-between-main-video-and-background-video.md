---
id: task-12
title: Add toggle button to switch between main video and background video
status: To Do
assignee: []
created_date: '2025-10-31 23:41'
updated_date: '2025-11-01 02:35'
labels:
  - feature
  - player
  - ux
dependencies:
  - task-11
priority: high
ordinal: 2000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add a toggle button to the player overlay that lets users manually switch between the main video and the background video (built in task-11). This is purely UI and state management - the background video player already exists.

**IMPORTANT**: The toggle button should ONLY appear when playing video content. For MP3s, the background video shows automatically (task-11) and there's no toggle needed since there's no main video to switch back to.

Scope:
- Design and add toggle button to player overlay
- Toggle button only appears when playing video content (NOT for MP3s)
- Add state to track whether user wants to see main video or background video
- When toggled, show background video (from task-11) instead of main video
- Visually indicate current toggle state
- Ensure smooth transitions and that audio continues uninterrupted
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Toggle button added to player overlay UI
- [ ] #2 Toggle button ONLY appears when playing video content (not MP3s)
- [ ] #3 Toggle state managed (main video vs background video)
- [ ] #4 Clicking toggle switches between main and background video visuals
- [ ] #5 Toggle state is visually indicated to user
- [ ] #6 Main video/audio continues playing when toggled

- [ ] #7 Smooth transition between views
<!-- AC:END -->
