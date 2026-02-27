# Changelog

## 2026-02-27 — Cruft audit

Added `CRUFT.md` — comprehensive dead code and tech debt audit covering:
- 10 deletable files (~2,841 lines)
- 1 unreachable screen (SoMiTimer — registered but never navigated to, plus runtime bug)
- 12+ dead exports in live files
- 3 dead npm dependencies
- Duplicated routine config (server + mobile)
- 2 convention violations (direct Supabase calls from mobile)
- 5 TODO/HACK comments with locations
- 3 hardcoded magic numbers
- 1 silent bug (cacheTime→gcTime rename in React Query v5)
- Hardcoded credentials in server source

## 2026-02-27 — Documentation system created

Created `/docs/` with initial documentation derived from the codebase:

- **README.md** — doc index and sync guidelines
- **PRODUCT.md** — screens, features, primary loop as implemented
- **FLOWS.md** — step-by-step screen transitions
- **ARCHITECTURE.md** — system map (mobile, server, Supabase, Anthropic Claude)
- **DATA_MODEL.md** — all 4 Supabase tables with verified schema
- **ROUTINE_ENGINE.md** — AI + hardcoded routine generation logic
- **CHANGELOG.md** — this file

Updated root `CLAUDE.md` with docs maintenance workflow.
