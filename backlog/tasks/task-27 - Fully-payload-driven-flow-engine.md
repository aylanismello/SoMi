---
id: task-27
title: Fully payload-driven flow engine
status: Done
assignee: []
created_date: '2026-03-02 05:16'
updated_date: '2026-03-02 05:23'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Make the frontend fully data-driven from the backend payload by:
1. Adding `duration_seconds` column to `somi_blocks` Supabase table
2. Backend reads and sends `duration_seconds` in segments payload
3. Frontend uses `segment.duration_seconds` for all timing (no hardcoded constants)
4. Remove redundant `api.getBlocks()` fetch from SoMiRoutineScreen
5. Remove dual state (`hardcodedQueue`) — use segments array as single source of truth
<!-- SECTION:DESCRIPTION:END -->
