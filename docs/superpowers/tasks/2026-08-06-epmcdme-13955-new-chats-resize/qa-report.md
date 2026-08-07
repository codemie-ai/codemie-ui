# QA Gate Report — epmcdme-13955-new-chats-resize

**Branch**: EPMCDME-13955_new-chats-resize
**Runner**: npm
**Started**: 2026-08-06T17:58:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                     | Notes                                      |
|-------------|---------|----------|-----------------------------|--------------------------------------------|
| lint        | PASS    | ~3s      | `npm run lint`              | Pre-existing React-version config warning only |
| typecheck   | PASS    | ~8s      | `npm run typecheck`         | Silent, exit 0                             |
| unit        | PASS    | ~31s     | `npm run test:unit`         | 363 files, 4217 tests                      |
| integration | PASS    | ~23s     | `npm run test:integration`  | 35 files, 463 passed / 1 skipped           |
| ui          | SKIPPED | —        | (n/a)                       | No configured UI test script               |

## Drift signal

no
