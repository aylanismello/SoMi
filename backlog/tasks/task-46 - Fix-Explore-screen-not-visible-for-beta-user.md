---
id: task-46
title: Fix Explore screen not visible for beta user
status: Done
assignee: []
created_date: '2026-03-02 22:16'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
ExploreScreen beta gate checked only `user.email`, but for Apple Sign In accounts the email is stored in `user.user_metadata.email`. The gate silently failed, showing the coming-soon screen even for the authorized beta email. Fix: resolve email via `user?.email || user?.user_metadata?.email`, matching the same logic used in AccountSettingsScreen.
<!-- SECTION:DESCRIPTION:END -->
