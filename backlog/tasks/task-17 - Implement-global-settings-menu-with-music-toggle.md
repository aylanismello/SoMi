---
id: task-17
title: Implement global settings menu with music toggle
status: Done
assignee: []
created_date: '2026-01-25 18:37'
updated_date: '2026-01-25 18:40'
labels:
  - feature
  - ui
  - refactor
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Replace the current volume rocker and media toggle in PlayerScreen with a settings gear icon that opens a modal with check-in-wide settings.

**Requirements:**
1. **Settings Icon Placement:**
   - Add gear icon (⚙️ emoji or Ionicons) in top-left of all screens: Check In, Body Scan, Player, Timer
   - Should be in same/similar position across all screens for consistency
   - Replaces current volume and mountain toggle buttons in PlayerScreen

2. **Settings Modal:**
   - Opens when gear icon pressed
   - Shows "SoMi Check-In Settings" title
   - Initially contains: Music toggle (mute/unmute audio)
   - Settings persist for entire check-in session
   - If toggled off, music doesn't play in body scan, player, or any other part of flow
   - If toggled on, music plays normally everywhere

3. **Implementation approach:**
   - Create shared settings context/state
   - Settings modal component (reusable)
   - Update PlayerScreen, BodyScanCountdown, SoMiTimer to respect music setting
   - Remove current volume/media toggles from PlayerScreen

**Files:**
- Create: components/SettingsModal.js (or similar)
- Modify: components/PlayerScreen.js, components/BodyScanCountdown.js, components/SoMiTimer.js, components/SoMeCheckIn.js
- Consider: Context API or simple state management for settings
<!-- SECTION:DESCRIPTION:END -->
