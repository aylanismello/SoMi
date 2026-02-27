# SoMi Documentation

Documentation derived from the codebase. All claims are tagged:

- **VERIFIED** — directly found in source code, config, or database schema
- **INFERRED** — strong inference from code structure/usage patterns
- **UNKNOWN** — not found; noted for future investigation

## Files

| Doc | Covers |
|-----|--------|
| [00_overview.md](./00_overview.md) | What SoMi is, core loop, session inputs/outputs |
| [01_product.md](./01_product.md) | Screens, features, primary user loop as implemented |
| [02_flows.md](./02_flows.md) | Step-by-step screen transitions and user journeys |
| [03_architecture.md](./03_architecture.md) | System map: mobile, server, Supabase, AI |
| [04_data_model.md](./04_data_model.md) | Supabase tables, columns, relationships |
| [05_routine_engine.md](./05_routine_engine.md) | Routine generation logic (AI + hardcoded) |
| [06_cruft.md](./06_cruft.md) | Dead code, unused files, convention violations, tech debt |
| [CHANGELOG.md](./CHANGELOG.md) | Documentation change log |

## Keeping docs in sync

These docs describe the **current** codebase. They are not aspirational.

- After changing a screen, route, or navigation flow → update `02_flows.md`
- After changing Supabase schema or API payloads → update `04_data_model.md`
- After changing routine generation logic → update `05_routine_engine.md`
- After adding/removing screens or major features → update `01_product.md`
- After changing system topology (new service, new provider) → update `03_architecture.md`
- Add a short entry to `CHANGELOG.md` for any meaningful doc update
