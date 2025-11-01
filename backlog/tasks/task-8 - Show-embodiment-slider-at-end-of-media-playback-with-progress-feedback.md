---
id: task-8
title: Show embodiment slider at end of media playback with progress feedback
status: To Do
assignee: []
created_date: '2025-10-31 23:39'
updated_date: '2025-11-01 02:40'
labels:
  - feature
  - ux
dependencies:
  - task-7
priority: high
ordinal: 3000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement a post-media check-in screen that shows the embodiment slider when any media (video or audio) completes playback. This creates a mindful moment for users to assess how they feel after the practice.

**Flow:**
1. Media (video or audio/MP3) plays to completion
2. When media ends, show new screen with:
   - Clear indication that media has ended
   - Embodiment slider (reusable component from task-7)
   - Text prompt: "How do you feel now?" (or similar)
   - "Skip" button to bypass and return
   - "OK" or "Go" button to submit

3. When user presses OK/Go:
   - Calculate difference between beginning state (from initial slider selection) and current state
   - Show feedback message: "You are X% more embodied" (dummy calculation for now)
   - Display "Continue" or "Done" button to return to main screen

**Future Feature Note:** 
The actual percentage calculation comparing initial vs final embodiment state will be implemented later. For now, just show a placeholder/dummy percentage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Embodiment slider appears in new screen when media playback completes (video or audio)
- [x] #2 UI clearly indicates the media has ended
- [x] #3 Screen displays prompt like 'How do you feel now?'
- [x] #4 Skip button allows users to bypass check-in and return to main screen
- [x] #5 OK/Go button submits the current slider value
- [x] #6 After OK pressed, shows dummy feedback message (e.g., 'You are 25% more embodied')
- [x] #7 Continue/Done button returns user to main screen

- [x] #8 Uses the reusable EmbodimentSlider component from task-7

- [x] #9 Works correctly for both video and audio/MP3 playback
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
**Implementation Summary:**

Created a new `PostMediaCheckIn` screen component that appears when media playback completes. The screen has two states:

1. **Check-in State:**
   - Displays "Practice Complete" header
   - Shows EmbodimentSlider with "how do you feel now?" prompt
   - Skip button to bypass and return to main screen
   - OK button to proceed to feedback

2. **Feedback State:**
   - Shows "Practice Complete" header
   - Displays dummy percentage calculation comparing initial vs current embodiment
   - Done button to return to main screen

**Key Implementation Details:**
- Added `PostMediaCheckIn` component to navigation stack in `App.js`
- Updated `MainScreen` to pass `initialValue` (slider value) when navigating to Player
- Updated `PlayerScreen` to:
  - Receive and store `initialValue` from route params
  - Detect media completion using `useEffect` watching `currentTime >= duration - 1`
  - Navigate to PostMediaCheckIn using `navigation.replace()` when media completes
- Uses `navigation.reset()` to properly return to Main screen and avoid navigation stack corruption
- Uses reusable `EmbodimentSlider` component from task-7
- Implements haptic feedback for all button interactions
- Works for both video and audio playback

**Files Modified:**
- `/components/PostMediaCheckIn.js` (new file)
- `/App.js` (added screen to navigator)
- `/components/MainScreen.js` (pass initialValue)
- `/components/PlayerScreen.js` (detect completion, navigate to check-in)
<!-- SECTION:NOTES:END -->
