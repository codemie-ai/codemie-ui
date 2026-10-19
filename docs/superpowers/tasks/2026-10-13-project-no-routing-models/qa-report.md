# QA Gate Report — EPMCDME-15905

**Branch**: EPMCDME-15905_project-no-routing-models
**Runner**: npm (per `.ai-run/guides/quality-gates.md`)
**Started**: 2026-10-14T10:43:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|---|---|---|---|---|
| reinstall | PASS | 12s | `npm ci` | Run before trusting any gate below, per AGENTS.md. |
| lint | PASS | ~5s | `npm run lint` | No output after the file list. |
| typecheck | PASS | ~15s | `npm run typecheck` | Silent, exit 0. |
| license-check | SKIPPED | — | `npm run license-check` | No dependency added/removed/moved. |
| secrets-check | PASS | ~8s | `npm run secrets:check` | `no leaks found`. |
| unit | PASS | 261s | `npm run test:unit:slnt` | 688 test files, 6945 passed, 1 pre-existing skip. |
| integration | PASS | 80s | `npm run test:integration:slnt` | 49 test files, 558 passed, 1 pre-existing skip. |
| test-harness | SKIPPED | — | `npm run test-harness` | Requires the live stack + `~/.codemie/test-harness.json`; not available in this session. Unverified, not passed — flag for the MR reviewer per the `/sanity` ask in the MR template. |

## Failure detail (if any)

None — no gate failed.

## Drift signal

no
