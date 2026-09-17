# QA Gate Report — EPMCDME-15020

**Branch**: EPMCDME-15020_scheduler-user-project-type-switch
**Runner**: npm
**Started**: 2026-09-15T16:54:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|---|---|---|---|---|
| lint | PASS | ~5s | `npm run lint` | Clean — only React version advisory warning (pre-existing) |
| typecheck | PASS | ~10s | `npm run typecheck` | Silent output, exit 0 |
| unit | SKIPPED | — | `npm run test:unit:slnt` | No unit test files changed |
| integration | PASS | 14.24s | `npm run test:integration:slnt -- src/pages/schedulers/__tests__/SchedulersPage.integration.test.tsx` | 6/6 tests passed |
| ui | SKIPPED | — | n/a | UI surface changed but feature-verification handles browser evidence |

## Test results

```
✓ SchedulersPage > calls GET /v1/schedulers/filter-options on mount
✓ SchedulersPage > shows resource names in the Resource filter dropdown
✓ SchedulersPage > shows project names in the Project filter dropdown
✓ SchedulersPage > accepts ownerType in fetchSchedulers query
✓ SchedulersPage > Scheduler Type switch > does not render the type switch for non-admin users
✓ SchedulersPage > Scheduler Type switch > renders the type switch for admin users

Test Files  1 passed (1)
     Tests  6 passed (6)
  Duration  14.24s
```

## Drift signal

no
