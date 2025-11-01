---
id: task-7
title: Refactor embodiment slider into reusable component
status: Done
assignee: []
created_date: '2025-10-31 23:39'
updated_date: '2025-10-31 23:51'
labels:
  - refactoring
  - component
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extract the embodiment slider functionality from its current location into a standalone, reusable component that can be used across different parts of the app.

This will enable the slider to be used in multiple contexts (e.g., as an interstitial screen before media playback) without code duplication.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Embodiment slider is extracted into a separate component file
- [x] #2 Component accepts necessary props for customization
- [x] #3 Component maintains all existing functionality
- [x] #4 Component can be imported and used in multiple locations
- [x] #5 Existing usage is updated to use the new component
<!-- AC:END -->
