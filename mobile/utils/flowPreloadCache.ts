import { api } from '../services/api'
import { useSettingsStore } from '../stores/settingsStore'
import type { Segment } from '../types'

interface FlowCache {
  segments: Segment[] | null
  reasoning: string | null
  _promise: Promise<void> | null
}

const _cache: FlowCache = {
  segments: null,
  reasoning: null,
  _promise: null,
}

export const flowPreloadCache = {
  get segments() { return _cache.segments },
  get reasoning() { return _cache.reasoning },
  get isLoading() { return _cache._promise !== null },

  // Fire-and-forget. Safe to call repeatedly — dedupes if already in-flight or done.
  preload() {
    if (_cache.segments || _cache._promise) return

    const { bodyScanStart, bodyScanEnd } = useSettingsStore.getState()
    const now = new Date()

    _cache._promise = api.generateFlow({
      polyvagal_state:  'steady',
      duration_minutes: 10,
      body_scan_start:  bodyScanStart ?? true,
      body_scan_end:    bodyScanEnd ?? true,
      local_hour:       now.getHours(),
      timezone:         Intl.DateTimeFormat().resolvedOptions().timeZone,
    }).then(result => {
      if (result?.segments?.length) {
        _cache.segments = result.segments
        _cache.reasoning = result.reasoning ?? null
      }
    }).catch(() => {}).finally(() => {
      _cache._promise = null
    })
  },

  // Await the in-flight promise if still loading (returns instantly if already done)
  async wait() {
    if (_cache._promise) await _cache._promise
  },

  // Call after consuming — lets Home re-preload on next visit
  clear() {
    _cache.segments = null
    _cache.reasoning = null
    _cache._promise = null
  },
}
