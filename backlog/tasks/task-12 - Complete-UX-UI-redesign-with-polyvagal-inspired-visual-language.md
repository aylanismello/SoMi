---
id: task-12
title: Complete UX/UI redesign with polyvagal-inspired visual language
status: Done
assignee: []
created_date: '2025-11-02 08:12'
labels:
  - ui/ux
  - design
  - enhancement
  - polyvagal
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Performed comprehensive UX/UI redesign of the entire app with a calming, therapeutic aesthetic inspired by premium meditation apps (Calm, etc.) and polyvagal regulation themes.

## Design Philosophy
- Twilight gradient backgrounds (deep purples/blues) representing the journey toward safety and regulation
- Meaningful color psychology: teal/green for regulation (ventral vagal), soft coral for SOS
- Glass-morphism with BlurView components
- Polyvagal journey visualized in slider gradient (purple → teal = dysregulated → regulated)

## Components Redesigned

### SoMeCheckIn Screen
- LinearGradient background (#0f0c29 → #302b63 → #24243e)
- Added "Return to Yourself" header with subtitle
- BlurView card wrapping the embodiment slider
- Larger gradient buttons (140px) with glowing shadows
- Teal gradient for "Regulate" button, coral gradient for "SOS" button

### EmbodimentSlider
- Gradient track showing polyvagal journey (#7b68ee → #4ecdc4)
- Dynamic colored badge with state indicator dot
- Each state has unique color (Withdrawn, Stirring, Activated, Settling, Connected)
- Labels changed to "Dysregulated" and "Regulated"
- Restored original copy: "how in your body\ndo you feel right now?"

### HomeScreen
- Same gradient background as CheckIn
- Removed "Somatic Integration" subtitle
- Redesigned stats card with BlurView and gradient progress indicator
- Video carousel cards with glass-morphism effects and gradient overlays
- Adjusted text hierarchy (reduced "Hi there." to 28px)
- Added 30px top padding to carousel section for better spacing

### Tab Bar
- Installed and integrated @expo/vector-icons (Ionicons)
- Home icon: 'home'/'home-outline'
- Check In icon: 'heart-circle'/'heart-circle-outline'
- Clean pill-shaped button for active tab with teal background (#4ecdc4)
- Inactive tabs: transparent background with dimmed icons
- No borders on inactive tabs (cleaner look)

## Color Palette
- Background gradient: #0f0c29 → #302b63 → #24243e
- Regulate/Safety: #4ecdc4 → #44a08d
- SOS/Alert: #ff6b9d → #ffa8b3
- Text: #f7f9fb with varying opacity
- Slider journey: #7b68ee → #4ecdc4

## Technical Changes
- Added expo-linear-gradient dependency
- Updated App.js with gradient backgrounds and new tab styling
- Fixed React Fragment errors in tab implementation
- Proper use of BlurView for glass-morphism effects
<!-- SECTION:DESCRIPTION:END -->
