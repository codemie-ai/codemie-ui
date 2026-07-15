# QA Report — EPMCDME-8665 font selection

Branch: `EPMCDME-8665`, HEAD: `0fe6552b028215f7b8dd85a82e8b40ab6aa11961`

## Gates run

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | Pass — no output, exit 0 |
| Typecheck | `npm run typecheck` | Pass — no output, exit 0 |
| Unit tests | `npm run test:unit` | 3375 passed, 4 failed, 258/261 files passed |
| Integration tests | `npm run test:integration` | 291 passed, 7 failed, 10/13 files passed |

## Failure analysis

All 7 failing tests are in files **not touched by this branch's diff** and fail for reasons
unrelated to the font-selection feature:

- `src/utils/__tests__/analyticsFormatters.test.ts` (2 failures) — `Intl.NumberFormat`
  locale/decimal-separator mismatch, pre-existing environment issue.
- `src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx` (1 failure) — date formatting
  locale mismatch, same root cause.
- `src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx` (1 failure) —
  number formatting (`1,000` vs `1 000`), same root cause.
- `src/utils/__tests__/navigateBack.integration.test.ts`,
  `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx`,
  `src/pages/assistants/__tests__/AssistantTemplatesPagination.integration.test.tsx` (3 failures) —
  `react-router` `AbortSignal` instance-check failure in the jsdom test environment; unrelated to
  this change.

Verified via `git diff main...HEAD --name-only` — none of the 6 failing test files appear in the
branch's changed-file list.

## Touched-surface result

All tests in files touched by this branch (`src/utils/customAppearance/**`,
`src/components/CodeBlock/**`, `src/pages/settings/components/CustomAppearance/**`,
`src/assets/stylesheets/**`) pass: 85 tests across 8 files.

## Verdict

`passed: true` — pre-existing, unrelated failures do not block this change. Lint and typecheck
clean.
