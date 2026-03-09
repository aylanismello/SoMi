const { withSentryConfig } = require('@sentry/nextjs')

/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  output: 'standalone',
}

// Only wrap with Sentry if DSN is configured
const sentryEnabled = !!process.env.SENTRY_DSN

module.exports = sentryEnabled
  ? withSentryConfig(nextConfig, {
      // Suppresses source map uploading logs during build
      silent: true,
      org: process.env.SENTRY_ORG || 'azorean',
      project: process.env.SENTRY_PROJECT || 'somi-server',
    })
  : nextConfig
