---
id: 79
title: Fix calendar streak highlighting and null safety in My Daily Flows
status: Done
priority: high
created: 2026-03-14
---

## Problem

1. **Calendar streak highlighting broken**: In `CalendarStreakView`, the streak days calculation walks backward from today. If today hasn't reached the 5-minute threshold, it immediately breaks and no streak days get highlighted — even if the user has a multi-day streak ending yesterday. The server-side streak calculation correctly skips today when it doesn't count, but the client calendar didn't mirror this logic.

2. **Null safety**: Multiple places in `MySomiScreen` access `chain.embodiment_checks` and `chain.somi_chain_entries` without null guards, which could crash if the server returns null instead of empty arrays.

## Fix

- Mirror server streak logic: if today's entry doesn't count, skip it and start counting from yesterday
- Add `|| []` null guards on all direct accesses to `embodiment_checks` and `somi_chain_entries`
