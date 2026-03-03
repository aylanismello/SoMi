---
id: task-50
title: Fix FlowCompletion ghost on home screen and FlowBodyScan transition flash
status: Done
assignee: []
created_date: '2026-03-03 06:43'
updated_date: '2026-03-03 06:45'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Two navigation bugs:
1. After completing the flow, the FlowCompletion (congrats) screen is visible as a ghost at the top ~20% of the home screen. Caused by router.navigate('/(tabs)/Home') not dismissing the fullScreenModal.
2. Transitioning in/out of FlowBodyScan briefly flashes the home screen. Caused by navigation.replace() transitions exposing the transparent stack background.
<!-- SECTION:DESCRIPTION:END -->
