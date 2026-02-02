# SoMi Monorepo

This monorepo contains both the SoMi iOS mobile app and the Next.js backend API.

## Project Structure

```
.
├── mobile/          # React Native/Expo iOS app
│   ├── components/  # React components
│   ├── stores/      # Zustand state management
│   ├── hooks/       # Custom React hooks
│   └── ...
├── server/          # Next.js API backend
│   ├── app/         # Next.js App Router
│   │   └── api/     # API routes
│   └── lib/         # Shared server utilities
└── package.json     # Root package with workspace scripts
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (for mobile development)
- iOS Simulator or device (for testing)

### Installation

Install all dependencies for both workspaces:

```bash
npm run install:all
```

Or install individually:

```bash
# Install root dependencies
npm install

# Install mobile dependencies
cd mobile && npm install

# Install server dependencies
cd server && npm install
```

### Development

Run both mobile app and server simultaneously:

```bash
npm run dev
```

Or run individually:

```bash
# Mobile app only
npm run mobile:dev

# Server only
npm run server:dev
```

The mobile app will start on Expo (typically http://localhost:8081)
The server will start on http://localhost:3000

## Mobile App (`/mobile`)

React Native app built with Expo SDK ~54 for iOS.

**Key Features:**
- Embodiment check-ins with polyvagal state tracking
- Guided somatic exercises
- Daily SoMi Flow with mandatory check-ins
- Session history and stats

**Tech Stack:**
- React Native + Expo
- Zustand for state management
- React Navigation
- Supabase (via backend API)

See `mobile/CLAUDE.md` for detailed development guidelines.

## Server (`/server`)

Next.js 15 API server using App Router.

**API Endpoints:**

- `POST /api/routines/generate` - Generate routine block sequences
- `GET /api/chains` - Get user's SoMi chains
- `GET /api/chains/latest` - Get most recent chain
- `POST /api/chains` - Create new chain
- `POST /api/embodiment-checks` - Save embodiment check-in
- `POST /api/chain-entries` - Save completed exercise block
- `GET /api/blocks` - Get exercise blocks

**Tech Stack:**
- Next.js 15 (App Router)
- Supabase JS Client
- Plain JavaScript (no TypeScript)

### Deployment

The server is designed to deploy on Vercel:

```bash
cd server
npm run build
```

Then connect your repository to Vercel for automatic deployments.

## Environment Variables

### Server

Create `server/.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## Development Workflow

1. Start both apps: `npm run dev`
2. Mobile app connects to local server at `http://localhost:3000`
3. Make changes to either workspace
4. Both will hot-reload automatically

## Notes

- The mobile app no longer talks directly to Supabase
- All database operations go through the Next.js API
- Routine generation logic lives on the server
- The server handles all business logic and data access
