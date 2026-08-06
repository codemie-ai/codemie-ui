# QA Gate Report — EPMCDME-9820

**Branch**: EPMCDME-9820_make-conf-tab-adjustable
**Runner**: npm
**Started**: 2026-07-22T12:33:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Command                    | Notes                                          |
|-------------|---------|----------------------------|------------------------------------------------|
| lint        | PASS    | `npm run lint`             | Exit 0; one non-blocking React version warning |
| typecheck   | PASS    | `npm run typecheck`        | Silent, exit 0                                 |
| unit        | PASS    | `npm run test:unit`        | 298 files, 3603 tests passed                   |
| integration | PASS    | `npm run test:integration` | 23 files, 372 passed / 1 skipped               |
| ui          | SKIPPED | —                          | No separate UI test script configured; feature-verification owns browser evidence |

## Drift signal

no
