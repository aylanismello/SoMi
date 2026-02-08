import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../lib/auth'

export async function POST(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { chainId, blockId, secondsElapsed, sessionOrder } = await request.json()

    if (!chainId || !blockId) {
      return NextResponse.json(
        { error: 'Chain ID and Block ID are required' },
        { status: 400 }
      )
    }

    const { data, error: dbError } = await supabase
      .from('somi_chain_entries')
      .insert({
        somi_chain_id: chainId,
        somi_block_id: blockId,
        seconds_elapsed: secondsElapsed || 0,
        order_index: sessionOrder || 0,
        user_id: user.id,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Error saving chain entry:', dbError)
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
