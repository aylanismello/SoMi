# SoMi Documentation

Documentation derived from the codebase. All claims are tagged:

- **VERIFIED** — directly found in source code, config, or database schema
- **INFERRED** — strong inference from code structure/usage patterns
- **UNKNOWN** — not found; noted for future investigation

## Files

| Doc | Covers |
|-----|--------|
| [PRODUCT.md](./PRODUCT.md) | What the app is, what screens exist, primary user loop |
| [FLOWS.md](./FLOWS.md) | Step-by-step screen transitions and user journeys |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | System map: mobile, server, Supabase, AI |
| [DATA_MODEL.md](./DATA_MODEL.md) | Supabase tables, columns, relationships |
| [ROUTINE_ENGINE.md](./ROUTINE_ENGINE.md) | Routine generation logic (AI + hardcoded) |
| [CRUFT.md](./CRUFT.md) | Dead code, unused files, convention violations, tech debt |
| [CHANGELOG.md](./CHANGELOG.md) | Documentation change log |

## Keeping docs in sync

These docs describe the **current** codebase. They are not aspirational.

- After changing a screen, route, or navigation flow → update FLOWS.md
- After changing Supabase schema or API payloads → update DATA_MODEL.md
- After changing routine generation logic → update ROUTINE_ENGINE.md
- After adding/removing screens or major features → update PRODUCT.md
- After changing system topology (new service, new provider) → update ARCHITECTURE.md
- Add a short entry to CHANGELOG.md for any meaningful doc update
