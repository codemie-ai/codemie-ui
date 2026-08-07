# QA Report — EPMCDME-13942

**Branch**: `EPMCDME-13942_hide-marketplace-sorting`  
**Merge base**: `06b08b0628e7c787f7548c46c1bb9510ffe15009`  
**HEAD**: `4b58da89c34170101f90ab393515abd467f2629e`  
**Generated**: 2026-08-07T11:55:00Z  
**Overall**: **FAIL** (unit gate; unrelated to ticket diff)

| Gate | Command | Result | Notes |
|---|---|---|---|
| lint | `npm run lint` | PASS | exit 0 |
| typecheck | `npm run typecheck` | PASS | exit 0 |
| unit | `npm run test:unit` | FAIL | 6 failed / 4233 passed (4 files); failures are locale/number-format assertions outside assistants sort change |
| integration | `npm run test:integration` | PASS | 35 files, 468 passed |

## Unit failures (unrelated to EPMCDME-13942)

- `src/utils/__tests__/analyticsFormatters.test.ts` — currency / locale separators
- `src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx` — formatted release date
- `src/pages/skills/components/__tests__/SkillInstructions.test.tsx` — character counter formatting
- `src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx` — expects `1,000` vs locale `1 000`

Changed-area unit re-check: `useAssistantFilters.test.ts`, `assistants.test.ts`, `filters.test.ts` — **51/51 PASS**.

## Feature verification

Skipped (`ui` not enabled for sdlc-light run).

## Diff files in scope

- `AssistantsListPage.integration.test.tsx`
- `AssistantFilters.tsx`
- `useAssistantFilters.ts`
- `useAssistantFilters.test.ts`
