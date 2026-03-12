import { NextResponse } from 'next/server'
import { getAuthenticatedUser, unauthorizedResponse } from '../../../../lib/auth'
import { filterBlocksByState, selectBlocks, assignSections, generateExplanation } from '../../../../lib/polyvagal'
import { generateAIRoutine } from '../../../../lib/claude'
import { buildSessionContext } from '../../../../lib/sessionContext'

// In-memory block cache — blocks change rarely; this avoids a DB round-trip
// on every generation call. Cache busts every 30 minutes automatically.
let _blocksCache = null
let _blocksCacheAt = 0
const BLOCKS_CACHE_TTL_MS = 30 * 60 * 1000

export async function POST(request) {
  const { supabase, user, error } = await getAuthenticatedUser(request)
  if (error) return unauthorizedResponse(error)

  try {
    const body = await request.json()
    const {
      polyvagal_state,
      duration_minutes,
      body_scan_start = false,
      body_scan_end = false,
      // use_ai is accepted for backward compatibility but ignored —
      // context-aware generation is now the default path.
      // eslint-disable-next-line no-unused-vars
      use_ai,
      // ── Optional context signals ───────────────────────────────────────
      local_hour = null,
      timezone = null,
      latitude = null,
      longitude = null,
      chronotype = null,
      sleep_wake_notes = null,
      weather = null,
      inferred_need = null,
      support_mode = null,
      recent_usage_summary = null,
    } = body

    // Validate required fields
    if (!polyvagal_state || !duration_minutes) {
      return NextResponse.json(
        { error: 'polyvagal_state and duration_minutes are required' },
        { status: 400 }
      )
    }

    if (duration_minutes < 1 || duration_minutes > 60) {
      return NextResponse.json(
        { error: 'duration_minutes must be between 1 and 60' },
        { status: 400 }
      )
    }

    // ── Compute block count ──────────────────────────────────────────────────
    const body_scan_enabled = duration_minutes >= 8
    const body_scan_seconds = body_scan_enabled
      ? (body_scan_start ? 60 : 0) + (body_scan_end ? 60 : 0)
      : 0
    const remaining = (duration_minutes * 60) - body_scan_seconds
    const block_count = Math.max(1, Math.floor(remaining / 80))

    // ── Fetch all active vagal_toning blocks (cached) ────────────────────────
    let allBlocks = _blocksCache
    const now = Date.now()
    if (!allBlocks || now - _blocksCacheAt > BLOCKS_CACHE_TTL_MS) {
      const { data, error: dbError } = await supabase
        .from('somi_blocks')
        .select('id, canonical_name, name, description, energy_delta, safety_delta, media_url, duration_seconds')
        .eq('active', true)
        .eq('block_type', 'vagal_toning')

      if (dbError) {
        console.error('Error fetching blocks:', dbError)
        return NextResponse.json({ error: 'Failed to fetch blocks' }, { status: 500 })
      }

      _blocksCache = data
      _blocksCacheAt = now
      allBlocks = data
    }

    // ── Build session context ────────────────────────────────────────────────
    const sessionContext = buildSessionContext({
      polyvagal_state,
      duration_minutes,
      local_hour,
      timezone,
      latitude,
      longitude,
      chronotype,
      sleep_wake_notes,
      weather,
      inferred_need,
      support_mode,
      recent_usage_summary,
    })

    let segments
    let reasoning
    let rationale

    // ── Context-aware path (default) ─────────────────────────────────────────
    try {
      const availableBlockNames = allBlocks.map(b => b.canonical_name)
      const aiResult = await generateAIRoutine({
        sessionContext,
        blockCount: block_count,
        availableBlocks: availableBlockNames,
        hasScanStart: body_scan_enabled && body_scan_start,
        hasScanEnd:   body_scan_enabled && body_scan_end,
      })

      // Build lookup map
      const blockMap = {}
      for (const block of allBlocks) {
        blockMap[block.canonical_name] = block
      }

      // Flatten AI sections into block list with section labels
      const aiBlocks = []
      for (const section of aiResult.sections) {
        // Normalise "warm-up" → "warm_up"
        const sectionName = section.name === 'warm-up' ? 'warm_up' : section.name
        for (const item of section.blocks) {
          const block = blockMap[item.canonical_name]
          if (!block) continue
          aiBlocks.push({ ...block, section: sectionName })
        }
      }

      // Assemble segments using the same logic as before
      segments = assembleSegments(aiBlocks, body_scan_enabled && body_scan_start, body_scan_enabled && body_scan_end)
      reasoning = aiResult.reasoning ?? null
      rationale = aiResult.rationale ?? null
    } catch (aiError) {
      console.error('Context-aware generation failed, falling back to algorithmic:', aiError)
      // Fall back to algorithmic path
      const result = algorithmicPath(allBlocks, polyvagal_state, block_count, body_scan_enabled && body_scan_start, body_scan_enabled && body_scan_end)
      segments = result.segments
      reasoning = result.reasoning
      rationale = null
    }

    // ── Algorithmic path (commented out — preserved for reference/rollback) ──
    // To re-enable, uncomment this block and add a conditional on `use_ai`:
    //
    // if (!use_ai) {
    //   const result = algorithmicPath(allBlocks, polyvagal_state, block_count,
    //     body_scan_enabled && body_scan_start, body_scan_enabled && body_scan_end)
    //   segments = result.segments
    //   reasoning = result.reasoning
    // }

    const actual_duration_seconds = body_scan_seconds + (block_count * 80)

    return NextResponse.json({
      segments,
      actual_duration_seconds,
      ...(reasoning ? { reasoning } : {}),
      ...(rationale ? { rationale } : {}),
    })
  } catch (error) {
    console.error('Error generating flow:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ── Algorithmic path (preserved for fallback and reference) ──────────────────
function algorithmicPath(allBlocks, polyvagal_state, block_count, scanStart, scanEnd) {
  // Filter by polyvagal state
  const filtered = filterBlocksByState(allBlocks, polyvagal_state)

  // Select blocks using shuffle-without-replacement
  const selected = selectBlocks(filtered, block_count)

  // Assign section labels
  const withSections = assignSections(selected)

  // Assemble full segments array
  const segments = assembleSegments(withSections, scanStart, scanEnd)

  // Generate deterministic explanation
  const reasoning = generateExplanation(polyvagal_state, segments)

  return { segments, reasoning }
}

function assembleSegments(blocksWithSections, scanStart, scanEnd) {
  const segments = []

  if (scanStart) {
    segments.push({
      type: 'body_scan',
      section: 'warm_up',
      duration_seconds: 60,
    })
  }

  for (const block of blocksWithSections) {
    segments.push({
      type: 'micro_integration',
      section: block.section,
      duration_seconds: 20,
    })
    segments.push({
      type: 'somi_block',
      section: block.section,
      duration_seconds: block.duration_seconds ?? 60,
      somi_block_id: block.id,
      canonical_name: block.canonical_name,
      name: block.name,
      description: block.description,
      energy_delta: block.energy_delta,
      safety_delta: block.safety_delta,
      url: block.media_url,
    })
  }

  if (scanEnd) {
    segments.push({
      type: 'body_scan',
      section: 'integration',
      duration_seconds: 60,
    })
  }

  return segments
}
