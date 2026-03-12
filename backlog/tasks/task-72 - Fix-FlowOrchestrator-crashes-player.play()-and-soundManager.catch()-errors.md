---
id: task-72
title: 'Fix FlowOrchestrator crashes: player.play() and soundManager.catch() errors'
status: Done
assignee: []
created_date: '2026-03-12 05:26'
updated_date: '2026-03-12 05:26'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two runtime crashes in FlowOrchestrator.js introduced by the SoundManager overhaul:
1. player.play() in setTimeout has no try/catch — crashes with NativeSharedObjectNotFoundException when player is released before timeout fires
2. soundManager.playBlockStart/End().catch() crashes because SoundManager now returns undefined (not a Promise)
<!-- SECTION:DESCRIPTION:END -->
