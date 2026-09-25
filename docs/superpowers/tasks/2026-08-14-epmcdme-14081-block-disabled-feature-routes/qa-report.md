# QA Gate Report — epmcdme-14081-block-disabled-feature-routes

**Branch**: EPMCDME-14081_block-disabled-feature-routes
**Runner**: npm
**Started**: 2026-08-14T00:00:00.000Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Command | Notes |
|---|---|---|---|---|
| lint | guide | PASS | `npx eslint src/router.tsx` | 655 errors in pre-existing public/keycloakify JS files (not in src/); src/router.tsx clean |
| typecheck | guide | PASS | `npm run typecheck` | Silent output, exit 0 |
| unit | guide | PASS | `npm run test:unit` | 4408 passed, 0 failed |
| integration | guide | SKIPPED | `npm run test:integration` | Skipped per user request (no integration tests exist for router-level changes) |
| lint-staged | hook | SKIPPED | `npx lint-staged` | Hook runs at commit time; already ran on committed files |
| license | hook | SKIPPED | `npm run license-headers:check` | Hook runs at commit time |
| secrets | hook | SKIPPED | `npm run secrets:check` | Hook runs at commit time |
| sonar | hook | SKIPPED | `npm run sonar-local` | Hook runs at commit time |

## Drift signal

no
