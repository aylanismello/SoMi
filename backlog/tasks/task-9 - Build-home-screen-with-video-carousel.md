---
id: task-9
title: Build home screen with video carousel
status: To Do
assignee: []
created_date: '2025-11-02 06:24'
updated_date: '2025-11-02 06:28'
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
- Placeholder for thumbnail image URL will be needed
- Carousel will use this URL to display video preview images

This is an MVP feature to test the carousel interaction pattern and see how it feels in the app.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Home screen component created with minimalist layout
- [ ] #2 Carousel component implemented at bottom of screen
- [ ] #3 Carousel displays video thumbnails (using placeholder URL)
- [ ] #4 Tapping thumbnail navigates to video player
- [ ] #5 Styling matches SoMi aesthetic (black bg, white text, red accents)
- [ ] #6 Carousel is scrollable/swipeable horizontally
- [ ] #7 Layout matches provided mockup concept
- [ ] #8 Placeholder ready for thumbnail URL input
<!-- AC:END -->
