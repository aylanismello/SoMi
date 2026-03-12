---
id: task-74
title: 'Fix: filter sub-5-min flows from MY DAILY FLOWS list'
status: Done
assignee: []
created_date: '2026-03-12 06:04'
updated_date: '2026-03-12 06:05'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
MySomiScreen shows all daily_flow chains regardless of duration. Chains with < 5 minutes of play time (< 300s) should not appear in the daily flows list or calendar. Also fix the ?? fallback in FlowCompletion.js which doesn't trigger on duration_seconds = 0 (since 0 is not nullish), causing isQuickSession to incorrectly show as true for chains that have real entry data.
<!-- SECTION:DESCRIPTION:END -->
