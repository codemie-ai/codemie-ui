# QA Gate Report — epmcdme-13954-cursor-jumping

**Branch**: EPMCDME-13954_cursor-jumping
**Runner**: npm
**Started**: 2026-08-06T17:01:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                    | Notes                        |
|-------------|---------|----------|----------------------------|------------------------------|
| lint        | PASS    | ~5s      | `npm run lint`             | No errors                    |
| typecheck   | PASS    | ~10s     | `npm run typecheck`        | Silent, exit 0               |
| unit        | PASS    | 37.8s    | `npm run test:unit`        | 363 files, 4218 tests passed |
| integration | PASS    | 22.5s    | `npm run test:integration` | 35 files, 463 passed, 1 skip |
| ui          | SKIPPED | —        | (n/a)                      | No configured UI test script |

## Failure detail

None.

## Drift signal

no
