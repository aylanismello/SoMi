---
id: task-21
title: 'Hardcode block selection algorithm for 2, 6, and 10 blocks'
status: Done
assignee: []
created_date: '2026-01-25 18:40'
updated_date: '2026-01-25 18:41'
labels:
  - feature
  - algorithm
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create a hardcoded algorithm that maps the number of blocks selected (2, 6, or 10) to specific exercises.

**Block mappings:**
- 2 blocks: vagus_reset, self_havening
- 6 blocks: vagus_reset, heart_opener, self_havening, brain_hold, freeze_roll, arm_shoulder_hand_circles
- 10 blocks: vagus_reset, self_havening, heart_opener, body_tapping, freeze_roll, arm_shoulder_hand_circles, squeeze_hands_release, ear_stretch, shaking, upward_gaze

**Requirements:**
- Create easily editable config (JSON or simple object mapping)
- Use canonical_names from somi_blocks CSV
- Integrate into check-in flow (SoMeCheckIn.js)
- When user selects 5min/10min/15min, fetch the corresponding blocks
- Should be trivial to modify and add more configurations

**Files:**
- Create: constants/blockAlgorithm.js (or similar config file)
- Modify: components/SoMeCheckIn.js (integrate algorithm)
- Reference: somi_blocks_rows (5).csv
<!-- SECTION:DESCRIPTION:END -->
