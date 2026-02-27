# Data Model

All tables verified against live Supabase schema (`list_tables` query). All columns, types, and foreign keys are from the database, not inferred.

## Tables

### `somi_blocks` — Exercise library (19 rows)

Global read-only content. Each row is a somatic exercise with a video.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint (PK, identity) | |
| `canonical_name` | text | Unique identifier used in code (e.g. `vagus_reset`, `humming`) |
| `name` | text | Display name |
| `description` | text | Exercise description |
| `block_type` | text | `vagal_toning` or `timer` [VERIFIED from code filters] |
| `media_type` | text | `video` or `audio` [VERIFIED from code filters] |
| `media_url` | text | Supabase Storage URL |
| `thumbnail_url` | text | |
| `energy_delta` | smallint (default 0) | How much the block shifts energy (-/+) |
| `safety_delta` | smallint (default 0) | How much the block shifts safety (-/+) |
| `active` | boolean (default false) | Whether available for selection |
| `created_at` | timestamptz | |

**RLS**: Enabled. All authenticated users can read. [VERIFIED]

**Referenced canonical names** (from `server/lib/routines.js` + `mobile/services/routineConfig.js`):
`vagus_reset`, `vagus_reset_lying_down`, `arm_shoulder_hand_circles`, `heart_opener`, `self_havening`, `body_tapping`, `freeze_roll`, `upward_gaze`, `humming`, `ear_stretch`, `shaking`, `eye_covering`, `self_hug_swaying`, `brain_hold`, `squeeze_hands_release`

---

### `somi_chains` — Session records (1 row currently)

One row per completed routine session.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint (PK, identity) | |
| `user_id` | uuid (FK → auth.users.id) | |
| `flow_type` | text | `daily_flow` or `quick_routine` [VERIFIED from code] |
| `created_at` | timestamptz | |

**RLS**: Enabled. User can only access own chains. [VERIFIED]

**FKs outbound**: `user_id` → `auth.users.id`
**FKs inbound**: `somi_chain_entries.somi_chain_id`, `embodiment_checks.somi_chain_id`

---

### `somi_chain_entries` — Block play records (10 rows currently)

One row per block played within a chain.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint (PK, identity) | |
| `somi_chain_id` | bigint (FK → somi_chains.id) | |
| `somi_block_id` | bigint (FK → somi_blocks.id) | |
| `user_id` | uuid (FK → auth.users.id) | |
| `seconds_elapsed` | integer | Actual watch time |
| `order_index` | bigint | Position in routine sequence |
| `section` | text | `warm-up`, `main`, or `integration` [VERIFIED from code] |
| `created_at` | timestamptz | |

**RLS**: Enabled. User-scoped. [VERIFIED]

---

### `embodiment_checks` — Check-in data (2 rows currently)

Pre/post-routine nervous system state check-ins.

| Column | Type | Notes |
|--------|------|-------|
| `id` | bigint (PK, identity) | |
| `somi_chain_id` | bigint (FK → somi_chains.id) | |
| `user_id` | uuid (FK → auth.users.id) | |
| `energy_level` | smallint | 0-100 [VERIFIED] |
| `safety_level` | smallint | 0-100 [VERIFIED] |
| `journal_entry` | text | Optional free-text |
| `tags` | text[] (array) | Somatic experience tags: crying, sighing, yawning, shaking, tingling, warmth, spontaneous movement, laughter [VERIFIED from SoMiCheckIn.js] |
| `created_at` | timestamptz | |

**RLS**: Enabled. [VERIFIED]

Note: The polyvagal state (restful, glowing, shutdown, wired, steady) is **not stored** in the database. It is derived client-side from `energy_level` and `safety_level` using `deriveState()` in `constants/polyvagalStates.js`. [VERIFIED]

---

## Relationships

```
auth.users
  └── somi_chains (user_id FK)
        ├── somi_chain_entries (somi_chain_id FK)
        │     └── somi_blocks (somi_block_id FK)
        └── embodiment_checks (somi_chain_id FK)
```

## How a Check-In Is Stored and Reconstructed

### Storage (write path)
1. User sets energy (0-100) and safety (0-100) on StateXYPicker
2. For `daily_flow`: buffered in AsyncStorage as `session_embodiment_checks`
3. On flow completion: `chainService.createChainFromSession()` calls `POST /api/chains` then `POST /api/embodiment-checks` for each buffered check
4. Server inserts into `embodiment_checks` with `energy_level`, `safety_level`, `journal_entry`, `tags`, `somi_chain_id`, `user_id`

### Reconstruction (read path)
1. `GET /api/chains` or `GET /api/chains/latest` returns chains with nested `embodiment_checks` and `somi_chain_entries` (joined with `somi_blocks`)
2. Client calls `deriveState(energy_level, safety_level)` to get polyvagal state object
3. Client calls `deriveIntensity(energy_level, safety_level)` for intensity (0-100)
4. Display: emoji + label + intensity word (e.g. "☀️ Glowing · strong")
5. CompletionScreen shows "state transformation" by comparing first and last checks in the chain

[ALL VERIFIED]
