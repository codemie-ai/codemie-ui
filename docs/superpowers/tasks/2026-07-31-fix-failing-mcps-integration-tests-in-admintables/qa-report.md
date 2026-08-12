# QA Gate Report — fix-failing-mcps-integration-tests-in-admintables

**Branch**: EPMCDME-8420_no-accessible-name-for-triple-dots-button
**Runner**: npm
**Started**: 2026-07-31T15:23:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~12s | `npm run lint` | Pre-existing React version config warning (non-blocking) |
| typecheck | PASS | ~8s | `npm run typecheck` | Silent output, exit 0 |
| unit | PASS | ~42s | `npm run test:unit` | 4004/4004 passed |
| integration | PASS | ~31s | `npm run test:integration` | 451 passed, 1 skipped (30/30 test files) |

## Drift signal

no
