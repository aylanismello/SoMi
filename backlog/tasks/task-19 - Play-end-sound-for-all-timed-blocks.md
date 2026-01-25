---
id: task-19
title: Play end sound for all timed blocks
status: Done
assignee: []
created_date: '2026-01-25 18:37'
updated_date: '2026-01-25 18:37'
labels:
  - feature
  - audio
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Play the block end sound whenever any timed block (body scan, video, integration interstitial, timer) completes, to notify user when it's time to pay attention to next thing.

**Requirements:**
- Sound URL: https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/somi%20sounds/block_end_sound.mp3
- Play at end of: body scan, media player videos/audio, integration interstitial, SoMi timer
- Already implemented in PlayerScreen and SoMiTimer using soundManager.playBlockEnd()
- Need to add to BodyScanCountdown

**Verification needed:**
- Check if soundManager has playBlockEnd() method (should be in utils/SoundManager.js)
- Confirm PlayerScreen already plays it (lines 123, 236)
- Confirm SoMiTimer already plays it (lines 135, 158)
- Add to BodyScanCountdown.js

**Files:**
- components/BodyScanCountdown.js (add soundManager.playBlockEnd())
- utils/SoundManager.js (verify implementation)
<!-- SECTION:DESCRIPTION:END -->
