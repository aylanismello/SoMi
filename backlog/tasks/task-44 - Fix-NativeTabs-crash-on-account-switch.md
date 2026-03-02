---
id: task-44
title: Fix NativeTabs crash on account switch
status: In Progress
assignee: []
created_date: '2026-03-02 19:56'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Crash: "Cannot read property 'stale' of undefined" in TabRouter.js when switching accounts. NativeTabs remounts with stale navigation state when user changes. Fix by keying NativeTabs on user ID.
<!-- SECTION:DESCRIPTION:END -->
