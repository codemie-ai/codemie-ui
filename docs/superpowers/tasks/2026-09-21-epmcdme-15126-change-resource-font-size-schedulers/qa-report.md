# QA Gate Report — epmcdme-15126-change-resource-font-size-schedulers

**Branch**: EPMCDME-15126_change-resource-font-size-schedulers
**Runner**: npm
**Started**: 2026-09-21T00:00:00Z
**Status**: PASSED

## Gates

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| lint | PASS | `npm run lint` | React version warning is pre-existing, not an error |
| typecheck | PASS | `npm run typecheck` | Silent output |
| unit tests | PASS | `npm run test:unit:slnt` | 65 files, 564 tests passed |
| integration tests | PASS | `npm run test:integration:slnt` | 30 files, 256 tests passed |
| license check | SKIPPED | `npm run license-check` | No dependency changes |
| secret detection | N/A | `npm run secrets:check` | Runs automatically in pre-commit hook |

## Drift signal

no
