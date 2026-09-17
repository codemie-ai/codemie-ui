# QA Gate Report — EPMCDME-9167

**Branch**: EPMCDME-9167_data-source-type
**Runner**: npm
**Started**: 2026-09-16T11:00:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                          | Notes                                      |
|-------------|---------|----------|----------------------------------|--------------------------------------------|
| lint        | PASS    | ~5s      | `npm run lint`                   | No errors or warnings in src/              |
| typecheck   | PASS    | ~10s     | `npm run typecheck`              | Silent output, exit 0                      |
| license     | SKIPPED | —        | `npm run license-check`          | No dependency changes on this branch       |
| secrets     | PASS    | ~10s     | `npm run secrets:check`          | no leaks found                             |
| unit        | PASS    | ~55s     | `npm run test:unit:slnt`         | 559 files, 5758 tests (2 new vs pre-fixup) |
| integration | PASS    | ~35s     | `npm run test:integration:slnt`  | 45 files, 530 passed / 1 skipped           |
| ui          | SKIPPED | —        | (none configured)                | No UI test script in project               |

## Failure detail

None.

## Drift signal

no
