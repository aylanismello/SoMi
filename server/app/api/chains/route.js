import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '30')

    const { data, error } = await supabase
      .from('somi_chains')
      .select(`
        *,
        embodiment_checks (*),
        somi_chain_entries (*, somi_blocks (*))
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error fetching chains:', error)
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

export async function POST() {
  try {
    const { data, error } = await supabase
      .from('somi_chains')
      .insert({})
      .select()
      .single()

    if (error) {
      console.error('Error creating chain:', error)
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
