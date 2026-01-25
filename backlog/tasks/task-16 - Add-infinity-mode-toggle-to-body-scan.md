---
id: task-16
title: Add infinity mode toggle to body scan
status: Done
assignee: []
created_date: '2026-01-25 18:37'
updated_date: '2026-01-25 18:43'
labels:
  - feature
  - ui
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Add an infinity emoji (∞) button toggle in the body scan UX that disables the timer and loops forever.

**Requirements:**
- Infinity toggle button in BodyScanCountdown UI
- When enabled: timer turns off, music loops (starts over when finished), text keeps updating at intervals
- Time logging continues to count up while infinity mode is active
- User can disable infinity mode to return to normal countdown
- Posted time should be accurate when they finally exit

**UX considerations:**
- Where to place the toggle (header area with Skip/Close buttons?)
- Visual feedback for infinity mode being active
- How to indicate the loop is active vs normal countdown

**Files:**
- components/BodyScanCountdown.js
<!-- SECTION:DESCRIPTION:END -->
