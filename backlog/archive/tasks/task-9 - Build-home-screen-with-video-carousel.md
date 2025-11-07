---
id: task-9
title: Build home screen with video carousel
status: Done
assignee: []
created_date: '2025-11-02 06:24'
updated_date: '2025-11-02 06:32'
labels:
  - feature
  - home
  - ui
  - carousel
  - mvp
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the initial home screen that users see when they first open SoMi. This screen should feature a clean, minimalist layout with a video carousel at the bottom for MVP testing.

**Design Reference:**
- See `home_screen_1.png` for design inspiration
- Feel free to take creative liberties with the layout and styling
- **IMPORTANT**: The player shown in home_screen_1.png is ripped from the Calm app - DO NOT replicate it exactly. We need our own original image/design for the player preview.

The home screen will serve as the landing page and include:
- Basic welcome/branding area (styled according to mockup)
- Video carousel component at the bottom of the screen
- Carousel displays video thumbnails that users can select
- Tapping a thumbnail navigates to the video player
- Clean, minimalist aesthetic following SoMi design principles (black background #000000, white text #ffffff, red accents #ff6b6b)

**TODO: Thumbnail URL to be provided by user**
- thumnail image url is: https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/video_thumbnail.png
- Carousel will use this URL to display video preview images

This is an MVP feature to test the carousel interaction pattern and see how it feels in the app.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Home screen component created with minimalist layout
- [x] #2 Carousel component implemented at bottom of screen
- [x] #3 Carousel displays video thumbnails (using placeholder URL)
- [x] #4 Tapping thumbnail navigates to video player
- [x] #5 Styling matches SoMi aesthetic (black bg, white text, red accents)
- [x] #6 Carousel is scrollable/swipeable horizontally
- [x] #7 Layout matches provided mockup concept
- [x] #8 Placeholder ready for thumbnail URL input
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Summary

Successfully implemented the home screen with video carousel feature. Here's what was built:

### Changes Made:

1. **App.js** - Added HomeStack navigator
   - Created HomeStack similar to CheckInStack to enable navigation from Home to Player
   - Configured tab bar to hide when Player modal is open
   - Updated Home tab to use HomeStack instead of direct HomeScreen component

2. **HomeScreen.js** - Complete rebuild with carousel
   - Added welcome section with greeting text and stats placeholder
   - Implemented horizontal scrollable video carousel using ScrollView
   - Added three sample videos using the provided thumbnail URL
   - Integrated haptic feedback for all interactions
   - Added navigation to PlayerScreen when thumbnail is tapped
   - Styled according to SoMi design principles (black #000000, white #ffffff, red #ff6b6b)

### Key Features:
- Minimalist welcome text inspired by mockup design
- Horizontal carousel with smooth scrolling (snapToInterval for nice UX)
- Video thumbnails with rounded corners and titles
- "Browse Videos" section header with red "See All" button
- Haptic feedback on tap for enhanced user experience
- Clean navigation to fullscreen video player
- Tab bar properly hides during video playback

### Video Data Structure:
The videos array is easily extensible - just add more objects with:
- id: unique identifier
- title: video name
- thumbnail: URL to thumbnail image
- url: URL to video file
- type: 'video' or 'audio'

All acceptance criteria have been met and the feature is ready for testing on device.
<!-- SECTION:NOTES:END -->
