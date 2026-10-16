# QA Gate Report — EPMCDME-15923

**Branch**: EPMCDME-15923_default-model-workflow-duplication
**Runner**: npm (per `.ai-run/guides/quality-gates.md`)
**Started**: 2026-10-14T13:48:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|---|---|---|---|---|
| reinstall | PASS | ~11s | `npm ci` | 1221 packages installed from lock file before trusting any gate below |
| lint | PASS | fast | `npm run lint` | No output after the file list, exit 0 |
| typecheck | PASS | fast | `npm run typecheck` | Silent output, exit 0 |
| license-check | PASS | fast | `npm run license-check` | Summary table printed, no disallowed licenses; no dependency added/removed in this change (skip-eligible, ran anyway) |
| secrets:check | PASS | ~7s | `npm run secrets:check` | gitleaks: "no leaks found" |
| unit | PASS | 210s | `npm run test:unit:slnt` | 692 test files passed, 6973 tests passed, 1 skipped, exit 0 |
| integration | PASS | 489s | `npm run test:integration:slnt` | 48 test files passed, 552 tests passed, 1 skipped, exit 0. One non-fatal `[vitest-pool-runner]: Timeout waiting for worker to respond` logged mid-run — no test file failed and exit code was 0, read as worker-pool infra flakiness under full-suite parallel load, not a regression from this diff. |

## Failure detail (if any)

None — all gates passed.

## Drift signal

no — implementation matches plan.md (Task 1 + the Stage-5 follow-up for default-row ordering), both committed and documented.

## Not run

- **Test Harness** (`npm run test-harness`, MR compliance gate) — requires the live stack and `~/.codemie/test-harness.json`; not run in this session. Per the guide, this is unverified, not passed, and must be run (or requested via `/sanity` from a reviewer) before the MR is considered compliant.
- **feature-verification** (browser screenshots) — this is a sdlc-light run invoked without `ui: true`; skipped per flow default. The change is a pure component-level dropdown fix; manual verification in a running app is recommended before merge given the UX nature of the fix (duplication + ordering), but was not performed in this session (no running dev server / browser tooling available here).
