# QA Gate Report — EPMCDME-8421_fix-hoverable-dismissible-tooltips

**Branch**: EPMCDME-8421_fix-hoverable-dismissible-tooltips
**Runner**: npm
**Started**: 2026-07-17T20:44:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Command                    | Notes |
|-------------|---------|----------------------------|-------|
| lint        | PASS    | `npm run lint`             | No errors. Pre-existing React version warning (non-blocking). |
| typecheck   | PASS    | `npm run typecheck`        | Silent, exit 0. |
| unit        | PASS    | `npm run test:unit`        | 283 files, 3503 tests passed. |
| integration | PASS    | `npm run test:integration` | 14 files, 305 passed, 1 pre-existing skip. |
| ui          | SKIPPED | —                          | No UI surface files changed (.ts utility + .toml config only). |

## Drift signal

no
