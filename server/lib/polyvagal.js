// Polyvagal state-based block filtering for flow generation
// Filters blocks by energy_delta / safety_delta to match the user's nervous system state

export function filterBlocksByState(blocks, state) {
  const filters = {
    shutdown: b => (b.energy_delta ?? 0) >= 0 && (b.safety_delta ?? 0) >= 0,
    restful:  b => (b.energy_delta ?? 0) > 0,
    wired:    b => (b.safety_delta ?? 0) > 0,
    glowing:  b => (b.safety_delta ?? 0) >= 0,
    steady:   () => true,
  }
  const filtered = blocks.filter(filters[state] ?? (() => true))
  return filtered.length > 0 ? filtered : blocks // fallback to full pool
}

// Shuffle-without-replacement: randomise the pool, walk through it in order.
// Restart the shuffle when exhausted. No adjacent repeats within a session.
export function selectBlocks(pool, count) {
  if (pool.length === 0) return []

  const selected = []
  let shuffled = shuffle([...pool])
  let idx = 0

  for (let i = 0; i < count; i++) {
    // If exhausted, reshuffle
    if (idx >= shuffled.length) {
      const lastPicked = selected[selected.length - 1]
      shuffled = shuffle([...pool])
      idx = 0
      // Avoid adjacent repeat after reshuffle
      if (shuffled.length > 1 && shuffled[0].id === lastPicked?.id) {
        const swapIdx = 1 + Math.floor(Math.random() * (shuffled.length - 1))
        ;[shuffled[0], shuffled[swapIdx]] = [shuffled[swapIdx], shuffled[0]]
      }
    }

    // Avoid adjacent repeat within the shuffle walk
    if (selected.length > 0 && shuffled[idx].id === selected[selected.length - 1].id) {
      // Try the next one
      if (idx + 1 < shuffled.length) {
        ;[shuffled[idx], shuffled[idx + 1]] = [shuffled[idx + 1], shuffled[idx]]
      }
    }

    selected.push(shuffled[idx])
    idx++
  }

  return selected
}

// Fisher-Yates shuffle
function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// Assign section labels based on position in the selected blocks list
export function assignSections(blocks) {
  const n = blocks.length
  return blocks.map((block, i) => {
    let section
    if (n === 1) {
      section = 'main'
    } else if (n === 2) {
      section = i === 0 ? 'warm_up' : 'main'
    } else {
      if (i === 0) section = 'warm_up'
      else if (i === n - 1) section = 'integration'
      else section = 'main'
    }
    return { ...block, section }
  })
}

// Generate a deterministic explanation from state + selected blocks
export function generateExplanation(state, blocks) {
  const stateIntros = {
    shutdown: "Your nervous system is in a quieter, more withdrawn place right now — it needs gentle warmth and slow activation.",
    restful: "Your body feels settled and safe, but could use a bit more energy and spark.",
    wired: "Your system is running hot — there's activation that needs grounding and safety.",
    glowing: "You're in a beautiful expansive state — energized and safe. Let's honour that.",
    steady: "You're centered and balanced — your nervous system is in its window of tolerance.",
  }

  const intro = stateIntros[state] || stateIntros.steady

  const somiBlocks = blocks.filter(b => b.type === 'somi_block')
  const warmUp = somiBlocks.filter(b => b.section === 'warm_up')
  const main = somiBlocks.filter(b => b.section === 'main')
  const integration = somiBlocks.filter(b => b.section === 'integration')

  const parts = [intro]

  if (warmUp.length > 0) {
    parts.push(`We're starting with ${warmUp[0].name} to gently orient your attention inward.`)
  }
  if (main.length > 0) {
    const goal = {
      shutdown: 'slowly build upward arousal',
      restful: 'gently energize your system',
      wired: 'help your system settle and ground',
      glowing: 'celebrate and sustain this energy',
      steady: 'explore a balanced mix of movement',
    }[state] || 'support your system'
    parts.push(`Building through ${main.length} exercise${main.length > 1 ? 's' : ''} chosen to ${goal}.`)
  }
  if (integration.length > 0) {
    parts.push(`Closing with ${integration[0].name} to help your system settle.`)
  }

  return parts.join(' ')
}
