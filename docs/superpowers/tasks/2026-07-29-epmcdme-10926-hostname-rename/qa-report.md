# QA Gate Report — epmcdme-10926-hostname-rename

**Branch**: EPMCDME-10926_ado-credentials-frontend
**Runner**: npm (quality-gates.md guide-first)
**Started**: 2026-07-29T08:20:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                      | Notes |
|-------------|---------|----------|------------------------------|-------|
| lint        | PASS    | ~5s      | `npm run lint`               | One React-version eslint-plugin warning (non-blocking); exit 0 |
| typecheck   | PASS    | ~10s     | `npm run typecheck`          | Silent output; exit 0 |
| unit        | PASS    | ~338s    | `npm run test:unit`          | 3208 tests pass; 65 pre-existing ERR_REQUIRE_ESM file failures (react-syntax-highlighter ESM incompatibility, present on main); exit 0 |
| integration | PASS    | ~88s     | `npm run test:integration`   | 9 tests pass; 29 pre-existing ERR_REQUIRE_ESM file failures (same root cause); exit 0 |
| ui          | SKIPPED | —        | n/a                          | No UI test script configured; diff touches config+tests only, not interactive UI surfaces |

## Failure detail

None. All guide-defined gates exited 0.

Pre-existing ERR_REQUIRE_ESM errors (not caused by this change):
```
Error: require() of ES Module node_modules/refractor/lib/core.js from
node_modules/react-syntax-highlighter/dist/cjs/prism-light.js not supported.
```
These 65 unit + 29 integration file failures are present on the main branch and are unrelated to the AzureDevOps label rename.

## Drift signal

no
