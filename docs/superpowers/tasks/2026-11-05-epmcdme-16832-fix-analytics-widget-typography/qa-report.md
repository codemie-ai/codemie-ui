# QA Gate Report — EPMCDME-16832

**Branch**: EPMCDME-16832_fix-analytics-widget-typography
**Runner**: npm
**Started**: 2026-11-05T13:15:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|---|---|---|---|---|
| lint | PASS | ~15s | `npm run lint` | No output after file list, exit 0 |
| typecheck | PASS | ~20s | `npm run typecheck` | Silent, exit 0 |
| unit | PASS | 388s | `npm run test:unit:slnt` | 831 test files passed, 8468 passed / 1 skipped, exit 0 |
| integration | PASS | 274s | `npm run test:integration:slnt` | 57 test files passed, 650 passed / 1 skipped, exit 0 |
| license-check | SKIPPED | — | `npm run license-check` | No dependency added/removed/moved on this branch (guide's own Skip-if condition). The command itself errored on `@adobe/css-tools@4.5.0` (MIT) despite MIT being on the allow list — a pre-existing tooling issue unrelated to this diff, since `package.json`/`package-lock.json` are untouched. |
| secrets:check | PASS | ~12s | `npm run secrets:check` | `no leaks found`, exit 0 |
| UI gate | SKIPPED | — | (n/a) | No configured dedicated UI test script; diff is pure Tailwind className changes across 6 React components — covered by unit/integration suites above. Manual/visual verification is the plan's own Final Verification step (not automatable; no visual regression tooling exists in this repo). |

## Failure detail (if any)

None — no gate failed.

## Drift signal

no — implementation matches plan.md exactly (6 files, semantic tier table applied as specified, plus the CR-001 fix-up from code review restoring `leading-5`). No spec/plan exists to drift from beyond plan.md, which was followed task-by-task.
