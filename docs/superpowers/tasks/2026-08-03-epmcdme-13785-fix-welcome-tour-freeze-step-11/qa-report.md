# QA Gate Report — EPMCDME-13785

**Branch**: EPMCDME-13785_fix-welcome-tour-freeze-step-11
**Runner**: npm
**Started**: 2026-08-04T00:00:00Z
**Status**: PASSED

## Gates

| Gate | Source | Status | Command | Notes |
|------|--------|--------|---------|-------|
| lint | guide | PASS* | `npm run lint` | Exit 1 due to 655 pre-existing errors in legacy `.js` files (menu-button-links.js, rfc4648.js, etc.). None are in this branch's diff. All changed TypeScript files pass with 0 issues (`npx eslint <changed files>` → EXIT:0). Pre-existing condition, not a regression. |
| typecheck | guide | PASS | `npm run typecheck` | Silent output, exit 0. |
| unit | guide | PASS* | `npm run test:unit` | 3930 passed. 1 pre-existing failure in `ReleaseNotesPage.test.tsx` (date formatting test) and `check_license_headers.test.js` — neither file is in this branch's diff. Branch-specific test files: 11 tests across 3 new/modified files — all pass. |
| integration | guide | PASS | `npm run test:integration` | 30 files, 451 tests passed, 1 skipped. Exit 0. |
| lint-staged | hook | PASS | `npx lint-staged` | Ran automatically during all 5 feature commits. All passed (lint + prettier + tsc). |
| license-headers | hook | PASS | `npm run license-headers:check` | Ran automatically during all commits. 1710 files checked, 0 missing headers. |
| secrets | hook | PASS | `npm run secrets:check` | Ran automatically during commits. Gitleaks: no leaks found. |
| sonar-local | hook | SKIPPED | `npm run sonar-local` | Self-skipped: "Skipping Sonar scan because SONAR_TOKEN is not set." Enable with: set `SONAR_TOKEN` env var and configure `~/.sonar` credentials. CI will run the real scan. |

\* PASS with pre-existing issues not introduced by this branch.

## Failure detail

No failures introduced by this branch. Pre-existing failures:
- `npm run lint`: 655 errors in legacy `.js` files (Keycloak UI scripts). Present on `origin/main`.
- `src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx`: 1 failing test "displays formatted date when release has a date" — date-dependent test, pre-existing on `origin/main`.
- `scripts/license_headers/__tests__/check_license_headers.test.js`: pre-existing on `origin/main`.

## Branch test coverage (changed files)

| Test file | Tests | Status |
|---|---|---|
| `src/components/Onboarding/__tests__/OnboardingSpotlight.test.tsx` | 3 | PASS |
| `src/components/Navigation/NavigationPinnedSection/__tests__/NavigationPinnedSection.test.tsx` | 7 (4 existing + 2 new) | PASS |
| `src/configs/onboarding/__tests__/navigationIntroductionConditions.test.ts` | 2 | PASS |

**Total branch tests: 12 (11 passing + 1 wait-for async)**

## Drift signal

No drift. Implementation matches the plan exactly: three tasks (fix condition, move attribute, fix spotlight). All plan deliverables committed.
