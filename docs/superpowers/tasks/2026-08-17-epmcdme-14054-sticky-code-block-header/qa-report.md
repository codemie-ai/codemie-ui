# QA Gate Report — EPMCDME-14054

**Branch**: EPMCDME-14054_add-copy-code-block
**Runner**: npm
**Started**: 2026-08-17T11:23:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Command                      | Notes |
|-------------|---------|------------------------------|-------|
| lint        | PASS    | `npm run lint`               | Exit 0; React version warning only (pre-existing) |
| typecheck   | PASS    | `npm run typecheck`          | Silent, exit 0 |
| unit        | PASS    | `npm run test:unit`          | 4470/4470 tests passed across 408 test files |
| integration | PASS    | `npm run test:integration`   | 477 passed, 1 skipped (pre-existing skip), 35 files |
| ui          | SKIPPED | —                            | UI surface changed but no configured UI test script; browser evidence provided by feature-verification (PASS) |

## Drift signal

no
