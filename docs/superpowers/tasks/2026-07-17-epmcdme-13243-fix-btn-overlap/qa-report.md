# QA Gate Report — epmcdme-13243-fix-btn-overlap

**Branch**: EPMCDME-13243_fix_btn_overlap
**Runner**: npm (guide-first via `.ai-run/guides/quality-gates.md`)
**Started**: 2026-07-17T13:35:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                  | Notes                                      |
|-------------|---------|----------|--------------------------|--------------------------------------------|
| lint        | PASS    | ~5s      | `npm run lint`           | Exit 0; React version warning only (pre-existing) |
| typecheck   | PASS    | ~10s     | `npm run typecheck`      | Silent, exit 0                             |
| unit        | PASS    | ~32s     | `npm run test:unit`      | 281 files, 3496 tests passed               |
| integration | PASS    | ~18s     | `npm run test:integration` | 14 files, 305 passed, 1 skipped; stderr mock output is expected |

## Failure detail

None.

## Drift signal

no
