---
id: task-5
title: Slider with Polyvagal State Labels + SoMi Time Button → Video Player
status: Done
assignee: []
created_date: '2025-10-29 07:45'
updated_date: '2025-11-02 05:56'
labels:
  - ui
  - slider
  - video
  - mvp
dependencies:
  - task-4
priority: high
ordinal: 4000
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Build the core MVP flow: slider with polyvagal state labels and a "SoMi Time" button that plays the corresponding video.

**Polyvagal State Labels (0-100 slider ranges):**
Based on polyvagal ladder (bottom to top):
- **0-20 (Dorsal Vagal - Shutdown)**: "Withdrawn", "Still", "Conserving", "Quiet"
- **20-40 (Dorsal→Sympathetic transition)**: "Stirring", "Mobilizing", "Awakening", "Emerging"
- **40-60 (Sympathetic - Fight/Flight)**: "Activated", "Alert", "Energized", "Moving"
- **60-80 (Sympathetic→Ventral transition)**: "Settling", "Centering", "Softening", "Easing"
- **80-100 (Ventral Vagal - Social Engagement)**: "Connected", "Open", "Engaged", "Present"

All labels should be embodiment-focused, neutral/positive (never negative or pathologizing). Research polyvagal theory and refine these to be accurate yet inviting.

**Slider Behavior:**
- Slider ranges from 0-100 (no value displayed)
- As user slides, text label fades out/in smoothly between states
- While finger is down: continuous fade transitions as slider crosses thresholds
- When finger lifts: animation completes to final state label
- Ghost-like, subtle text transitions

**SoMi Time Button:**
- Add new button horizontally next to SOS button
- Different color (maybe blue or another accent)
- Label: "SoMi Time" (or suggest better name)
- Same size/style as SOS button
- Takes current slider value and navigates to PlayerScreen with corresponding video

**Video Mapping (Mock for now):**
- Create `constants/videos.js` file
- Map each slider range to a video:
  - 0-20 (dorsal) → video 1
  - 20-40 (transition) → video 2
  - 40-60 (sympathetic) → video 3
  - 60-80 (transition) → video 4
  - 80-100 (ventral) → video 5
- Add SOS video to constants (currently hardcoded on PlayerScreen.js line 7)
- For MVP, all 6 videos (5 slider + 1 SOS) point to same source: `https://qujifwhwntqxziymqdwu.supabase.co/storage/v1/object/public/test/output_tiktok.mp4`
- Include helper function `getVideoForSliderValue(value)` that returns appropriate video
- Export SOS video from constants

**Remove Hardcoded Video Source:**
- Remove hardcoded `videoSource` constant from PlayerScreen.js (line 7)
- PlayerScreen should ONLY accept video URL via route params
- All video sources must come from `constants/videos.js`

**Navigation:**
- Update PlayerScreen to accept video URL from route params (remove hardcoded source)
- "SoMi Time" button reads slider value, gets corresponding video from constants, navigates to PlayerScreen
- SOS button gets its video from constants, navigates to PlayerScreen
- No more hardcoded videos anywhere

**Current State:**
- SOS button exists and works with hardcoded video
- PlayerScreen exists and plays hardcoded video (line 7)
- Need to add: slider, state labels, SoMi Time button, video constants, remove hardcoding
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Slider ranges from 0-100 with no numeric value shown
- [x] #2 Polyvagal state labels fade in/out smoothly as slider moves across thresholds
- [x] #3 State labels are embodiment-focused, neutral/positive (never negative)
- [x] #4 SoMi Time button placed horizontally next to SOS button
- [x] #5 SoMi Time button uses slider value to determine which video to play
- [x] #6 constants/videos.js created with 5 video mappings (all pointing to same source for MVP)
- [x] #7 PlayerScreen accepts video URL via route params
- [x] #8 SOS button continues to work with dedicated video

- [x] #9 Hardcoded videoSource removed from PlayerScreen.js - all videos come from constants/videos.js
- [x] #10 SOS button retrieves video from constants file

- [x] #11 Remove ghost-like fade transitions - text should update immediately when slider enters new range
- [x] #12 Text updates while finger is still on slider (not just on release)
- [x] #13 Text stays at final state when finger is released
<!-- AC:END -->
