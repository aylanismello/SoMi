---
id: task-71
title: Fix flow generation and save performance bottlenecks
status: Done
assignee: []
created_date: '2026-03-12 05:17'
updated_date: '2026-03-12 05:19'
labels:
  - performance
  - backend
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
FlowOutro → completion takes 4-5s due to 13+ sequential HTTP calls. FlowInit generation slow partly due to uncached DB fetch every time.

Fixes:
1. Add /api/chain-entries/batch endpoint — 10 sequential block saves → 1 call
2. Parallelize embodiment check saves with Promise.all
3. Optimistic navigation: navigate to FlowCompletion immediately, save in background
4. Remove redundant per-entry duration recalculation (chain already has correct total)
5. Cache blocks list in generate route (avoids Supabase round-trip on every generation)
<!-- SECTION:DESCRIPTION:END -->
