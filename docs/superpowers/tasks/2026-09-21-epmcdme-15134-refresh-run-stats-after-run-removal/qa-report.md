# QA Gate Report — epmcdme-15134-refresh-run-stats-after-run-removal

**Branch**: EPMCDME-15134_refresh-run-stats-after-run-removal
**Runner**: npm
**Started**: 2026-09-21T23:33:00.000Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~8s | `npm run lint` | No errors (React version warning is pre-existing) |
| typecheck | PASS | ~12s | `npm run typecheck` | No type errors |
| license-check | SKIPPED | — | `npm run license:check` | No dependency changes in this PR |
| secrets:check | PASS | ~12s | `npm run secrets:check` | no leaks found |
| unit | PASS | 164.64s | `npm run test:unit:slnt` | 577 files, 5844 tests passed |
| integration | PASS | 70.47s | `npm run test:integration:slnt` | 45 files, 531 passed / 1 skipped |

## Failure detail (if any)

None.

## Drift signal

no
