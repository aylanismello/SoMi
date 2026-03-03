---
id: task-51
title: Fix water background flicker by rendering it once at root level
status: Done
assignee: []
created_date: '2026-03-03 07:21'
updated_date: '2026-03-03 07:34'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Move WATER_BG_URI image to _layout.js as a persistent root-level background. All screens that use it (Home, Explore, Profile, FlowInit, FlowOutro) become transparent containers, inheriting the always-loaded background with zero decode delay.
<!-- SECTION:DESCRIPTION:END -->
