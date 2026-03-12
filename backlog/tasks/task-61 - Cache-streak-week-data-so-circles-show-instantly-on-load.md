---
id: task-61
title: Cache streak week data so circles show instantly on load
status: Done
assignee: []
created_date: '2026-03-12 02:49'
updated_date: '2026-03-12 02:51'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On first load, streakData is undefined until API resolves, so weekData=[] and the streak circles are invisible. Fix: cache streak week data in AsyncStorage (same pattern as quotes) and seed local state from cache on mount.
<!-- SECTION:DESCRIPTION:END -->
