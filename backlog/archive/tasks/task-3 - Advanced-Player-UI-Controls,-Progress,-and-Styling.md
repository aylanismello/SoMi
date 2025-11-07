---
id: task-3
title: 'Advanced Player UI - Controls, Progress, and Styling'
status: Done
assignee: []
created_date: '2025-10-29 06:32'
updated_date: '2025-11-02 05:56'
labels:
  - ui
  - video
  - player
dependencies:
  - task-2
priority: high
ordinal: 6000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build out the full Somi Player UI with advanced controls and styling. This builds on the basic player from task-2, adding all the polished features for a production-ready experience.

**Visual Format**: TikTok-style vertical format (9:16 aspect ratio, 1080x1920) for immersive full-screen viewing.

**Design Reference**: See `/inspo/player_inspo_1.png` for UI inspiration - clean controls with central pause button, 15s skip buttons, progress bar with timestamps, and close button.

**Features to Add**:
- Custom controls overlay (15s skip back/forward, progress bar, timestamps)
- TikTok-style 9:16 aspect ratio optimization
- Tap video to toggle controls visibility
- Haptic feedback on all interactions
- Match app's minimalist aesthetic (black bg, white controls, red accents)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Player has 15-second skip backward/forward buttons
- [x] #2 Progress bar shows current time and total duration
- [x] #3 Videos display in 9:16 aspect ratio (TikTok-style vertical)
- [x] #4 Tap video to show/hide controls overlay
- [x] #5 Player matches app design: black (#000000) background, white (#ffffff) controls, red (#ff6b6b) accents
- [x] #6 Controls overlay matches design inspiration from player_inspo_1.png
<!-- AC:END -->
