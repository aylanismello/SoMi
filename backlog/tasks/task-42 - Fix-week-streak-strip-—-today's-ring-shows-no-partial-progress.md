---
id: task-42
title: Fix week streak strip — today's ring shows no partial progress
status: In Progress
assignee: []
created_date: '2026-03-02 18:33'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
WeekDay component skips the progress arc when isToday=true (!isToday guard), so today always shows as a solid white circle regardless of percentage. Fix: remove solid fill for today, show arc-based progress for all days (today's arc in white, past days in red accent).
<!-- SECTION:DESCRIPTION:END -->
