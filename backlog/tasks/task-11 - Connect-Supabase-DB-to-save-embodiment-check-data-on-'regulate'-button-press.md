---
id: task-11
title: Connect Supabase DB to save embodiment check data on 'regulate' button press
status: To Do
assignee: []
created_date: '2025-11-02 07:32'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Integrate Supabase PostgreSQL database with the React Native app to persist embodiment check data. When user sets slider value and presses "regulate" button in SoMeCheckIn screen, save the slider_value to the embodiment_checks table.

Table already created in Supabase with columns: id (int8), created_at (timestamptz), slider_value (int2)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Install @supabase/supabase-js package
- [ ] #2 Create supabase.js config file with client initialization (need to get anon key from Supabase dashboard)
- [ ] #3 Update SoMeCheckIn.js to save slider_value to database when 'regulate' button is pressed
- [ ] #4 Verify data is being saved in Supabase table editor after pressing regulate button
- [ ] #5 Handle errors gracefully (console log for MVP is fine)
<!-- AC:END -->
