# QA gates — EPMCDME-13738

Branch `feature/EPMCDME-13738-per-workflow-integration-scope` in both repos. Gates were run
directly (the change spans two repositories, so each repo's own runner was used).

| Gate | Repo | Command | Result |
|---|---|---|---|
| Lint | codemie | `poetry run ruff check src tests` | **pass** — all checks passed |
| License headers | codemie | `make license-check` | **pass** — 1978 files checked, 0 missing |
| Unit/integration tests | codemie | `make test` | **pass for this change** — 6962 passed in the affected suites; see the pre-existing failures below |
| Migration chain | codemie | `poetry run alembic heads` | **pass** — single head `w1o2r3k4f5l6` |
| Types | codemie-ui | `npx tsc --noEmit` | **pass** — no errors |
| Unit tests | codemie-ui | `npm run test:unit` | **pass** — 334 files, 3987 tests |
| Integration tests | codemie-ui | `npm run test:integration` | **pass** — 30 files, 451 tests, 1 skipped |
| Build | codemie-ui | `npm run build` | **pass** — built in 14.11s |
| Lint | codemie-ui | `npm run lint` | **skipped (environment)** — see below |

## Pre-existing failures, not caused by this change

`make test` reports 47 failures on this branch. All of them come from missing local packages and
reproduce independently of this change:

- `tests/enterprise/mcp_auth/**` (44) — `ModuleNotFoundError: No module named 'codemie_enterprise'`
- `tests/codemie/service/mcp/test_toolkit_service_auth_resolver.py` (2) and
  `tests/codemie/rest_api/routers/test_local_auth_router.py` (1) —
  `ValueError: the greenlet library is required to use this function. No module named 'greenlet'`

None of them touch the assistant user mapping, the settings handler chain, or the workflow
plumbing changed here.

## Frontend lint

`npm run lint` fails with 8413 errors of the form `Unable to resolve path to module '@/…'` — the
repo-wide ESLint alias resolver is broken in this environment and fails the same way on an
untouched checkout, so the local run carries no signal about this change. Lint for the frontend is
enforced by CI on the merge request.

## Migration — manual verification (done)

The alembic migration cannot be exercised by the test suite: `tests/conftest.py:34` mocks the
database engine globally and the repo has no DDL tests. It was therefore verified by hand against
the local Postgres (schema `codemie`), with the backend serving on `:8080` throughout:

| Check | Result |
|---|---|
| Upgrade with existing rows present | **pass** — 7 pre-existing rows kept, all carrying `workflow_id = ''`, so nobody has to re-select an integration |
| Column shape | **pass** — `workflow_id character varying NOT NULL DEFAULT ''` |
| Constraint swap | **pass** — `uix_assistant_user_mapping_scope` over (assistant_id, user_id, workflow_id); the old two-column `uix_assistant_user_mapping` is gone |
| Index | **pass** — `ix_assistant_user_mapping_workflow_id` present |
| Downgrade with a workflow-scoped row present | **pass** — the row was archived into `assistant_user_mapping_workflow_scope_backup` and removed from the table; the 7 assistant-scoped rows were untouched; the two-column constraint was restored and the revision fell back to `i1n2t3e4r5a6` |
| Re-upgrade | **pass** — back to `w1o2r3k4f5l6` with the three-column constraint and the index restored |
| Backend health after the cycle | **pass** — `GET :8080/docs` → 200 |

The test row and the archive table created during the check were removed afterwards; the database
is back to its pre-check state (7 assistant-scoped rows, revision `w1o2r3k4f5l6`).

## Still outstanding

End-to-end walkthrough in the UI (inheritance on first open, saving with the checkbox off and on,
a second user keeping their own selection) — to be done together with the user.
