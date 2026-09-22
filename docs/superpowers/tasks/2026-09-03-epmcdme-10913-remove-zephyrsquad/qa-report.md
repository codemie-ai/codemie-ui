# QA Gate Report — epmcdme-10913-remove-zephyrsquad (frontend)

**Branch**: EPMCDME-10913_remove-zephyrsquad
**Runner**: npm (guide: `.ai-run/guides/quality-gates.md`)
**Started**: 2026-09-03
**Status**: PASSED

## Gates

| Gate  | Source | Status | Duration | Command | Notes |
|-------|--------|--------|----------|---------|-------|
| lint | guide | PASS | ~5s | `npm run lint` | 0 errors (1 pre-existing React-version-not-specified warning, unrelated) |
| typecheck | guide | PASS | ~10s | `npm run typecheck` | 0 errors after fixing 2 unused-variable issues surfaced by this change |
| license-check | guide | PASS | ~10s | `npm run license-check` | licence summary printed, exit 0; no dependency added/removed |
| secrets:check | guide | PASS | 30s | `npm run secrets:check` | no leaks found |
| unit tests | guide | PASS | 100s | `npm run test:unit` | 497 test files, 5218 passed, 1 pre-existing skip |
| integration tests | guide | PASS | 47s | `npm run test:integration` | 40 test files, 500 passed, 1 pre-existing skip |
| build | ci | N/A | — | `npm run build:prod` | not run this session; typecheck (which build depends on) is clean |
| sonar-local | hook | SKIPPED | — | `npm run sonar-local` (via pre-commit) | self-skipped: "Skipping Sonar scan because SONAR_TOKEN is not set." |

## Failure detail

None. All gates green.

## Drift signal

no

## Still owed

Sonar's server-side quality gate can only be settled by the MR pipeline (`SONAR_TOKEN` not
available locally). `npm run build:prod` was not exercised directly this session, but
`npm run typecheck` (its first step) is clean and no new build-only concern (asset imports,
env vars) was introduced by this diff.
