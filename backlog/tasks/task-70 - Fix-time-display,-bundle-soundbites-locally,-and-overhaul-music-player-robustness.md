---
id: task-70
title: >-
  Fix time display, bundle soundbites locally, and overhaul music player
  robustness
status: In Progress
assignee: []
created_date: '2026-03-12 05:09'
labels:
  - audio
  - bug
  - ux
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three improvements:
1. "0m ago" → "just now" for sub-1-minute flows in MySomiScreen
2. Bundle start/end sound effects as local assets (no network dependency)
3. Full music player refactor: fix never-starts bug, AirPods disconnect recovery, volume listener race condition
<!-- SECTION:DESCRIPTION:END -->
