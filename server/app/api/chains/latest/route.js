import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../../lib/auth'

export async function GET(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { searchParams } = new URL(request.url)
    const flowType = searchParams.get('flow_type')

    // Build query - RLS automatically filters to this user's chains
    let query = supabase
      .from('somi_chains')
      .select(`
        *,
        embodiment_checks (*),
        somi_chain_entries (*, somi_blocks (*))
      `)
      .order('created_at', { ascending: false })

    // Filter by flow_type if provided
    if (flowType) {
      query = query.eq('flow_type', flowType)
    }

    const { data, error: dbError } = await query
      .limit(1)
      .single()

    if (dbError && dbError.code !== 'PGRST116') {
      console.error('Error fetching latest chain:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch chain' },
        { status: 500 }
      )
    }

    return NextResponse.json({ chain: data || null })
  } catch (error) {
    console.error('Error in latest chain endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
