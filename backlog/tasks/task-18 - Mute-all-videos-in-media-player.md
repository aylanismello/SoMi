---
id: task-18
title: Mute all videos in media player
status: Done
assignee: []
created_date: '2026-01-25 18:37'
updated_date: '2026-01-25 18:37'
labels:
  - bug
  - media
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
All videos playing in the media player must be muted by default with no way to unmute them. Videos were uploaded with sound by mistake, but they're meant to be silent.

**Requirements:**
- All video players in PlayerScreen must be muted
- No option to unmute (remove any unmute controls if they exist)
- Background video is already muted (line 49), but main content video may not be

**Files:**
- components/PlayerScreen.js (lines 40-44, video player configuration)
<!-- SECTION:DESCRIPTION:END -->
