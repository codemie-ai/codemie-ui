# QA Gate Report — epmcdme-9314-table-borders-fix

**Branch**: EPMCDME-9314_table-borders-fix
**Runner**: npm (guide-first mode — .ai-run/guides/quality-gates.md)
**Started**: 2026-07-21T09:43:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~5s | `npm run lint` | Exit 0; one React version warning (not an error) |
| typecheck | PASS | ~3s | `npm run typecheck` | Silent, exit 0 |
| unit | PASS | ~27s | `npm run test:unit` | 284 files, 3509 tests passed |
| integration | PASS | ~20s | `npm run test:integration` | 15 files, 307 passed, 1 skipped, exit 0 |
| ui | SKIPPED | — | (n/a) | UI surface changed; no ui test script configured; feature-verification not requested (ui=false) |

## Drift signal

no
