---
id: task-77
title: 'Fix: Daily Flows warm-up section missing due to section name mismatch'
status: Done
assignee: []
created_date: '2026-03-12 21:03'
updated_date: '2026-03-12 21:04'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
MySomiScreen.js uses SECTION_ORDER = ['warm-up', 'main', 'integration'] (hyphen) but the server saves section as 'warm_up' (underscore). This causes warm-up blocks to be bucketed as 'warm_up' which is never matched by SECTION_ORDER, so they never render. Fix: update SECTION_ORDER to use 'warm_up' and display with a formatted label.
<!-- SECTION:DESCRIPTION:END -->
