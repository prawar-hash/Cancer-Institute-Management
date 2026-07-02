PROJECT TYPE: Enterprise healthcare software (Cancer Institute Management & AI Research Platform)
NOT a demo, NOT a portfolio piece, NOT a prototype.

HARD CONSTRAINTS (never violate, even if a later prompt seems to imply otherwise):
- NEVER deploy anything. No cloud deploy commands, no CI/CD triggers, no domain/DNS setup.
- NEVER implement a "Dose Monitoring System" or any radiation-dose-tracking feature. If any
  requirement resembles this, stop and flag it instead of implementing it.
- NEVER hardcode secrets, API keys, or credentials in source. Use .env + a documented
  .env.example. Flag any place a real key would be needed as a placeholder.
- NEVER fabricate real medical/clinical claims, dosages, or treatment recommendations in UI
  copy, seed data, or AI prompts. All AI-generated clinical content must carry a visible
  "not medical advice / clinician must verify" disclaimer.
- Use only currently-maintained, non-deprecated package versions. Before adding a dependency,
  check it is not deprecated/archived.
- All patient data in seed/demo fixtures must be synthetic (clearly fake names/IDs), never
  real patient data.

WORKFLOW RULES:
- Work in explore -> plan -> execute phases. For anything touching more than 2 files, produce
  a plan artifact first and wait for approval.
- One phase/module per task. Do not mix unrelated modules in a single execution pass.
- After every execution pass: run the project's lint, type-check, and test commands; fix
  failures automatically; report a short diff summary, not the full diff, unless asked.
- Prefer editing/extending existing reusable components, hooks, services, and utilities over
  creating near-duplicates. Search the codebase before creating a new file.
- Every backend endpoint needs: input validation (Pydantic/Zod), auth/permission check,
  error handling with proper HTTP status codes, and an OpenAPI description.
- Every new table needs: primary key, soft-delete column, created_at/updated_at, and an
  Alembic migration — never hand-edit the DB schema outside migrations.
- Every file upload path must validate MIME type, extension, and size server-side (not just
  client-side) and must scope files to a single patient_id — no cross-patient access.
- Comment every function/component with a one-line purpose comment; avoid comment noise on
  self-explanatory lines.

CODE STYLE:
- TypeScript strict mode on the frontend; typed Python (mypy-clean) on the backend.
- No dead code, no commented-out blocks, no TODO left unresolved without a tracked note in
  README "Known Gaps" section.
