# QA Gate Report — EPMCDME-15973 project-default-premium-label

**Branch**: EPMCDME-15973_project-default-premium-label
**Runner**: npm
**Merge base**: fd947fc38c56f8ef6800f3aa8bdf6176bb8ef326
**Started**: 2026-10-15
**Status**: PASSED

## Gates

| Gate | Status | Command | Notes |
|---|---|---|---|
| Lint | PASS | `npm run lint` | No output after file list, exit 0 |
| Type-check | PASS | `npm run typecheck` | Silent, exit 0 |
| License check | SKIPPED | `npm run license-check` | No dependency added/removed/moved — guide's skip condition applies |
| Secret detection | PASS | `npm run secrets:check` | `no leaks found` |
| Unit tests | PASS | `npm run test:unit:slnt` | 7028 passed, 1 skipped (pre-existing), 695 files |
| Integration tests | PASS | `npm run test:integration:slnt` | 558 passed, 1 skipped (pre-existing), 49 files |
| UI gate (test:ui) | SKIPPED | — | No separate configured UI test script beyond the unit/integration projects above; diff is a React component change already covered by the unit suite |
| Test harness (MR compliance) | SKIPPED | `npm run test-harness` | Requires the stack running and `~/.codemie/test-harness.json`, neither present in this environment. Not run — must be executed before opening the MR per `.ai-run/guides/testing/local-verification.md`. |

## Failure detail

None — no gate failed.

## Drift signal

no — implementation matches plan.md task-for-task; no spec/plan type or method-signature drift detected.
