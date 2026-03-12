---
id: task-69
title: Fix 5 low-hanging code quality issues
status: Done
assignee: []
created_date: '2026-03-12 04:37'
updated_date: '2026-03-12 04:38'
labels: []
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fix small, safe, self-contained issues identified in codebase audit:
1. cacheTime → gcTime (React Query v5 silent bug)
2. Remove emoji debug console.log from api.js
3. Remove stale TODO comment from supabase.js
4. Replace expo-av Video with expo-video in FlowCompletion.js
5. Remove dead npm dependencies (bottom-tabs, stack, slider, expo-av)
<!-- SECTION:DESCRIPTION:END -->
