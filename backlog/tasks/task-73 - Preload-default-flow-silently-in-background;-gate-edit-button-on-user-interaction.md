---
id: task-73
title: >-
  Preload default flow silently in background; gate edit button on user
  interaction
status: Done
assignee: []
created_date: '2026-03-12 05:32'
updated_date: '2026-03-12 05:36'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Instead of blocking the UI with a spinner on initial load, fire the default flow fetch silently in the background the moment the screen opens. Edit button stays greyed/disabled until user actually changes time or state. Start button waits for preload only if it hasn't resolved yet. Re-fetch still happens on user changes (duration or state picker drag), which shows normal generating state in edit button.
<!-- SECTION:DESCRIPTION:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Follow-up: moved actual preload trigger to HomeScreen useFocusEffect so it fires while user is still on Home, not after navigating to FlowInit. Added flowPreloadCache module to dedupe and share result.
<!-- SECTION:NOTES:END -->
