# QA Gate Report — epmcdme-8547-fix-dropdown-focus-contrast

**Branch**: EPMCDME-8547_fix-dropdown-focus-contrast
**Runner**: npm
**Started**: 2026-08-11T12:43:00Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Duration | Command | Notes |
|------|--------|--------|----------|---------|-------|
| lint | guide | PASS | 19s | `npm run lint` | 1 react-version advisory warning; no errors |
| typecheck | guide | PASS | 13s | `npm run typecheck` | Silent, exit 0 |
| unit | guide | PASS | 80s | `npm run test:unit` | All suites pass; console.error lines are expected error-path assertions |
| integration | guide | PASS | ~10s | `npm run test:integration` | All suites pass, exit 0 |
| ui | guide | SKIPPED | — | (n/a) | No UI test script configured; diff touches `src/components/` (UI globs match) but feature-verification is separate |
| lint-staged | hook | SKIPPED | <1s | `npx lint-staged` | Self-skipped: "No staged files found" — runs automatically on commit |
| license-headers | hook | PASS | ~8s | `npm run license-headers:check` | 1754 files checked, 0 missing headers |
| secrets | hook | PASS | ~28s | `npm run secrets:check` | 86.48 MB scanned, no leaks found |
| sonar-local | hook | SKIPPED | <1s | `npm run sonar-local` | Self-skipped: "Skipping Sonar scan because SONAR_TOKEN is not set"; enable by setting SONAR_TOKEN env var |

## Failure detail

None.

## Drift signal

no — diff is a targeted one-line token value change in `tailwind.config.ts` (matching the plan task), with no spec or plan divergence.
