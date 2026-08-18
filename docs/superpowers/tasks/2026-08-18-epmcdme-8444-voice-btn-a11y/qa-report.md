# QA Gate Report — epmcdme-8444-voice-btn-a11y

**Branch**: EPMCDME-8444_voice-btn-a11y
**Runner**: npm
**Started**: 2026-08-18T13:38:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~5s | `npm run lint` | 1 pre-existing React-version warning (not an error) |
| typecheck | PASS | ~8s | `npm run typecheck` | Silent output |
| license-check | SKIPPED | — | `npm run license-check` | No dependencies added/removed/moved |
| secrets | PASS | ~3s | `npm run secrets:check` | no leaks found |
| unit | PASS | ~51s | `npm run test:unit` | 417 test files, 4516 tests passed |
| integration | PASS | ~36s | `npm run test:integration` | 36 test files, 479 passed, 1 skipped (pre-existing) |

## Drift signal

no
