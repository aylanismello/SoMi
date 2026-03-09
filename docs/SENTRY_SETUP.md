# Sentry Bug Tracking Setup for SoMi

SoMi uses [Sentry](https://sentry.io) for error tracking on both the mobile app (React Native/Expo) and the server (Next.js). When bugs occur, Sentry captures them and sends email alerts to picoisazorean@gmail.com.

## Quick Start

### 1. Create a Sentry Account

1. Go to [sentry.io](https://sentry.io) and sign up (free tier covers SoMi's needs)
2. Create an organization (e.g., `azorean`)
3. Create **two projects**:
   - **somi-mobile** (platform: React Native)
   - **somi-server** (platform: Next.js)
4. Copy each project's DSN (found in Project Settings → Client Keys)

### 2. Configure Environment Variables

**Mobile app** — add to your `.env` or EAS secrets:
```
EXPO_PUBLIC_SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/456789
```

**Server** — add to `.env.local` or Vercel environment variables:
```
SENTRY_DSN=https://your-key@o123456.ingest.sentry.io/789012
SENTRY_ORG=azorean
SENTRY_PROJECT=somi-server
```

For source map uploads during EAS builds, also set:
```
SENTRY_AUTH_TOKEN=sntrys_your_auth_token
SENTRY_ORG=azorean
SENTRY_PROJECT=somi-mobile
```

### 3. Set Up Email Alerts

1. In Sentry, go to **Settings → Notifications**
2. Ensure **Issue Alerts** are enabled for picoisazorean@gmail.com
3. Go to **Alerts → Create Alert Rule** for each project:
   - **When:** A new issue is created
   - **Then:** Send notification to picoisazorean@gmail.com
   - Optionally set up a second rule for high-frequency errors

### 4. Verify It Works

After setting the DSN, trigger a test error:

**Mobile (dev console):**
```js
import { captureError } from '../services/sentry'
captureError(new Error('Test error from SoMi mobile'))
```

**Server (any API route):**
```js
const Sentry = require('@sentry/nextjs')
Sentry.captureException(new Error('Test error from SoMi server'))
```

Check the Sentry dashboard — the error should appear within seconds.

## What's Tracked

### Mobile App
- **Unhandled JS errors** (via Sentry.wrap error boundary in _layout.js)
- **API request failures** (network errors, timeouts, 4xx/5xx responses)
- **User context** (Supabase user ID and email attached to errors)
- **Breadcrumbs** (API call history for debugging context)

### Server
- **Unhandled API route errors** (via withSentry wrapper in lib/sentry.js)
- **Next.js server-side errors** (via sentry.server.config.js)
- **Request context** (URL, method attached to errors)

## Architecture

```
mobile/
  services/sentry.js        → Init, helpers (captureError, setSentryUser, etc.)
  services/api.js            → API errors auto-captured with context
  stores/authStore.js        → User identity synced to Sentry
  app/_layout.js             → Root error boundary via Sentry.wrap
  app.config.js              → @sentry/react-native/expo plugin

server/
  sentry.server.config.js   → Server-side Sentry init
  sentry.edge.config.js     → Edge runtime Sentry init
  next.config.js             → withSentryConfig wrapper
  lib/sentry.js              → withSentry() route wrapper helper
```

## Wrapping API Routes (Optional)

For extra protection on critical API routes, wrap them with `withSentry`:

```js
const { withSentry } = require('../../lib/sentry')

export const POST = withSentry(async (request) => {
  // Your route logic — any thrown error gets captured automatically
  const data = await request.json()
  // ...
})
```

## Cost

Sentry's free tier includes:
- 5,000 errors/month
- 10,000 performance transactions/month
- 1 GB attachments
- Unlimited team members

This is more than enough for SoMi's current scale.
