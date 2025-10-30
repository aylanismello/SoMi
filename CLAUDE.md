# SoMi Project Guidelines

## Project Overview

SoMi is a React Native mobile application built with Expo that helps users assess and respond to their emotional state through a simple, intuitive interface.

## Technical Stack & Conventions

### Language Choice
- **JavaScript Only**: This project uses plain JavaScript (.js files), not TypeScript
- Keep code simple and readable without type annotations

### Framework & Platform
- **React Native** with **Expo SDK ~54**
- **iOS only** - Android is not a priority
- Use Expo's managed workflow and built-in APIs where possible

### Design Philosophy
- **Minimalist aesthetic**: Black backgrounds (#000000), white text (#ffffff), red accents (#ff6b6b)
- **Simple, focused UI**: Each screen should have a clear, singular purpose
- **Haptic feedback**: Use haptic feedback for important user interactions to enhance the physical connection
- **Accessibility**: Ensure touch targets are appropriately sized and controls are accessible

### Dependencies & Libraries
- **ALWAYS use Context7 MCP** (`mcp__context7__resolve-library-id` and `mcp__context7__get-library-docs`) when working with external libraries or needing documentation
- Prefer Expo's built-in modules over third-party alternatives
- Keep dependencies minimal and well-justified

### Code Style
- **No semicolons**: This project does not use semicolons in JavaScript
- Use functional components with hooks
- Follow React Native best practices for performance
- Keep components focused and single-purpose
- Use StyleSheet.create for all styles

### File Organization
- Main app entry point: `App.js`
- Components should be organized by feature/screen when the project grows
- Keep related styles close to their components

## Development Workflow

### When Adding Features
1. Check backlog for existing tasks
2. Create task if needed (see Backlog guidelines below)
3. Use Context7 MCP to reference up-to-date library documentation
4. Focus on iOS development

---

<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

## BACKLOG WORKFLOW INSTRUCTIONS

This project uses Backlog.md MCP for all task and project management activities.

**CRITICAL GUIDANCE**

- If your client supports MCP resources, read `backlog://workflow/overview` to understand when and how to use Backlog for this project.
- If your client only supports tools or the above request fails, call `backlog.get_workflow_overview()` tool to load the tool-oriented overview (it lists the matching guide tools).

- **First time working here?** Read the overview resource IMMEDIATELY to learn the workflow
- **Already familiar?** You should have the overview cached ("## Backlog.md Overview (MCP)")
- **When to read it**: BEFORE creating tasks, or when you're unsure whether to track work

These guides cover:
- Decision framework for when to create tasks
- Search-first workflow to avoid duplicates
- Links to detailed guides for task creation, execution, and completion
- MCP tools reference

You MUST read the overview resource to understand the complete workflow. The information is NOT summarized here.

</CRITICAL_INSTRUCTION>

<!-- BACKLOG.MD MCP GUIDELINES END -->
