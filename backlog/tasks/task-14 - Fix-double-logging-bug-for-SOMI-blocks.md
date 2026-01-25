---
id: task-14
title: Fix double logging bug for SOMI blocks
status: Done
assignee: []
created_date: '2026-01-25 18:37'
updated_date: '2026-01-25 18:38'
labels:
  - bug
  - database
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
SOMI blocks (exercises) are being double-logged to the database, as shown in the screenshot where "Ear Stretch" appears twice and "Freeze Roll" appears twice in a single check-in session.

**Investigation needed:**
- PlayerScreen.js has `hasSavedRef` to prevent duplicate saves, but blocks are still appearing twice
- saveCompletedBlock is called in two places: when media ends and when user closes
- Need to determine if the issue is in the save logic or if blocks are being played twice

**Context:**
- Screenshot shows duplicate entries in My SoMi history
- File: components/PlayerScreen.js (lines 56-87, 118-145, 231-257)
- Service: supabase.js somiChainService.saveCompletedBlock
<!-- SECTION:DESCRIPTION:END -->
