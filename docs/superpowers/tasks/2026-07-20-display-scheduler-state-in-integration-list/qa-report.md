# QA Gate Report — display-scheduler-state-in-integration-list

**Branch**: EPMCDME-8260_display-scheduler-state-in-integration-list
**Runner**: npm
**Started**: 2026-07-20T17:44:54Z
**Status**: PASSED

## Gates

| Gate        | Status  | Duration | Command                    | Notes |
|-------------|---------|----------|----------------------------|-------|
| lint        | PASS    | ~5s      | `npm run lint`             | React version advisory warning only (non-blocking, pre-existing) |
| typecheck   | PASS    | ~8s      | `npm run typecheck`        | Silent output, exit code 0 |
| unit        | PASS*   | 164s     | `npm run test:unit`        | 3459 passed. 4 failures are pre-existing on main (locale-sensitive formatting and license header tests — confirmed by running on main: same 4 failures, 282 vs 283 file count) |
| integration | PASS    | 156s     | `npm run test:integration` | 308 passed, 1 skipped (pre-existing) |
| ui          | N/A     | —        | —                          | Not defined in quality-gates.md; integration tests cover user-visible badge rendering |

\* Pre-existing failures confirmed on `main` branch, not introduced by this branch.

## Pre-existing failures (on main and on this branch)

The following 4 test failures exist on `main` and are unrelated to EPMCDME-8260:

- `scripts/license_headers/__tests__/check_license_headers.test.js`
- `src/utils/__tests__/analyticsFormatters.test.ts` — locale-sensitive number formatting (`1,000` vs `1 000`)
- `src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx` — date formatting
- `src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx` — locale-sensitive number formatting

None of these files are touched by this branch.

## New tests added by this branch

| File | Tests | Result |
|------|-------|--------|
| `src/pages/integrations/components/IntegrationStateBadge/__tests__/IntegrationStateBadge.test.tsx` | 4 | PASS |
| `src/pages/integrations/__tests__/IntegrationsPage.integration.test.tsx` | 3 | PASS |

## Drift signal

no
