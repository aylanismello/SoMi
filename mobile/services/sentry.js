// Sentry error tracking for SoMi mobile app
// Docs: https://docs.sentry.io/platforms/react-native/
import * as Sentry from '@sentry/react-native'

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || ''

export function initSentry() {
  if (!SENTRY_DSN) {
    console.log('⚠️ Sentry DSN not configured — error tracking disabled')
    return
  }

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    // Only send errors in production by default
    enabled: !__DEV__,
    // Sample rate for error events (1.0 = 100%)
    sampleRate: 1.0,
    // Performance monitoring sample rate (lower to reduce noise)
    tracesSampleRate: 0.2,
    // Attach user info when available
    beforeSend(event) {
      // Strip any sensitive data if needed
      return event
    },
  })

  console.log('✅ Sentry initialized')
}

// Helper to identify the current user (call after auth)
export function setSentryUser(userId, email) {
  if (!SENTRY_DSN) return
  Sentry.setUser({ id: userId, email })
}

// Helper to clear user on logout
export function clearSentryUser() {
  if (!SENTRY_DSN) return
  Sentry.setUser(null)
}

// Helper to capture a manual error with context
export function captureError(error, context = {}) {
  if (!SENTRY_DSN) {
    console.error('Sentry not configured, logging locally:', error, context)
    return
  }
  Sentry.withScope((scope) => {
    Object.entries(context).forEach(([key, value]) => {
      scope.setExtra(key, value)
    })
    Sentry.captureException(error)
  })
}

// Helper to log a breadcrumb (for debugging context)
export function addBreadcrumb(message, category = 'app', data = {}) {
  if (!SENTRY_DSN) return
  Sentry.addBreadcrumb({ message, category, data, level: 'info' })
}

// Wrap root component with Sentry error boundary
export const SentryErrorBoundary = Sentry.wrap
