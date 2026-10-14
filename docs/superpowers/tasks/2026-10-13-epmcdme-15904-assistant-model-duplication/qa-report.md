# QA Gate Report — EPMCDME-15904

**Branch**: EPMCDME-15904_assistant-model-duplication
**Runner**: npm
**Started**: 2026-10-13T13:44:00Z
**Status**: PASSED (mechanical gates) — Test Harness unverified, see note

## Gates

| Gate | Status | Duration | Command | Notes |
|---|---|---|---|---|
| Lint | PASS | ~15s | `npm run lint` | No output after file list, exit 0. |
| Type-check | PASS | ~20s | `npm run typecheck` | Silent output, exit 0. |
| License check | SKIPPED | — | `npm run license-check` | No dependency added/removed/moved. |
| Secret detection | PASS | ~8s | `npm run secrets:check` | `no leaks found`. |
| Unit Tests | PASS | 281s | `npm run test:unit:slnt` | 688 test files passed, 6944 tests passed (1 pre-existing skip, unrelated to this change). |
| Integration Tests | PASS | 86s | `npm run test:integration:slnt` | 49 test files passed, 558 tests passed (1 pre-existing skip, unrelated to this change). |
| Test Harness | SKIPPED (unavailable) | — | `npm run test-harness` | `~/.codemie/test-harness.json` is missing and the stack is not running in this environment. Per the guide, "a gate that could not run is unverified, not passed" — this must be run by a reviewer before merge; the MR description should ask for it per the project's MR handoff convention. |

## Failure detail (if any)

None — no gate failed. Only the Test Harness could not run (missing local config/stack).

## Drift signal

no — implementation matches `plan.md`; no spec/plan type-signature drift.
