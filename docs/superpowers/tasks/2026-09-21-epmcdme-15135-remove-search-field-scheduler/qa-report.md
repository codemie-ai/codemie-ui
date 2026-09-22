# QA Gate Report — epmcdme-15135-remove-search-field-scheduler

**Branch**: EPMCDME-15135_remove-search-field-from-scheduler
**Runner**: npm
**Started**: 2026-09-21T23:15:00.000Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~10s | `npm run lint` | No lint errors |
| typecheck | PASS | ~15s | `npm run typecheck` | No type errors |
| license-check | SKIPPED | — | `npm run license:check` | No dependency changes in this PR |
| secrets:check | PASS | ~2s | `npm run secrets:check` | no leaks found |
| unit | PASS | 167.89s | `npm run test:unit:slnt` | 577 files, 5844 tests passed |
| integration | PASS | 73.90s | `npm run test:integration:slnt` | 45 files, 531 passed / 1 skipped |

## Failure detail (if any)

None.

## Drift signal

no
