# Monorepo Migration Guide

This document explains the migration from a single React Native app to a monorepo structure with separate mobile app and Next.js backend.

## What Changed

### Structure

**Before:**
```
SoMi/
├── App.js
├── components/
├── services/
└── ...
```

**After:**
```
SoMi/
├── mobile/          # All React Native app code moved here
│   ├── App.js
│   ├── components/
│   ├── services/
│   └── ...
├── server/          # New Next.js backend
│   ├── app/api/     # API routes
│   ├── lib/         # Server utilities
│   └── ...
├── package.json     # Root workspace config
└── README.md
```

### Backend API Created

All business logic and database operations moved to Next.js API:

**API Endpoints:**
- `POST /api/routines/generate` - Generate routine blocks (moved from `services/routineConfig.js`)
- `GET /api/chains` - Get user chains
- `GET /api/chains/latest` - Get latest chain
- `POST /api/chains` - Create chain
- `POST /api/embodiment-checks` - Save check-in
- `POST /api/chain-entries` - Save completed block
- `GET /api/blocks` - Get exercise blocks

### Mobile App Changes

**New:**
- `services/api.js` - API client for backend communication

**To Be Updated:**
The following files still make direct Supabase calls and need to be migrated to use the new API service:

1. `hooks/useSupabaseQueries.js` - React Query hooks for Supabase
2. `components/HomeScreen.js` - Direct Supabase calls
3. `components/MySomiScreen.js` - Direct Supabase calls
4. `components/FlowMenuScreen.js` - Direct Supabase calls
5. `supabase.js` - somiChainService methods

## Next Steps

### 1. Update Mobile App to Use Backend API

Replace direct Supabase calls with API service calls:

**Example - Before:**
```js
const { data, error } = await supabase
  .from('somi_chains')
  .select('*')
  .order('created_at', { ascending: false })
```

**Example - After:**
```js
const { chains } = await api.getChains()
```

### 2. Update React Query Hooks

Modify `hooks/useSupabaseQueries.js` to call the API instead of Supabase:

```js
// Before
const { data } = await supabase.from('somi_chains').select('*')

// After
const { chains } = await api.getChains()
```

### 3. Run Both Services

Start development:
```bash
npm run dev
```

This runs both:
- Mobile app on Expo (port 8081)
- Server on http://localhost:3000

### 4. Test API Endpoints

Visit http://localhost:3000 to see available endpoints.

Test with curl:
```bash
# Create a chain
curl -X POST http://localhost:3000/api/chains

# Get latest chain
curl http://localhost:3000/api/chains/latest

# Generate routine
curl -X POST http://localhost:3000/api/routines/generate \
  -H "Content-Type: application/json" \
  -d '{"routineType":"morning","blockCount":6}'
```

### 5. Deploy Server to Vercel

1. Connect GitHub repo to Vercel
2. Set root directory to `server`
3. Add environment variables in Vercel dashboard
4. Deploy

### 6. Update Mobile App API URL

In `mobile/services/api.js`, update production URL:
```js
const API_BASE_URL = __DEV__
  ? 'http://localhost:3000/api'
  : 'https://your-app.vercel.app/api'  // Update this
```

## Files That Need Migration

Priority order for updating to use backend API:

1. **High Priority:**
   - `mobile/hooks/useSupabaseQueries.js` - Convert all queries to API calls
   - `mobile/supabase.js` - Move chain service logic to backend

2. **Medium Priority:**
   - `mobile/components/HomeScreen.js` - Update quick routines
   - `mobile/components/FlowMenuScreen.js` - Update routine generation
   - `mobile/components/MySomiScreen.js` - Update chains fetching

3. **Low Priority:**
   - Any other components with direct Supabase calls

## Benefits of This Architecture

1. **Separation of Concerns:** Business logic on server, UI on mobile
2. **Security:** Database credentials only on server
3. **Flexibility:** Can add web app later using same API
4. **Maintainability:** Easier to update logic without app releases
5. **Scalability:** Server can handle caching, rate limiting, etc.

## Development Commands

```bash
# Install all dependencies
npm run install:all

# Run both mobile and server
npm run dev

# Run only mobile
npm run mobile:dev

# Run only server
npm run server:dev

# Build server for production
npm run server:build
```

## Troubleshooting

**Mobile app can't connect to server:**
- Ensure server is running on port 3000
- Check API_BASE_URL in `mobile/services/api.js`
- For physical device testing, use your computer's IP address

**Server errors:**
- Check server logs in terminal
- Verify Supabase credentials in `server/lib/supabase.js`
- Ensure database tables exist in Supabase

**Workspace issues:**
- Delete all `node_modules` folders and reinstall: `npm run install:all`
- Clear caches: `cd mobile && npx expo start -c`
