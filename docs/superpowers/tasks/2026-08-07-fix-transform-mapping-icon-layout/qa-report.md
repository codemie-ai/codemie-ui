# QA Gate Report — fix-transform-mapping-icon-layout

**Branch**: EPMCDME-13930_fix-transform-mapping-icon
**Runner**: npm
**Started**: 2026-08-07T13:30:00Z
**Status**: PASSED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~5s | `npm run lint` | Clean (React version warning is pre-existing config, not an error) |
| typecheck | PASS | ~15s | `npm run typecheck` | Silent output, exit 0 |
| unit | PASS | ~69s | `npm run test:unit` | 3405/3405 assertions pass; 70 suite failures are pre-existing ERR_REQUIRE_ESM in react-syntax-highlighter (unrelated to this change, no MappingRow tests exist) |
| integration | PASS | ~21s | `npm run test:integration` | 14/14 assertions pass; 31 suite failures are same pre-existing ERR_REQUIRE_ESM issue (unrelated) |
| ui | SKIPPED | — | (n/a) | UI surface changed but no configured UI test script; feature-verification must provide browser evidence |

## Failure detail

No failures related to this change. All test suite failures are caused by a pre-existing ESM/CJS compatibility issue with `react-syntax-highlighter/refractor` (`ERR_REQUIRE_ESM`), affecting unrelated modules (settings, stores, nodes, YAML panel).

## Drift signal

no
