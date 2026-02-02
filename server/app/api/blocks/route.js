import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function GET(request) {
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

    const { data, error } = await supabase
      .from('somi_blocks')
      .select('*')
      .in('canonical_name', namesArray)

    if (error) {
      console.error('Error fetching blocks:', error)
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
