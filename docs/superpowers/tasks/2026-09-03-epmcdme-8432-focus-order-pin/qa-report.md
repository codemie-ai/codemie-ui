# QA Gate Report — epmcdme-8432-focus-order-pin

**Branch**: EPMCDME-8432_focus-order-pin
**Runner**: npm
**Started**: 2026-09-03T15:58:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~5s | `npm run lint` | Stashed unrelated dirty dev files (useFeatureFlags.ts, vite.config.ts, Dockerfile.dev) before running; those have a react-hooks/rules-of-hooks violation from a local dev override unrelated to this branch |
| type-check | PASS | ~8s | `npm run typecheck` | Silent, exit 0 |
| license-check | SKIPPED | — | `npm run license-check` | No dependencies added or removed |
| secrets | PASS | — | `npm run secrets:check` | Ran in pre-commit hook: "no leaks found" |
| unit | PASS | 53s | `npm run test:unit` | 498 test files, 5233 passed, 1 skipped |
| integration | PASS | 27s | `npm run test:integration` | 40 test files, 500 passed, 1 skipped. Pre-existing store console noise (assistants null-check) — not from this branch |

## Failure detail

None.

## Drift signal

no
