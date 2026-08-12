# QA Gate Report — EPMCDME-13800_timezone-utc-offset-labels

**Branch**: EPMCDME-13800_timezone-utc-offset-labels
**Runner**: npm
**Started**: 2026-08-05T15:38:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                  | Notes |
|-------------|---------|----------|--------------------------|-------|
| lint        | PASS    | ~4s      | `npm run lint`           | One React-version advisory warning (pre-existing, not a lint error) |
| typecheck   | PASS    | ~5s      | `npm run typecheck`      | No type errors |
| unit        | PASS    | ~93s     | `npm run test:unit`      | 360 files, 4201 tests — all 14 timezone tests pass |
| integration | PASS    | ~55s     | `npm run test:integration` | 35 files, 464 tests (1 pre-existing skip) |

## Drift signal

no
