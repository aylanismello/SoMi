---
id: task-39
title: >-
  Fix somi_chain duration_seconds: track actual client-side play time for
  correct streaks
status: Done
assignee: []
created_date: '2026-03-02 09:12'
updated_date: '2026-03-02 09:19'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
**Bugs:**
1. `somi_chains.duration_seconds` is NULL (never reliably set) 
2. Even when set, it only reflects somi_block time (4 blocks × 60s = 240s), missing micro-integration time (4 × 20s = 80s). Total should be 320s > 300s streak threshold, but is computed as 240s < 300s → streak = 0
3. Streaks route sums `somi_chain_entries.seconds_elapsed` (block-only time), ignoring interstitial/body-scan time

**Root cause:** `duration_seconds` must represent actual client-side play time (blocks + interstitials, minus paused time). This cannot be computed server-side — the client knows actual playback.

**Fix:**
- Track interstitial (micro_integration) play time in client session storage
- After completing a daily flow session, compute total play seconds (blocks + interstitials) client-side
- PATCH the chain's `duration_seconds` with this total after uploading all entries
- Streaks route uses `chain.duration_seconds` (with fallback to entry sum for old/quick-routine chains)
<!-- SECTION:DESCRIPTION:END -->
