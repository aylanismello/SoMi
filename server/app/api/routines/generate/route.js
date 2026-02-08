import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../../lib/auth'
import { getRoutineConfig } from '../../../../lib/routines'

export async function POST(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const { routineType, blockCount } = await request.json()

    // Get canonical names for this routine
    const canonicalNames = getRoutineConfig(routineType, blockCount)

    if (!canonicalNames) {
      return NextResponse.json(
        { error: 'Invalid routine configuration' },
        { status: 400 }
      )
    }

    // Fetch blocks from database - blocks are global content
    const { data: blocks, error: dbError } = await supabase
      .from('somi_blocks')
      .select('id, canonical_name, name, description, state_target, media_url')
      .in('canonical_name', canonicalNames)

    if (dbError) {
      console.error('Error fetching blocks:', dbError)
      return NextResponse.json(
        { error: 'Failed to fetch blocks' },
        { status: 500 }
      )
    }

    // Sort blocks to match canonical names order
    const sortedBlocks = canonicalNames.map(canonicalName =>
      blocks.find(block => block.canonical_name === canonicalName)
    ).filter(Boolean)

    // Convert to queue format
    const queue = sortedBlocks.map((block, index) => ({
      somi_block_id: block.id,
      name: block.name,
      canonical_name: block.canonical_name,
      url: block.media_url,
      type: 'video',
      order: index,
      description: block.description,
      state_target: block.state_target,
    }))

    return NextResponse.json({
      queue,
      routineType,
      blockCount,
    })
  } catch (error) {
    console.error('Error generating routine:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
