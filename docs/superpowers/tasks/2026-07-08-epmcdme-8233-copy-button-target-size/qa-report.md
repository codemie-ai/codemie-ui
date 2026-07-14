# QA Gate Report — EPMCDME-8233

**Branch**: EPMCDME-8233_copy-button-target-size
**Runner**: npm
**Started**: 2026-07-08T13:39:00Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                    | Notes |
|-------------|---------|----------|----------------------------|-------|
| lint        | PASS    | ~5s      | `npm run lint`             | React version warning only (pre-existing); no errors |
| typecheck   | PASS    | ~10s     | `npm run typecheck`        | Silent, exit 0 |
| unit        | PASS    | ~178s    | `npm run test:unit`        | 3228/3229 tests passed; 1 pre-existing failure in ReleaseNotesPage (date format test, confirmed failing on main before our changes); our 6 new tests all pass |
| integration | PASS    | ~96s     | `npm run test:integration` | 289 passed, 1 skipped, 0 failed |
| ui          | SKIPPED | —        | (none configured)          | No Playwright/Cypress UI test script in this project; feature-verification gate owns browser evidence |

## Pre-existing failures noted

- `src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx` — "displays formatted date when release has a date" expects `July 11, 2025`; confirmed failing on clean `main` before any changes from this branch.

## Drift signal

no
