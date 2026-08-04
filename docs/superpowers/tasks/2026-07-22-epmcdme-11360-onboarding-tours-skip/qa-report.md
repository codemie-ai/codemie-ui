# QA Gate Report — epmcdme-11360-onboarding-tours-skip

**Branch**: EPMCDME-11360_fix-onboarding-tours-step-skip
**Runner**: npm (guide: `.ai-run/guides/quality-gates.md`)
**Started**: 2026-07-22
**Status**: PASSED

## Gates

| Gate        | Status  | Command                    | Notes |
|-------------|---------|----------------------------|-------|
| lint        | PASS    | `npm run lint`             | Exit 0; one non-blocking React version warning (pre-existing) |
| typecheck   | PASS    | `npm run typecheck`        | Silent, exit 0 |
| unit        | PASS    | `npm run test:unit`        | 290 files, 3534 tests passed |
| integration | PASS    | `npm run test:integration` | 22 files, 365 passed, 1 pre-existing skip |
| ui          | SKIPPED | —                          | ui=false on invocation; feature-verification not required |

## Failure detail

None.

## Drift signal

no
