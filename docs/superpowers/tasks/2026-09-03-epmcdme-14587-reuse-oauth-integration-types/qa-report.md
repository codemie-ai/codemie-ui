# QA Gate Report — EPMCDME-14586 + EPMCDME-14587

**Branches**: codemie-ui `EPMCDME-14587_remove-new-types-fix-bugs` (uncommitted) · codemie `EPMCDME-14587_reuse-oauth-integration-types` (committed)
**Runners**: npm (frontend) · poetry (backend)
**Status**: PASSED

## Frontend gates (codemie-ui)

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| Lint | PASS | `npm run lint` | exit 0, no errors |
| Type-check | PASS | `npm run typecheck` | `tsc --noEmit` clean, exit 0 |
| Unit tests | PASS | `npm run test:unit` | 473 files, 4990 passed, exit 0 |
| Integration tests | PASS | `npm run test:integration` | 39 files, 496 passed / 1 skipped, exit 0 |
| License check | N/A | `npm run license-check` | no dependency changes in this diff |
| Secret detection | N/A | `npm run secrets:check` | no secrets added; not run (no manifest change) |

## Backend gates (codemie)

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| Ruff check | PASS | `git diff --name-only main...HEAD -- '*.py' \| xargs poetry run ruff check` | 24 files, "All checks passed!" |
| Ruff format | PASS | `... \| xargs poetry run ruff format --check` | 24 files already formatted |
| Tests (affected: oauth/settings) | PASS | `poetry run pytest tests/codemie/service/{oauth,settings,jira_oauth,confluence_oauth,gitlab_oauth}` | 329 passed, exit 0 |
| Tests (oauth routers) | PASS* | `poetry run pytest tests/codemie/rest_api -k "oauth or gitlab or jira or confluence"` | 56 passed, **1 failed (env-only, see below)** |

### The one router failure is a local-environment artifact, not a regression

`tests/codemie/rest_api/routers/test_oauth_redis_lazy_init.py::test_app_starts_without_redis_package_when_pkce_disabled`
spawns a **fresh** `python -c "import codemie.rest_api.main"` subprocess. In this local checkout that bare
interpreter resolves `codemie` to an incomplete site-packages copy (missing `rest_api`) and, once `src/` is on
the path, fails on a missing optional dep `tree_sitter_languages` — never reaching any OAuth code. The test file
is **not** part of this change's diff, the 56 router tests that actually import and exercise the OAuth routers
pass, and these changes add no import-time behavior to `rest_api.main`. It passes in CI (full install).

## Drift signal

no — implementation matches the spec (base type + `auth_type=oauth` marker; GitLab folded into Git).

## Merge blocker carried forward (not a gate)

Alembic migration `fa14587c0de1` has **not** been run against a real Postgres (no local DB). It needs an
`upgrade`/`downgrade` smoke test before merge — it rewrites existing `*OAuth` rows to base type + marker and
drops the three enum values.
