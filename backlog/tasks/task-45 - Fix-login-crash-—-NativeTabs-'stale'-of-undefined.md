---
id: task-45
title: Fix login crash — NativeTabs 'stale' of undefined
status: Done
assignee: []
created_date: '2026-03-02 20:07'
updated_date: '2026-03-02 20:07'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Login crashes with "Cannot read property 'stale' of undefined" in TabRouter.js. Root cause: AuthLayout uses synchronous `<Redirect>` which triggers navigation before NativeTabs initializes its state. Fix by replacing Redirect with useEffect + router.replace in AuthLayout and index.js.
<!-- SECTION:DESCRIPTION:END -->
