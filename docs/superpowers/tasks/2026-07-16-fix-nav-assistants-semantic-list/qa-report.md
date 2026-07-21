# QA Gate Report — fix-nav-assistants-semantic-list

**Branch**: EPMCDME-8466_fix-nav-assistants-semantic-list
**Runner**: npm
**Started**: 2026-07-16T19:01:00Z
**Status**: PASSED

## Gates

| Gate         | Status  | Duration | Command                    | Notes |
|--------------|---------|----------|----------------------------|-------|
| lint         | PASS    | ~8s      | `npm run lint`             | Zero errors; React version warning is pre-existing |
| typecheck    | PASS    | ~15s     | `npm run typecheck`        | Silent, exit 0 |
| unit         | PASS    | ~310s    | `npm run test:unit`        | 2882 tests pass; 52 pre-existing ESM file failures (react-syntax-highlighter CJS/ESM compat issue in unrelated modules); exit 0 |
| integration  | PASS    | ~68s     | `npm run test:integration` | 9 tests pass; 12 pre-existing ESM file failures (same react-syntax-highlighter issue, unrelated modules); exit 0 |
| ui           | SKIPPED | —        | n/a                        | No configured UI test script; feature-verification not required (change is semantic HTML attribute addition with no visible UI surface change) |

## Pre-existing failures (not introduced by this change)

All 52 unit and 12 integration file-level failures are caused by:

```
Error: require() of ES Module .../node_modules/refractor/lib/core.js from
.../node_modules/react-syntax-highlighter/dist/cjs/prism-light.js not supported.
```

Affected files are in `pages/workflows`, `pages/assistants`, `pages/dataSources`, and `pages/settings/aws` — entirely unrelated to the Navigation component. These failures exist on `main` and are a pre-existing CJS/ESM compatibility issue in `react-syntax-highlighter`. All test runners return exit code 0.

## Drift signal

no
