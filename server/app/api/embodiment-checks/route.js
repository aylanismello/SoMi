import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../lib/auth'

export async function POST(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { chainId, energyLevel, safetyLevel, journalEntry, tags } = await request.json()

    if (!chainId) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      )
    }

    const { data, error: dbError } = await supabase
      .from('embodiment_checks')
      .insert({
        somi_chain_id: chainId,
        energy_level: energyLevel != null ? Math.round(energyLevel) : null,
        safety_level: safetyLevel != null ? Math.round(safetyLevel) : null,
        journal_entry: journalEntry,
        user_id: user.id,
        ...(tags && tags.length > 0 ? { tags } : {}),
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error saving embodiment check:', dbError)
      return NextResponse.json(
        { error: 'Failed to save check-in' },
        { status: 500 }
      )
    }

    return NextResponse.json({ check: data })
  } catch (error) {
    console.error('Error in embodiment check endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
