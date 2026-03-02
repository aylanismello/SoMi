---
id: task-32
title: >-
  Unify FlowInit & FlowOutro design language: water bg, blur overlay, readout
  above picker, no scroll
status: Done
assignee: []
created_date: '2026-03-02 06:23'
updated_date: '2026-03-02 06:34'
labels: []
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
1. Add BlurView between water image and dark gradient on FlowInit for softer look
2. Apply same water bg + BlurView + dark gradient to FlowOutro (replace LinearGradient bg)
3. Move polyvagal state readout pill from below to above the XYPicker square in StateXYPicker.js
4. Disable vertical scroll in FlowOutro (convert ScrollView → View)
<!-- SECTION:DESCRIPTION:END -->
