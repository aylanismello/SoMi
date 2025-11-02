---
id: task-8
title: Introduce tab navigation with Home and Check In tabs
status: To Do
assignee: []
created_date: '2025-10-31 23:39'
updated_date: '2025-11-02 05:42'
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
Restructure the app architecture to introduce native iOS tab navigation as the primary navigation pattern. This establishes a foundation for future features while maintaining the core check-in functionality.

**Architecture Change:**
- The current MainScreen (embodiment slider + buttons) becomes a dedicated component called `SoMeCheckIn`
- Introduce a tab navigator as the new root navigation structure
- Two tabs using stock iOS UI components: "Home" and "Check In"

**Tab Structure:**

1. **Home Tab:**
   - Initially displays blank/empty screen
   - Reserved for future home screen features
   - Uses stock iOS tab bar icon and "Home" label

2. **Check In Tab:**
   - Displays the current MainScreen functionality (embodiment slider, practice buttons)
   - This becomes the `SoMeCheckIn` component
   - Uses stock iOS tab bar icon and "Check In" label

**Implementation Requirements:**
- Use React Navigation's bottom tab navigator with iOS-native styling
- Maintain all existing MainScreen functionality within the new SoMeCheckIn component
- Ensure the tab bar uses standard iOS design patterns (icons, positioning, styling)
- The check-in flow (slider → player → post-media check-in) should work seamlessly from the Check In tab
- Home tab content area remains blank for now (black background, no content)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [] #1 Embodiment slider appears in new screen when media playback completes (video or audio)
- [] #2 UI clearly indicates the media has ended
- [] #3 Screen displays prompt like 'How do you feel now?'
- [] #4 Skip button allows users to bypass check-in and return to main screen
- [] #5 OK/Go button submits the current slider value
- [] #6 After OK pressed, shows dummy feedback message (e.g., 'You are 25% more embodied')
- [] #7 Continue/Done button returns user to main screen

- [] #8 Uses the reusable EmbodimentSlider component from task-7

- [] #9 Works correctly for both video and audio/MP3 playback

- [ ] #1 Tab navigator is implemented as the root navigation structure
- [ ] #2 Two tabs are visible: Home and Check In with appropriate iOS-style icons
- [ ] #3 Home tab displays a blank screen (black background, no content)
- [ ] #4 Check In tab displays the current MainScreen functionality (embodiment slider + practice buttons)
- [ ] #5 Current MainScreen component is refactored into SoMeCheckIn component
- [ ] #6 All existing check-in functionality works correctly from the Check In tab
- [ ] #7 Tab bar uses native iOS styling and positioning (bottom of screen)
- [ ] #8 Navigation between tabs is smooth with standard iOS transitions
- [ ] #9 The full flow works: Check In tab → embodiment slider → practice selection → player → post-media check-in → back to Check In tab
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Task has been redefined. Implementation notes will be added as work progresses.
<!-- SECTION:NOTES:END -->
