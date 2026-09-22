# QA Gate Report — epmcdme-15125-split-last-run-status-schedulers

**Branch**: EPMCDME-15125_split-last-run-and-status-schedulers
**Runner**: npm
**Started**: 2026-09-21T23:43:00.000Z
**Status**: PASSED

## Gates

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| lint | PASS | `npm run lint` | No errors; pre-existing React version warning only |
| type-check | PASS | `npm run typecheck` | Silent output, exit 0 |
| unit | PASS | `npm run test:unit:slnt` | 577 files, 5844 tests passed |
| integration | PASS | `npm run test:integration:slnt` | 45 files, 531 passed, 1 skipped (pre-existing) |
| secrets | PASS | `npm run secrets:check` | no leaks found |
| license | SKIPPED | `npm run license-check` | No dependency changes in this diff |

## Drift signal

no
