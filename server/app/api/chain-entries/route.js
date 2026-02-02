import { NextResponse } from 'next/server'
import { supabase } from '../../../lib/supabase'

export async function POST(request) {
  try {
    const { chainId, blockId, secondsElapsed, sessionOrder } = await request.json()

    if (!chainId || !blockId) {
      return NextResponse.json(
        { error: 'Chain ID and Block ID are required' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('somi_chain_entries')
      .insert({
        somi_chain_id: chainId,
        somi_block_id: blockId,
        seconds_elapsed: secondsElapsed || 0,
        order_index: sessionOrder || 0,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving chain entry:', error)
      return NextResponse.json(
        { error: 'Failed to save entry' },
        { status: 500 }
      )
    }

    return NextResponse.json({ entry: data })
  } catch (error) {
    console.error('Error in chain entry endpoint:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
