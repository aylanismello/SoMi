// Sentry helpers for server-side error tracking
const Sentry = require('@sentry/nextjs')

/**
 * Wrap a Next.js API route handler with Sentry error tracking.
 * Catches unhandled errors, reports them, and returns a 500 response.
 *
 * Usage:
 *   const { withSentry } = require('../../lib/sentry')
 *   export const GET = withSentry(async (request) => { ... })
 */
function withSentry(handler) {
  return async function sentryWrapped(request, context) {
    try {
      return await handler(request, context)
    } catch (error) {
      Sentry.captureException(error, {
        extra: {
          url: request.url,
          method: request.method,
        },
      })
      console.error('Unhandled API error:', error)
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
  }
}

module.exports = { withSentry }
