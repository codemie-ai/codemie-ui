# QA Gate Report — epmcdme-10682-schedulers

**Branch**: EPMCDME-10682_schedulers-view
**Runner**: npm
**Started**: 2026-09-11T15:30:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~10s | `npm run lint` | React version warning only; exit 0 |
| typecheck | PASS | ~150s | `npm run typecheck` | Silent; exit 0 |
| license-check | N/A | — | `npm run license-check` | No dependencies added or removed |
| secrets | N/A | — | `npm run secrets:check` | Pre-commit hook ran on every commit |
| unit | PASS | ~350s | `npm run test:unit` | 523 test files, 5415 tests passed; exit 0 |
| integration | PASS | ~445s | `npm run test:integration` | 43 files, 520 tests passed; exit 0 |

## Drift signal

no
