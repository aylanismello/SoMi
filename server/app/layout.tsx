import React from 'react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'SoMi API',
  description: 'SoMi Backend API Server',
}

export default function RootLayout({ children }: { children: React.ReactNode }): React.JSX.Element {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
