---
id: task-47
title: Fix music selection persistence and playback reliability through flow
status: Done
assignee: []
created_date: '2026-03-02 22:28'
updated_date: '2026-03-02 22:30'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three bugs in music system:
1. SoMiRoutineScreen only starts music when isQuickRoutine=true — daily flows with no body scan are completely silent
2. Two duplicate effects in SoMiRoutineScreen both respond to isMusicEnabled and set volume (redundant/conflicting)
3. flowMusicStore.startFlowMusic doesn't stop prior volume animations, so a lingering fade-out can drive volume back to 0 during the next fade-in
<!-- SECTION:DESCRIPTION:END -->
