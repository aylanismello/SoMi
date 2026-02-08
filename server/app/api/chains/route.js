import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../lib/auth'

export async function GET(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')

    // RLS automatically filters to this user's chains
    const { data, error: dbError } = await supabase
      .from('somi_chains')
      .select(`
        *,
        embodiment_checks (*),
        somi_chain_entries (*, somi_blocks (*))
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (dbError) {
      console.error('Error fetching chains:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch chains' },
        { status: 500 }
      )
    }

    return NextResponse.json({ chains: data })
  } catch (error) {
    console.error('Error in chains endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const body = await request.json()
    const flowType = body.flow_type || 'daily_flow' // Default to daily_flow

    const { data, error: dbError } = await supabase
      .from('somi_chains')
      .insert({
        user_id: user.id,
        flow_type: flowType
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error creating chain:', dbError)
      return NextResponse.json(
        { error: 'Failed to create chain' },
        { status: 500 }
      )
    }

    return NextResponse.json({ chain: data })
  } catch (error) {
    console.error('Error in create chain endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
