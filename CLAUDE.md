# SoMi — Root Guidelines

## Documentation Maintenance

Docs live in `/docs/` and are derived from the repo. They describe what the code currently does, not what it should do.

### Rules

- Docs are derived from repo truth. If a claim is not verifiable in code/config/schema, it does not belong in docs.
- Use descriptive language ("currently does," "calls," "stores"). Avoid prescriptive language ("should," "best practice," "bias toward").
- Tag unverifiable claims: VERIFIED, INFERRED, or UNKNOWN.

### When to update which doc

| Change | Update |
|--------|--------|
| Add/remove/rename a screen or route | `docs/01_product.md`, `docs/02_flows.md` |
| Change navigation flow or screen transitions | `docs/02_flows.md` |
| Change Supabase schema, add/remove columns or tables | `docs/04_data_model.md` |
| Change API endpoints or payloads | `docs/03_architecture.md`, `docs/04_data_model.md` |
| Change routine generation logic (AI prompt, hardcoded configs, selection algorithm) | `docs/05_routine_engine.md` |
| Add/remove a service, provider, or deployment target | `docs/03_architecture.md` |
| Any meaningful doc update | Add short entry to `docs/CHANGELOG.md` |

### End-of-task checklist

After completing a code change:

1. Does this change affect any screen, flow, data model, or routine logic?
2. If yes → update the relevant doc(s) listed above
3. If the doc update is meaningful → add a short `CHANGELOG.md` entry

## Task & Commit Workflow

This applies to every coding request across the entire repo.

### Before starting work
- Create a backlog task (via Backlog.md MCP) capturing what the request is
- Mark the task **In Progress**

### After completing work
- Mark the task **Done** in the backlog
- Create a git commit for all changed files - including the Backlog MD file(s)
- **NEVER push to git** — commits only, no push
