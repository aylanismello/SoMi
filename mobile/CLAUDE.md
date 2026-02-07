# SoMi Mobile App Guidelines

## Project Overview

SoMi is a React Native mobile application built with Expo that helps users assess and respond to their emotional state through a simple, intuitive interface.

**Note:** This is part of a monorepo. The mobile app lives in `/mobile` and communicates with a Next.js backend in `/server`.

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

### Backend Communication
- **Use the API service** (`services/api.js`) for all backend communication
- **DO NOT** make direct Supabase calls from the mobile app
- All database operations, routine generation, and business logic go through the Next.js backend
- API base URL: `http://localhost:3000/api` (development) or your Vercel deployment (production)

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

### Testing & Running the App
- **NEVER run `npx expo start` or any development server commands**
- **NEVER attempt to start a server, Metro bundler, or test the app**
- The developer always has their own server running separately
- Running server commands will cause port conflict errors and fail
- Only write/edit code - let the developer handle testing and running

### Publishing Updates to Expo Cloud
Deploy the app for remote access on Expo Go:

```bash
  eas update --channel preview --message "Description of changes" --platform ios
```

**Channels**:
- `preview` - Testing/sharing
- `production` - Live releases

### Deploying to TestFlight
Build and submit new versions for TestFlight testing (not live App Store):

```bash
# 1. Build for production/TestFlight
eas build --platform ios --profile production

# 2. After build completes, submit to App Store Connect
eas submit --platform ios

# 3. Wait 5-15 minutes for processing in App Store Connect
# 4. Build will appear in TestFlight tab automatically
```

**Important Notes**:
- TestFlight builds use the `production` profile, not internal distribution
- After submission, builds appear in App Store Connect → TestFlight
- Testers receive email invitations (no redeem codes needed)
- Builds can take 5-15 minutes to process before appearing in TestFlight

---

<!-- BACKLOG.MD MCP GUIDELINES START -->

<CRITICAL_INSTRUCTION>

NEVER EVER DO GIT COMMITS FOR ME
NEVER PUSH CODE TO GIT
NEVER NEVER NEVER


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
