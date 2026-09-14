# QA Gate Report — epmcdme-14302-fix-clear-all-filter-visibility

**Branch**: EPMCDME-14302-fix-clear-all-filter-visibility
**Runner**: npm (guide-first: .ai-run/guides/quality-gates.md)
**Started**: 2026-08-21T11:20:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~5s | `npm run lint` | No errors; benign React version warning only |
| type-check | PASS | ~10s | `npm run typecheck` | Silent, exit 0 |
| license-check | PASS | ~5s | `npm run license-check` | All licences in allow list |
| secrets | PASS | ~8s | `npm run secrets:check` | no leaks found |
| unit tests | PASS | 178s | `npm run test:unit` | 432 test files, 4686 tests passed |
| integration tests | PASS | 79s | `npm run test:integration` | 37 test files, 487 passed, 1 skipped |
| ui | SKIPPED | — | n/a | Diff touches .tsx but no configured UI test script; feature-verification skipped (non-ui sdlc-light run) |

## Failure detail

None.

## Drift signal

no
