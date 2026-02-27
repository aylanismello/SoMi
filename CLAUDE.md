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
| Add/remove/rename a screen or route | `docs/PRODUCT.md`, `docs/FLOWS.md` |
| Change navigation flow or screen transitions | `docs/FLOWS.md` |
| Change Supabase schema, add/remove columns or tables | `docs/DATA_MODEL.md` |
| Change API endpoints or payloads | `docs/ARCHITECTURE.md`, `docs/DATA_MODEL.md` |
| Change routine generation logic (AI prompt, hardcoded configs, selection algorithm) | `docs/ROUTINE_ENGINE.md` |
| Add/remove a service, provider, or deployment target | `docs/ARCHITECTURE.md` |
| Any meaningful doc update | Add short entry to `docs/CHANGELOG.md` |

### End-of-task checklist

After completing a code change:

1. Does this change affect any screen, flow, data model, or routine logic?
2. If yes → update the relevant doc(s) listed above
3. If the doc update is meaningful → add a short `CHANGELOG.md` entry
