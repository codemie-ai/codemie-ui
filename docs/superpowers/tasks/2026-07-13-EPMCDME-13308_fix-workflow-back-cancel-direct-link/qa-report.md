# QA Gate Report — EPMCDME-13308_fix-workflow-back-cancel-direct-link

**Branch**: EPMCDME-13308_fix-workflow-back-cancel-direct-link
**Runner**: npm
**Started**: 2026-07-13T14:22:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                    | Notes                                                   |
|-------------|---------|----------|----------------------------|---------------------------------------------------------|
| lint        | PASS    | ~8s      | `npm run lint`             | 0 errors; pre-existing React version advisory warning   |
| typecheck   | PASS    | ~15s     | `npm run typecheck`        | Silent output, exit 0                                   |
| unit        | PASS    | ~54s     | `npm run test:unit`        | 3355 passed, 258 files                                  |
| integration | PASS    | ~33s     | `npm run test:integration` | 289 passed, 1 skipped (pre-existing); 12 files          |
| ui          | SKIPPED | —        | (n/a)                      | No UI surface changed (diff is utility + test file only)|

## Drift signal

no
