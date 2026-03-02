---
id: task-40
title: Always save sessions; show partial streak progress on home screen
status: Done
assignee: []
created_date: '2026-03-02 09:34'
updated_date: '2026-03-02 09:35'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Sessions shorter than 60 seconds (by block-only time) are currently discarded entirely, preventing partial progress from showing on the home screen streak ring. Fix: remove the time gate from FlowOutro, always save, and move the "too quick" warning into FlowCompletion.
<!-- SECTION:DESCRIPTION:END -->
