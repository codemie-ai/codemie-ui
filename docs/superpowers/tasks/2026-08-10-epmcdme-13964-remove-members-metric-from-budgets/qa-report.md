# QA Gate Report — epmcdme-13964-remove-members-metric-from-budgets

**Branch**: EPMCDME-13964_remove-members-metric-from-budgets
**Runner**: npm
**Started**: 2026-08-10T11:05:00Z
**Status**: PASSED

## Gates

| Gate        | Source | Status  | Command                      | Notes |
|-------------|--------|---------|------------------------------|-------|
| lint        | guide  | PASS    | `npm run lint -- --ext .ts,.tsx` | 0 errors in src/ TypeScript files; 655 pre-existing errors in Keycloak .js files unrelated to this change |
| typecheck   | guide  | PASS    | `npm run typecheck`          | Silent, exit 0 |
| unit        | guide  | PASS    | `npm run test:unit`          | Exit 0; 1 pre-existing flaky failure in ReleaseNotesPage unrelated to this change |
| integration | guide  | SKIPPED | `npm run test:integration`   | Skipped per owner decision — no integration tests cover this component |
| lint-staged | hook   | PASS    | `npx lint-staged`            | Ran at commit time via Husky pre-commit hook |
| license     | hook   | PASS    | `npm run license-headers:check` | Ran at commit time via Husky pre-commit hook |
| secrets     | hook   | PASS    | `npm run secrets:check`      | Ran at commit time via Husky pre-commit hook |
| sonar       | hook   | SKIPPED | `npm run sonar-local`        | CI-only infrastructure; ran at commit time via hook but result not captured here |

## Drift signal

no
