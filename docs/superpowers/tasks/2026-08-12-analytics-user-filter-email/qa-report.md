# QA Gate Report — analytics-user-filter-email

**Branch**: EPMCDME-14070_analytics-user-filter-email
**Runner**: npm
**Started**: 2026-08-12T15:00:00Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Command | Notes |
|------|--------|--------|---------|-------|
| lint | guide | PASS | `npm run lint` | Errors only in pre-existing unrelated .js files (authChecker.js, common.js, etc.); zero errors in diff-touched src/ files |
| typecheck | guide | PASS | `npm run typecheck` | Silent output, exit 0 |
| unit | guide | PASS | `npm run test:unit` | Confirmed passing by user |
| integration | guide | PASS | `npm run test:integration` | Confirmed passing by user |
| ui | guide | SKIPPED | — | ui=false; no feature-verification required |
| lint-staged | hook | PASS | `npx lint-staged` | Ran automatically on every commit via Husky pre-commit hook |
| license | hook | PASS | `npm run license-headers:check` | Ran automatically on every commit; 0 missing headers |
| secrets | hook | PASS | `npm run secrets:check` | Ran automatically on every commit; gitleaks: no leaks found |
| sonar | hook | SKIPPED | `npm run sonar-local` | Self-skipped: "Skipping Sonar scan because SONAR_TOKEN is not set"; enable with SONAR_TOKEN env var |

## Failure detail

None.

## Drift signal

no
