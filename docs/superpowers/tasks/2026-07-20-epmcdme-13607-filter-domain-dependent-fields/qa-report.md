# QA Gate Report — epmcdme-13607-filter-domain-dependent-fields

**Branch**: EPMCDME-13607_filter-domain-dependent-fields
**Runner**: npm
**Started**: 2026-07-20T16:46:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                   | Notes                                      |
|-------------|---------|----------|---------------------------|--------------------------------------------|
| lint        | PASS    | ~10s     | `npm run lint`            | No errors                                  |
| typecheck   | PASS    | ~5s      | `npm run typecheck`       | Silent output, exit 0                      |
| unit        | PASS    | 403s     | `npm run test:unit`       | 284 files, 3512 tests passed               |
| integration | PASS    | 254s     | `npm run test:integration`| 15 files, 306 passed, 1 skipped (pre-existing) |
| ui          | SKIPPED | —        | n/a                       | No configured UI test script               |

## Failure detail

None.

## Drift signal

no
