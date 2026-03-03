---
id: task-49
title: 'Fix FlowBodyScan flash, completion navigation, and background image flicker'
status: Done
assignee: []
created_date: '2026-03-03 04:51'
updated_date: '2026-03-03 04:55'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three UI bugs to fix:
1. Transitioning in/out of FlowBodyScan briefly exposes the Home tab underneath (flash)
2. After completing a flow past the congrats screen, app lands on Profile tab instead of Home
3. FlowInit background image (water_1.jpg) flickers black on load; Explore and Profile screens should share the same background image, all preloaded at startup
<!-- SECTION:DESCRIPTION:END -->
