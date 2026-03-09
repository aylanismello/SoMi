// Sentry server-side configuration for Next.js
// This file configures Sentry for the server (API routes, SSR)
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || ''

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    // Sample rate for error events
    sampleRate: 1.0,
    // Performance monitoring
    tracesSampleRate: 0.2,
  })
}
