# QA Gate Report — epmcdme-14580-oauth-field-titles

**Branch**: EPMCDME-14587_remove-new-types-fix-bugs
**Runner**: npm
**Started**: 2026-09-02T11:27:09Z
**Status**: PASSED

## Gates

| Gate | Status | Command | Notes |
|------|--------|---------|-------|
| lint | PASS | `npm run lint` | Only a benign "React version not specified" warning; no errors, exit 0 |
| typecheck | PASS | `npm run typecheck` | tsc --noEmit silent, exit 0 |
| license-check | SKIPPED | `npm run license-check` | No dependency added/removed/moved (Skip if condition met) |
| secrets | PASS | `npm run secrets:check` | gitleaks: no leaks found |
| unit | PASS | `npm run test:unit` | Test Files 472 passed (472); Tests 4987 passed (4987) |
| integration | PASS | `npm run test:integration` | Test Files 39 passed (39); Tests 496 passed, 1 skipped (497) |

## Failure detail (if any)

None.

## Drift signal

no
