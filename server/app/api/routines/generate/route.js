import { NextResponse } from 'next/server'

// Legacy endpoint — replaced by POST /api/flows/generate in v1
export async function POST() {
  return NextResponse.json(
    { error: 'This endpoint has been replaced by POST /api/flows/generate' },
    { status: 410 }
  )
}
