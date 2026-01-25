---
id: task-15
title: Add body_scan block logging to somi_chain
status: Done
assignee: []
created_date: '2026-01-25 18:37'
updated_date: '2026-01-25 18:38'
labels:
  - feature
  - database
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Whenever a body scan occurs (initial and integration), we need to log a somi_block entry of type 'body_scan' to the somi_chain.

**Requirements:**
- Log body scan as a somi_block whenever it completes
- Use block ID 20 from somi_blocks table (canonical_name: 'body_scan', block_type: 'programmatic')
- Track time elapsed during body scan
- Works for both initial body scan (before first check-in) and integration body scan (after last block)
- Associate with active somi_chain during check-in flow

**Files:**
- components/BodyScanCountdown.js (add saveCompletedBlock call)
- CSV reference: somi_blocks_rows (5).csv (id: 20)
<!-- SECTION:DESCRIPTION:END -->
