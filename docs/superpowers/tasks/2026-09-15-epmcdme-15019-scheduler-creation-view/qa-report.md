# QA Gate Report — epmcdme-15019-scheduler-creation-view

**Branch**: EPMCDME-10682_additional-fixed-after-initial-implementation  
**Runner**: npm  
**Started**: 2026-09-15T18:38:00Z  
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                        | Notes |
|-------------|---------|----------|--------------------------------|-------|
| lint        | PASS    | ~8s      | `npm run lint`                 | No errors; one pre-existing React version warning (not blocking) |
| typecheck   | PASS    | ~12s     | `npm run typecheck`            | Silent output, exit code 0 |
| license     | SKIPPED | —        | `npm run license-check`        | No dependency changes in this branch |
| secrets     | SKIPPED | —        | `npm run secrets:check`        | Runs in pre-commit hook; passed on all commits |
| unit        | PASS    | 164s     | `npm run test:unit:slnt`       | 559 files, 5707 tests passed |
| integration | PASS    | 104s     | `npm run test:integration:slnt`| 45 files, 534 passed, 1 skipped (pre-existing) |
| ui          | SKIPPED | —        | (n/a)                          | No configured UI test script; `ui=false` for this run |

## Failure detail

None — all gates passed.

## Drift signal

no
