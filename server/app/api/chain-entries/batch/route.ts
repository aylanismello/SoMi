import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../../lib/auth'
import type { BatchChainEntry } from '../../../../types'

// Batch-insert multiple chain entries in a single DB round-trip.
// Body: { chainId, entries: [{ blockId, secondsElapsed, sessionOrder, section? }] }
export async function POST(request: NextRequest) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { chainId, entries }: { chainId: number; entries: BatchChainEntry[] } = await request.json()

    if (!chainId || !Array.isArray(entries) || entries.length === 0) {
      return NextResponse.json(
        { error: 'chainId and a non-empty entries array are required' },
        { status: 400 }
      )
    }

    const rows = entries.map(e => ({
      somi_chain_id: chainId,
      somi_block_id: e.blockId,
      seconds_elapsed: e.secondsElapsed || 0,
      order_index: e.sessionOrder || 0,
      user_id: user!.id,
      ...(e.section ? { section: e.section } : {}),
    }))

    const { data, error: dbError } = await supabase!
      .from('somi_chain_entries')
      .insert(rows)
      .select()

    if (dbError) {
      console.error('Error batch-saving chain entries:', dbError)
      return NextResponse.json({ error: 'Failed to save entries' }, { status: 500 })
    }

    return NextResponse.json({ entries: data })
  } catch (error) {
    console.error('Error in batch chain-entries endpoint:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
