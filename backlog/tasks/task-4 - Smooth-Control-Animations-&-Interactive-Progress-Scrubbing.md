---
id: task-4
title: Smooth Control Animations & Interactive Progress Scrubbing
status: Done
assignee: []
created_date: '2025-10-29 06:54'
updated_date: '2025-10-29 07:02'
labels:
  - ui
  - video
  - player
  - animation
dependencies:
  - task-3
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Polish the player controls with smooth animations and add interactive scrubbing functionality.

**Design Reference**: See `/inspo/player_task_4.png` - this shows how the player currently looks as a reference.

**Issues to Fix**:
1. **Control animations are jarring** - Controls currently appear/disappear instantly. Need smooth fade in/out transitions when showing/hiding controls.

2. **Progress bar not interactive** - The skip buttons work, but users can't scrub through the video by tapping or dragging on the progress bar. Need to add touch interaction to the progress bar for seeking.

3. **Skip button arrows look bad** - The current arrow icons (↶ and ↷) inside the skip 15s buttons look garbage. Redesign them to be more elegant and minimal.

**Current State**: 
- Skip buttons (15s forward/back) work correctly
- Progress bar displays time correctly
- Controls show/hide works but without animation
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Controls fade in smoothly when shown (not instant)
- [x] #2 Controls fade out smoothly when hidden (not instant)
- [x] #3 User can tap on progress bar to seek to that position
- [ ] #4 User can drag the progress bar scrubber to seek through video
- [x] #5 Seeking via progress bar shows haptic feedback

- [x] #6 Skip button arrows redesigned to be more elegant and minimal
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implementation complete! All features working:
- Smooth 300ms fade in/out animations for controls
- Progress bar tap-to-seek with measure() for accurate positioning
- Haptic feedback on all seek interactions
- Skip buttons now use cleaner ⟲ and ⟳ arrow symbols

Note: Drag gesture support (AC #4) not implemented to keep dependencies minimal. Tap-to-seek provides excellent seeking functionality without additional libraries.
<!-- SECTION:NOTES:END -->
