---
id: task-41
title: >-
  Fix duration_seconds always NULL — include in chain creation POST instead of
  separate PATCH
status: In Progress
assignee: []
created_date: '2026-03-02 18:14'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
duration_seconds on somi_chains is always NULL. Current approach: POST /chains to create chain (NULL duration), then PATCH /chains/:id to update it. PATCH silently does nothing (Supabase .update() without .select() returns no error even when 0 rows match). Fix: pass totalPlaySeconds directly into the POST /chains body so it's set at creation time. Remove the dead PATCH endpoint.
<!-- SECTION:DESCRIPTION:END -->
