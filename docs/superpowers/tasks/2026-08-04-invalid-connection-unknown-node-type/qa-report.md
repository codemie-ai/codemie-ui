# QA Gate Report — invalid-connection-unknown-node-type

**Branch**: EPMCDME-11609_sub-workflow-node-ui
**Runner**: npm
**Started**: 2026-08-04T17:10:00Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Duration | Command | Notes |
|------|--------|--------|----------|---------|-------|
| lint | guide | PASS | ~10s | `npm run lint` | No ESLint errors or warnings |
| typecheck | guide | PASS | ~15s | `npm run typecheck` | `tsc --noEmit` silent, exit 0 |
| unit | guide | PASS | 84s | `npm run test:unit -- --run` | 4016 passed, 339 test files |
| integration | guide | PASS | 51s | `npm run test:integration` | 452 passed / 1 skipped, 30 test files |
| ui | guide | SKIPPED | — | (none configured) | This fix touches only TypeScript utility/action files — no .tsx UI surface changed in this sdlc-light task scope |
| lint-staged | hook | PASS | — | `npx lint-staged` | Ran automatically on both commits; exit 0 |
| license-headers | hook | PASS | — | `npm run license-headers:check` | "Checked 1717 files, 0 missing license headers" (both commits) |
| secrets | hook | PASS | — | `npm run secrets:check` | "no leaks found" (both commits) |
| sonar-local | hook | SKIPPED | — | `npm run sonar-local` | "Skipping Sonar scan because SONAR_TOKEN is not set"; enable by setting SONAR_TOKEN env variable |

## Failure detail

None — all applicable gates passed.

## Drift signal

no
