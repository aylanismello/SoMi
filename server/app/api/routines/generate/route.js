import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../../lib/auth'
import { getRoutineConfig } from '../../../../lib/routines'
import { generateAIRoutine } from '../../../../lib/claude'

export async function POST(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const body = await request.json()
    const { routineType, blockCount, polyvagalState, intensity, durationMinutes, localHour, timezone } = body

    // ── AI path ──────────────────────────────────────────────────────────────
    // Use AI when state is given, or when blockCount > 10 (longer sessions need dynamic selection)
    const effectiveState = polyvagalState || (blockCount > 10 ? 'steady' : null)
    if (effectiveState) {
      // Fetch all active blocks from the database
      const { data: allBlocks, error: dbError } = await supabase
        .from('somi_blocks')
        .select('id, canonical_name, name, description, energy_delta, safety_delta, media_url')
        .eq('active', true)
        .eq('block_type', 'vagal_toning')

      if (dbError) {
        console.error('Error fetching blocks for AI routine:', dbError)
        // Fall through to hardcoded path on DB error
      } else {
        try {
          const availableBlockNames = allBlocks.map(b => b.canonical_name)
          const minutes = durationMinutes ?? { 2: 5, 6: 10, 10: 15 }[blockCount] ?? 10

          const aiResult = await generateAIRoutine({
            polyvagalState: effectiveState,
            intensity: intensity ?? 50,
            durationMinutes: minutes,
            blockCount: body.blockCount,  // precise count from client formula
            availableBlocks: availableBlockNames,
            localHour: localHour ?? null,
            timezone: timezone ?? null,
          })

          // Build a lookup map for fast access
          const blockMap = {}
          for (const block of allBlocks) {
            blockMap[block.canonical_name] = block
          }

          // Flatten sections into queue with section metadata
          const queue = []
          let order = 0
          for (const section of aiResult.sections) {
            for (const item of section.blocks) {
              const block = blockMap[item.canonical_name]
              if (!block) continue
              queue.push({
                somi_block_id: block.id,
                name: block.name,
                canonical_name: block.canonical_name,
                url: block.media_url,
                type: 'video',
                order: order++,
                description: block.description,
                energy_delta: block.energy_delta,
                safety_delta: block.safety_delta,
                section: section.name,
              })
            }
          }

          return NextResponse.json({
            queue,
            ai_generated: true,
            polyvagalState,
            intensity,
            durationMinutes: minutes,
            reasoning: aiResult.reasoning ?? null,
          })
        } catch (aiError) {
          console.error('AI routine generation failed, falling back to hardcoded:', aiError)
          // Fall through to hardcoded path
        }
      }
    }

    // ── Hardcoded fallback path ───────────────────────────────────────────────
    // Map duration minutes to nearest valid hardcoded block count (2, 6, 10)
    const DURATION_TO_BLOCK_COUNT = { 5: 2, 10: 6, 15: 10, 20: 10 }
    const effectiveBlockCount = DURATION_TO_BLOCK_COUNT[durationMinutes] ?? DURATION_TO_BLOCK_COUNT[blockCount] ?? blockCount
    const canonicalNames = getRoutineConfig(routineType, effectiveBlockCount)

    if (!canonicalNames) {
      return NextResponse.json(
        { error: 'Invalid routine configuration' },
        { status: 400 }
      )
    }

    // Fetch blocks from database - blocks are global content
    const { data: blocks, error: dbError } = await supabase
      .from('somi_blocks')
      .select('id, canonical_name, name, description, energy_delta, safety_delta, media_url')
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
      energy_delta: block.energy_delta,
      safety_delta: block.safety_delta,
    }))

    return NextResponse.json({
      queue,
      ai_generated: false,
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
