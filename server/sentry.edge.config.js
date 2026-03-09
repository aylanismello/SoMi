// Sentry edge runtime configuration for Next.js
import * as Sentry from '@sentry/nextjs'

const SENTRY_DSN = process.env.SENTRY_DSN || ''

if (SENTRY_DSN) {
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    sampleRate: 1.0,
    tracesSampleRate: 0.2,
  })
}
