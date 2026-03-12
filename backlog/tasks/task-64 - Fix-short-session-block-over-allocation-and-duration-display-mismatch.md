---
id: task-64
title: Fix short-session block over-allocation and duration display mismatch
status: Done
assignee: []
created_date: '2026-03-12 02:59'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two bugs fixed:
1. AI was forcing minimum 3 blocks regardless of session length (Math.max(1, blockCount-2) in claude.js)
2. EditFlowScreen was summing only somi_block durations, ignoring micro_integration and body_scan segments, causing duration display to show lower than FlowInit pill
<!-- SECTION:DESCRIPTION:END -->
