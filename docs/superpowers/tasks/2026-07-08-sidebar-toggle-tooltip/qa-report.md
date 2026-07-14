# QA Gate Report — sidebar-toggle-tooltip

**Branch**: EPMCDME-12771
**Runner**: npm
**Started**: 2026-07-08T06:23:00Z
**Status**: BLOCKED

## Gates

| Gate | Status | Duration | Command | Notes |
|------|--------|----------|---------|-------|
| lint | PASS | ~10s | `npm run lint` | no errors |
| typecheck | PASS | ~10s | `npm run typecheck` | no errors |
| unit | FAIL | 177.70s | `npm run test:unit` | 4 failed / 3211 passed. All 4 failures are in files unrelated to this change (`analyticsFormatters.test.ts`, `ReleaseNotesPage.test.tsx`, `WorkflowExecutionInfoPopup.test.tsx`) — locale-dependent number/date formatting assertions (e.g. expects `"1,000"`, environment produces `"1 000"`). Confirmed pre-existing: same 3 files/4 tests fail when run in isolation regardless of this branch's change, which touches only `SidebarToggle.tsx`. |
| integration | FAIL | 96.93s | `npm run test:integration` | 5 failed / 261 passed / 1 skipped. All failures are in `navigateBack.integration.test.ts` and `AssistantDetailsPage.integration.test.tsx` — `TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal` inside `hashRouter.navigate()`, an environment/react-router-version issue in the test harness, unrelated to sidebar/tooltip code. |
| ui | SKIPPED | — | (n/a) | no configured UI test script; diff is presentation-only and was manually verified in-browser by the user (hover-hold tooltip shows correct text/placement, dismisses on mouse-away, click and Ctrl+B toggle still work). |

## Failure detail

### Unit — pre-existing, unrelated
```
FAIL src/utils/__tests__/analyticsFormatters.test.ts > formats currency values with two decimal places
FAIL src/utils/__tests__/analyticsFormatters.test.ts > formats numbers with locale separators when no explicit format is provided
FAIL src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx > displays formatted date when release has a date
FAIL src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx > displays spending metrics with correct formatting
  expect(screen.getByText('1,000')).toBeInTheDocument()  — actual DOM shows "1 000" (locale-dependent thousands separator)
```

### Integration — pre-existing, unrelated
```
FAIL src/utils/__tests__/navigateBack.integration.test.ts (4 tests) > TypeError: RequestInit: Expected signal ("AbortSignal {}") to be an instance of AbortSignal
  at createClientSideRequest (react-router/dist/development/chunk-UIGDSWPH.mjs:4794:10)
FAIL src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx (1 test) > same AbortSignal TypeError
```

## Drift signal

no — implementation matches spec.md/plan.md exactly (three `data-tooltip-*` attributes on the button, nothing else).

## Scope note

`git diff --name-only c4d67a44a...HEAD` shows exactly one file changed by this branch: `src/components/Sidebar/SidebarToggle.tsx`. None of the 9 failing tests (across unit + integration) touch that file, its imports, or the global tooltip config it relies on (`src/utils/tooltip.ts`). All failures reproduce identically when run against files unrelated to this change and are consistent with pre-existing environment issues (locale formatting, react-router/AbortSignal polyfill mismatch in the test harness) rather than anything introduced by this diff.
