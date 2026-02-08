import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../lib/auth'

export async function GET(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { searchParams } = new URL(request.url)
    const canonicalNames = searchParams.get('canonical_names')

    if (!canonicalNames) {
      return NextResponse.json(
        { error: 'canonical_names parameter is required' },
        { status: 400 }
      )
    }

    const namesArray = canonicalNames.split(',')

    // Blocks are global content - RLS allows all authenticated users to read
    const { data, error: dbError } = await supabase
      .from('somi_blocks')
      .select('*')
      .in('canonical_name', namesArray)

    if (dbError) {
      console.error('Error fetching blocks:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch blocks' },
        { status: 500 }
      )
    }

    return NextResponse.json({ blocks: data })
  } catch (error) {
    console.error('Error in blocks endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
