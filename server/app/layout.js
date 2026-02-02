export const metadata = {
  title: 'SoMi API',
  description: 'SoMi Backend API Server',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
