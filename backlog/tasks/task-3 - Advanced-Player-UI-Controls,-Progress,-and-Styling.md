---
id: task-3
title: 'Advanced Player UI - Controls, Progress, and Styling'
status: To Do
assignee: []
created_date: '2025-10-29 06:32'
labels:
  - ui
  - video
  - player
dependencies:
  - task-2
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build out the full Somi Player UI with advanced controls and styling. This builds on the basic player from task-2, adding all the polished features for a production-ready experience.

**Visual Format**: TikTok-style vertical format (9:16 aspect ratio, 1080x1920) for immersive full-screen viewing.

**Design Reference**: See `/inspo/player_inspo_1.png` for UI inspiration - clean controls with central pause button, 15s skip buttons, progress bar with timestamps, and close button.

**Features to Add**:
- Custom controls overlay (15s skip back/forward, progress bar, timestamps)
- X/close button to return to main screen
- TikTok-style 9:16 aspect ratio optimization
- Multiple video source support (YouTube unlisted + Supabase storage URLs)
- Tap video to toggle controls visibility
- Haptic feedback on all interactions
- Match app's minimalist aesthetic (black bg, white controls, red accents)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Player has 15-second skip backward/forward buttons
- [ ] #2 Progress bar shows current time and total duration
- [ ] #3 X/close button navigates back to main screen
- [ ] #4 Videos display in 9:16 aspect ratio (TikTok-style vertical)
- [ ] #5 Player supports both YouTube unlisted URLs and Supabase storage URLs via props
- [ ] #6 Tap video to show/hide controls overlay
- [ ] #7 Haptic feedback on all button interactions
- [ ] #8 Player matches app design: black (#000000) background, white (#ffffff) controls, red (#ff6b6b) accents
- [ ] #9 Controls overlay matches design inspiration from player_inspo_1.png
<!-- AC:END -->
