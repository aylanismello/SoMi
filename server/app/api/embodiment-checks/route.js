import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const { chainId, sliderValue, polyvagalStateCode, journalEntry } = await request.json()

    if (!chainId) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('embodiment_checks')
      .insert({
        somi_chain_id: chainId,
        embodiment_level: sliderValue ? Math.round(sliderValue) : null,
        polyvagal_state_code: polyvagalStateCode ? Math.round(polyvagalStateCode) : null,
        journal_entry: journalEntry,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving embodiment check:', error)
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
