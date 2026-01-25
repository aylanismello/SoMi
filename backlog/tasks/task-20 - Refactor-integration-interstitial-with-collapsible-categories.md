---
id: task-20
title: Refactor integration interstitial with collapsible categories
status: Done
assignee: []
created_date: '2026-01-25 18:37'
updated_date: '2026-01-25 18:44'
labels:
  - feature
  - ui
  - refactor
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
On the integration interstitial (SoMiTimer), replace the current block selection UI with a collapsible category system based on polyvagal states.

**Current behavior:**
- Shows all available blocks at bottom

**New behavior:**
- Show 5 polyvagal state categories (withdrawn, stirring, activated, settling, connected) with emojis
- Categories can be expanded/collapsed
- When expanded, show blocks for that category
- Left 20% of screen shows category emoji when expanded (persists as small emoji)
- Carousel-style interaction
- Easy to close expanded category

**Design considerations:**
- How to visually represent collapsed vs expanded states
- Carousel/swipe interaction pattern
- Category organization (group blocks by state_target from somi_blocks)
- Animation/transition between collapsed/expanded
- Position at bottom of screen (similar to current)

**Files:**
- components/SoMiTimer.js (major refactor of block selection UI)
- May need new component: components/CategorySelector.js or similar
- Reference: somi_blocks data with state_target field
<!-- SECTION:DESCRIPTION:END -->
