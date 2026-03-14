// ── SoMi Server — Type Definitions ───────────────────────────────────────────

import type { NextRequest } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Polyvagal Domain ─────────────────────────────────────────────────────────

export type PolyvagalStateName = 'restful' | 'glowing' | 'shutdown' | 'wired' | 'steady'

export type SectionName = 'warm_up' | 'main' | 'integration'

export type RegulationNeed = 'activation' | 'stabilization' | 'down_regulation'

export type SupportMode = 'guided' | 'companion' | 'fast_intervention'

export type SolarPhase = 'deep_night' | 'dawn' | 'early_day' | 'day' | 'pre_sunset' | 'dusk' | 'night'

export type TimePeriod = 'morning' | 'afternoon' | 'evening' | 'late_night'

// ── Database Models ──────────────────────────────────────────────────────────

export interface SomiBlock {
  id: number
  canonical_name: string
  name: string
  description: string
  energy_delta: number | null
  safety_delta: number | null
  media_url: string | null
  duration_seconds: number
  block_type?: string
  active?: boolean
  section?: SectionName
}

export interface SomiChain {
  id: number
  user_id: string
  flow_type: string
  duration_seconds: number
  created_at: string
  embodiment_checks?: EmbodimentCheck[]
  somi_chain_entries?: ChainEntry[]
}

export interface EmbodimentCheck {
  id: number
  somi_chain_id: number
  energy_level: number | null
  safety_level: number | null
  journal_entry: string | null
  tags: string[] | null
  user_id: string
  created_at: string
}

export interface ChainEntry {
  id: number
  somi_chain_id: number
  somi_block_id: number
  seconds_elapsed: number
  order_index: number
  section: string | null
  user_id: string
}

export interface GroundingQuote {
  id: number
  quote: string
  author: string | null
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export type AuthResult =
  | { supabase: SupabaseClient; token: string; error?: undefined }
  | { error: string; supabase?: undefined; token?: undefined }

export type GetAuthResult =
  | { supabase: SupabaseClient; user: { id: string; email?: string }; error?: undefined }
  | { error: string; supabase?: undefined; user?: undefined }

// ── Session Context ──────────────────────────────────────────────────────────

export interface SessionContextParams {
  polyvagal_state: PolyvagalStateName
  duration_minutes: number
  local_hour?: number | null
  timezone?: string | null
  latitude?: number | null
  longitude?: number | null
  chronotype?: string | null
  sleep_wake_notes?: string | null
  weather?: string | null
  inferred_need?: RegulationNeed | null
  support_mode?: SupportMode | null
  recent_usage_summary?: string | null
}

export interface TimeOfDay {
  period: TimePeriod | null
  hour: number | null
}

export interface SolarContext {
  phase: SolarPhase
  description: string
}

export interface SessionContext {
  polyvagal_state: PolyvagalStateName
  duration_minutes: number
  time_of_day: TimeOfDay
  timezone: string | null
  solar_context: SolarContext | null
  chronotype: string | null
  sleep_wake_notes: string | null
  weather: string | null
  inferred_need: RegulationNeed
  support_mode: SupportMode
  recent_usage_summary: string | null
}

// ── AI Routine Generation ────────────────────────────────────────────────────

export interface GenerateAIRoutineParams {
  sessionContext: SessionContext
  availableBlocks: string[]
  blockCount?: number
  hasScanStart?: boolean
  hasScanEnd?: boolean
}

export interface AIRoutineSection {
  name: string
  blocks: { canonical_name: string }[]
}

export interface AIRoutineResult {
  sections: AIRoutineSection[]
  reasoning?: string
  rationale?: string
}

// ── Segments ─────────────────────────────────────────────────────────────────

interface BaseSegment {
  type: string
  section: SectionName
  duration_seconds: number
}

export interface SomiBlockSegment extends BaseSegment {
  type: 'somi_block'
  somi_block_id: number
  canonical_name: string
  name: string
  description: string
  energy_delta: number | null
  safety_delta: number | null
  url: string | null
}

export interface MicroIntegrationSegment extends BaseSegment {
  type: 'micro_integration'
}

export interface BodyScanSegment extends BaseSegment {
  type: 'body_scan'
}

export type Segment = SomiBlockSegment | MicroIntegrationSegment | BodyScanSegment

// ── API Request/Response ─────────────────────────────────────────────────────

export interface GenerateFlowRequestBody {
  polyvagal_state: PolyvagalStateName
  duration_minutes: number
  body_scan_start?: boolean
  body_scan_end?: boolean
  use_ai?: boolean
  local_hour?: number | null
  timezone?: string | null
  latitude?: number | null
  longitude?: number | null
  chronotype?: string | null
  sleep_wake_notes?: string | null
  weather?: string | null
  inferred_need?: RegulationNeed | null
  support_mode?: SupportMode | null
  recent_usage_summary?: string | null
}

export interface BatchChainEntry {
  blockId: number
  secondsElapsed: number
  sessionOrder: number
  section?: string
}

// ── Streak Computation ───────────────────────────────────────────────────────

export interface StreakDay {
  date: string
  percentage: number
  counts: boolean
  day?: string
  is_today?: boolean
  is_future?: boolean
}

// ── Polyvagal Filtering ──────────────────────────────────────────────────────

export interface InferNeedSignals {
  time_period?: TimePeriod | null
  solar_phase?: SolarPhase | null
  inferred_need?: RegulationNeed | null
}
