---
id: task-52
title: Fix streak calculation and completion screen copy
status: Done
assignee: []
created_date: '2026-03-03 08:19'
updated_date: '2026-03-03 08:21'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Three issues to fix:
1. **Server bug**: current_streak starts counting from today, so if today has no session yet the streak shows 0 even when yesterday was completed. Standard streak logic: if today isn't done yet, count backward from yesterday.
2. **FlowCompletion copy - quick session**: "Won't count toward your streak — you need 5 minutes." is too harsh. Needs kinder wording.
3. **FlowCompletion copy - streak = 0**: Shows "0 days / On fire!" which is nonsensical. Fix label/messaging when streak is 0.
<!-- SECTION:DESCRIPTION:END -->
