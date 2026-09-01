# QA Gate Report — epmcdme-14620-fix-subworkflow-unsaved-changes

**Branch**: EPMCDME-14620_fix-subworkflows
**Runner**: npm
**Started**: 2026-09-01T09:50:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Command                       | Notes |
|-------------|---------|-------------------------------|-------|
| lint        | PASS    | `npm run lint`                | No errors; pre-existing React version warning only |
| typecheck   | PASS    | `npm run typecheck`           | Silent, exit 0 |
| license     | SKIPPED | `npm run license-check`       | No dependency changes |
| secrets     | PASS    | `npm run secrets:check`       | no leaks found |
| unit        | PASS    | `npm run test:unit`           | 4914 passed, 463 files |
| integration | PASS    | `npm run test:integration`    | 496 passed, 1 skipped, 39 files |

## Drift signal

no
