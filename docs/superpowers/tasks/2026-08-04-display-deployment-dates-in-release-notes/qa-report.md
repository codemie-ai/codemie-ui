# QA Gate Report — EPMCDME-10701

**Branch**: EPMCDME-10701_display-deployment-dates-in-release-notes
**Runner**: npm
**Started**: 2026-08-04T15:45:00Z
**Status**: BLOCKED (pre-existing baseline failures — not introduced by this change)

## Gates

| Gate        | Status                  | Duration | Command                   | Notes |
|-------------|-------------------------|----------|---------------------------|-------|
| lint        | PASS                    | ~5s      | `npm run lint`            | Exit 0; React version warning only (pre-existing) |
| typecheck   | PASS                    | ~8s      | `npm run typecheck`       | Silent, exit 0 |
| unit        | FAIL (pre-existing)     | ~233s    | `npm run test:unit`       | 4006 passed / 4 failed — all failures confirmed on main baseline; exit code 0 |
| integration | PASS                    | ~120s    | `npm run test:integration`| 462 passed / 1 skipped, exit 0 |
| ui          | SKIPPED                 | —        | n/a                       | Diff touches only store + test files, no UI surface changed |

## Failure detail

### Unit test failures (all pre-existing — confirmed on main before this change)

```
FAIL scripts/license_headers/__tests__/check_license_headers.test.mjs
  — Untracked file, pre-existing on main baseline (not in this diff)

FAIL scripts/license_headers/__tests__/check_license_headers.test.js
  — Pre-existing on main baseline (not in this diff)

FAIL src/utils/__tests__/analyticsFormatters.test.ts
  > formats currency values with two decimal places
  > formats numbers with locale separators when no explicit format is provided
  — Locale-sensitive number formatting; pre-existing on main baseline

FAIL src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx
  > release date > displays formatted date when release has a date
  — Expects 'July 11, 2025'; locale-sensitive; pre-existing on main (confirmed by stash+run)

FAIL src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx
  > displays spending metrics with correct formatting
  — Locale-sensitive ('1,000'); pre-existing on main baseline
```

This PR's new tests (src/store/__tests__/appInfo.test.ts) — all 4 PASS.

## Drift signal

no
