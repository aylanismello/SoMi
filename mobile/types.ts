// ── SoMi Mobile — Shared Type Definitions ───────────────────────────────────

// ── Polyvagal Domain ─────────────────────────────────────────────────────────

export type PolyvagalStateName = 'restful' | 'glowing' | 'shutdown' | 'wired' | 'steady'

export interface PolyvagalState {
  name: PolyvagalStateName
  label: string
  icon: string
  color: string
}

export type PolyvagalStatesMap = Record<PolyvagalStateName, PolyvagalState>

// ── Segments (flow playback units) ───────────────────────────────────────────

export type SectionName = 'warm_up' | 'main' | 'integration'

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
  energy_delta: number
  safety_delta: number
  url: string
}

export interface MicroIntegrationSegment extends BaseSegment {
  type: 'micro_integration'
}

export interface BodyScanSegment extends BaseSegment {
  type: 'body_scan'
}

export type Segment = SomiBlockSegment | MicroIntegrationSegment | BodyScanSegment

// ── Database Models (Supabase table shapes) ──────────────────────────────────

export interface SomiBlock {
  id: number
  canonical_name: string
  name: string
  description: string
  energy_delta: number | null
  safety_delta: number | null
  media_url: string | null
  media_type: string
  duration_seconds: number
  block_type: string
  active: boolean
  intensity?: string | null
  section?: string | null
}

export interface SomiChain {
  id: number
  user_id: string
  flow_type: FlowType
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
  somi_blocks?: SomiBlock
}

export interface GroundingQuote {
  id: number
  quote: string
  author: string | null
}

// ── Flow Types ───────────────────────────────────────────────────────────────

export type FlowType = 'daily_flow' | 'quick_routine' | 'single_block'
export type Phase = 'video' | 'interstitial'
export type RoutineType = 'morning' | 'evening' | 'afternoon' | 'night'

// ── Music ────────────────────────────────────────────────────────────────────

export type TrackId = 'fluids' | 'together' | 'none'

export interface Track {
  id: TrackId
  label: string
  artist: string | null
  color: string | null
  url: string | null
}

// ── Store Types ──────────────────────────────────────────────────────────────

export interface RoutineStoreState {
  segments: Segment[]
  segmentIndex: number
  currentCycle: number
  totalBlocks: number
  phase: Phase
  remainingSeconds: number
  currentVideo: MediaItem | null
  selectedVideoId: number | null
  savedInitialEnergy: number | null
  savedInitialSafety: number | null
  savedInitialValue: number
  savedInitialState: PolyvagalState | null
  routineType: RoutineType
  isQuickRoutine: boolean
  flowType: FlowType
}

export interface RoutineStoreActions {
  currentSegment: () => Segment | null
  setRemainingSeconds: (s: number) => void
  setCurrentCycle: (cycle: number) => void
  setPhase: (phase: Phase) => void
  setSegments: (segments: Segment[]) => void
  setSegmentIndex: (idx: number) => void
  advanceSegment: () => void
  updateSegment: (index: number, data: Partial<Segment>) => void
  setCurrentVideo: (video: MediaItem | null) => void
  initializeRoutine: (params: InitializeRoutineParams) => void
  advanceCycle: () => void
  resetRoutine: () => void
}

export type RoutineStore = RoutineStoreState & RoutineStoreActions

export interface InitializeRoutineParams {
  totalBlocks: number
  routineType: RoutineType
  savedInitialEnergy?: number | null
  savedInitialSafety?: number | null
  savedInitialValue: number
  savedInitialState: PolyvagalState | null
  segments?: Segment[] | null
  isQuickRoutine?: boolean
  flowType?: FlowType | null
}

export interface EditFlowStoreState {
  segments: Segment[]
  reasoning: string | null
  generationParams: GenerateFlowParams | null
}

export interface EditFlowStoreActions {
  setSegments: (segments: Segment[]) => void
  setReasoning: (reasoning: string | null) => void
  setGenerationParams: (params: GenerateFlowParams | null) => void
  swapBlock: (blockIndex: number, newBlock: Partial<SomiBlockSegment>) => void
}

export type EditFlowStore = EditFlowStoreState & EditFlowStoreActions

export interface SettingsStoreState {
  isMusicEnabled: boolean
  isSfxEnabled: boolean
  bodyScanStart: boolean
  bodyScanEnd: boolean
  selectedTrackId: TrackId
}

export interface SettingsStoreActions {
  toggleMusic: () => void
  toggleSfx: () => void
  setMusicEnabled: (enabled: boolean) => void
  setSfxEnabled: (enabled: boolean) => void
  setBodyScanStart: (val: boolean) => void
  setBodyScanEnd: (val: boolean) => void
  setSelectedTrack: (id: TrackId) => void
}

export type SettingsStore = SettingsStoreState & SettingsStoreActions

export interface AuthStoreState {
  isAuthenticated: boolean
  user: AuthUser | null
  session: AuthSession | null
  isLoading: boolean
}

export interface AuthStoreActions {
  initialize: () => { unsubscribe: () => void }
  signInWithApple: () => Promise<AuthResult>
  signInWithGoogle: () => Promise<AuthResult>
  signUpWithEmail: (email: string, password: string) => Promise<AuthResult>
  signInWithEmail: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

export type AuthStore = AuthStoreState & AuthStoreActions

export interface AuthResult {
  success: boolean
  error?: string
  cancelled?: boolean
  data?: unknown
}

// Supabase auth types (simplified)
export interface AuthUser {
  id: string
  email?: string
  user_metadata?: Record<string, unknown>
}

export interface AuthSession {
  access_token: string
  refresh_token: string
  user: AuthUser
}

export interface FlowMusicStoreState {
  fluidsPlayer: AudioPlayer | null
  togetherPlayer: AudioPlayer | null
  audioPlayer: AudioPlayer | null
  isPlaying: boolean
  currentTrackId: TrackId
  flowStartedAt: number | null
}

export interface FlowMusicStoreActions {
  setTrackPlayers: (fluidsPlayer: AudioPlayer, togetherPlayer: AudioPlayer) => void
  startFlowMusic: (isMusicEnabled?: boolean, trackId?: TrackId) => void
  switchTrack: (newTrackId: TrackId) => void
  stopFlowMusic: () => void
  pauseFlowMusic: () => void
  resumeFlowMusic: () => void
  recoverPlayback: () => void
  setVolume: (volume: number) => void
  updateMusicSetting: (isMusicEnabled: boolean) => void
}

export type FlowMusicStore = FlowMusicStoreState & FlowMusicStoreActions

// ── Audio/Video Player interfaces ────────────────────────────────────────────
// Minimal interfaces matching expo-audio/expo-video player APIs

export interface AudioPlayer {
  play: () => void
  pause: () => void
  seekTo: (position: number) => void
  release: () => void
  volume: number
  muted: boolean
  loop: boolean
  playing: boolean
  duration: number | null
}

// ── API Types ────────────────────────────────────────────────────────────────

export interface GenerateFlowParams {
  polyvagal_state: PolyvagalStateName
  duration_minutes: number
  body_scan_start?: boolean
  body_scan_end?: boolean
  local_hour?: number | null
  timezone?: string | null
}

export interface GenerateFlowResponse {
  segments: Segment[]
  actual_duration_seconds: number
  reasoning?: string
  rationale?: string
}

export interface ChainsResponse {
  chains: SomiChain[]
}

export interface ChainResponse {
  chain: SomiChain | null
}

export interface BlocksResponse {
  blocks: SomiBlock[]
}

export interface StreakDay {
  date: string
  percentage: number
  counts: boolean
  day?: string
  is_today?: boolean
  is_future?: boolean
}

export interface StreaksResponse {
  current_streak: number
  all_time_streak: number
  week: StreakDay[]
  month: StreakDay[]
}

export interface QuoteResponse {
  quote: GroundingQuote | null
}

// ── Media ────────────────────────────────────────────────────────────────────

export interface MediaItem {
  id?: number
  url: string
  type: 'video'
  somi_block_id: number
  canonical_name: string
  name: string
  media_url?: string
  description?: string
  energy_delta?: number
  safety_delta?: number
}

// ── Session Storage Types ────────────────────────────────────────────────────

export interface SessionCheck {
  energyLevel: number
  safetyLevel: number
  journalEntry: string | null
  tags: string[] | null
  timestamp: number
}

export interface SessionBlock {
  somiBlockId: number
  secondsElapsed: number
  orderIndex: number
  section: string | null
  timestamp: number
}

export interface SessionData {
  checks: SessionCheck[]
  blocks: SessionBlock[]
}

// ── Polyvagal Explanation ────────────────────────────────────────────────────

export interface PolyvagalExplanation {
  title: string
  body: string
}

export interface PolyvagalZone {
  id: string
  test: (energy: number, safety: number) => boolean
  title: string
  body: string
}

// ── Theme ────────────────────────────────────────────────────────────────────

export interface ThemeColors {
  background: {
    primary: string
    secondary: string
    overlay: string
  }
  text: {
    primary: string
    secondary: string
    muted: string
    inverse: string
  }
  accent: {
    primary: string
    secondary: string
    tertiary: string
    light: string
    teal: string
  }
  state: {
    active: string
    inactive: string
    hover: string
    disabled: string
  }
  polyvagal: Record<string, string>
  border: {
    default: string
    active: string
    subtle: string
  }
  overlay: {
    dark: string
    medium: string
    light: string
  }
  surface: {
    primary: string
    secondary: string
    tertiary: string
  }
}
