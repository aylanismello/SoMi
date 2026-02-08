import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../lib/auth'

export async function POST(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { chainId, sliderValue, polyvagalStateCode, journalEntry } = await request.json()

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
        embodiment_level: sliderValue ? Math.round(sliderValue) : null,
        polyvagal_state_code: polyvagalStateCode ? Math.round(polyvagalStateCode) : null,
        journal_entry: journalEntry,
        user_id: user.id,
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
