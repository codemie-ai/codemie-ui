# QA Gate Report — context-window-resize

**Branch**: EPMCDME-11292_context_window_resize
**Runner**: npm (guide-first: `.ai-run/guides/quality-gates.md`)
**Started**: 2026-07-17T09:50:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                    | Notes |
|-------------|---------|----------|----------------------------|-------|
| lint        | PASS    | ~5s      | `npm run lint`             | One pre-existing React-version warning (not an error); exit 0 |
| typecheck   | PASS    | ~8s      | `npm run typecheck`        | Silent output; exit 0 |
| unit        | PASS    | ~28s     | `npm run test:unit`        | 279 test files, 3474 tests passed |
| integration | PASS    | ~18s     | `npm run test:integration` | 14 test files, 303 passed, 1 pre-existing skip; exit 0 |

## Failure detail

None.

## Drift signal

no
