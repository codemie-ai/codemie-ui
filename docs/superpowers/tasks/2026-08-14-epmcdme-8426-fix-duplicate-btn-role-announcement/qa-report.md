# QA Gate Report — epmcdme-8426-fix-duplicate-btn-role-announcement

**Branch**: EPMCDME-8426_fix-duplicate-btn-role-announcement
**Runner**: npm
**Started**: 2026-08-17T07:30:00Z
**Status**: PASSED

## Gates

| Gate  | Source | Status | Duration | Command | Notes |
|-------|--------|--------|----------|---------|-------|
| lint  | guide | PASS | ~5s | `npm run lint` | 0 errors, 0 warnings on tracked source (an initial run flagged 655 errors in `public/keycloakify-dev-resources/`, a `.gitignore`d dir, from a stale eslint cache — reran clean twice) |
| typecheck | guide | PASS | ~10s | `npm run typecheck` | Silent, exit 0 |
| unit | guide | PASS | ~30s | `npm run test:unit` | All suites pass, including new `ChatSidebarLists.test.tsx` assertions (2/2 passed) |
| integration | guide | PASS | ~30s | `npm run test:integration` | All suites pass; noisy stderr is from intentional error-path test cases, not failures |
| ui | guide | SKIPPED | — | (n/a) | UI surface changed (`.tsx` files) but no configured UI/e2e test script (`test:ui`) in package.json; feature-verification must provide browser evidence if invoked with `ui: true` |
| license-headers | hook | PASS | ~5s | `npm run license-headers:check` | Checked 1803 files, 0 missing headers |
| secrets | hook | PASS | ~4s | `npm run secrets:check` | Gitleaks: no leaks found |
| sonar-local | hook | SKIPPED | — | `npm run sonar-local` | Self-skipped: "Skipping Sonar scan because SONAR_TOKEN is not set." Enable locally by exporting `SONAR_TOKEN`. |

## Failure detail (if any)

None.

## Drift signal

no
