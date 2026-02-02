import { NextResponse } from 'next/server'
import { supabase } from '../../../../lib/supabase'

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('somi_chains')
      .select(`
        *,
        embodiment_checks (*),
        somi_chain_entries (*, somi_blocks (*))
      `)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching latest chain:', error)
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
