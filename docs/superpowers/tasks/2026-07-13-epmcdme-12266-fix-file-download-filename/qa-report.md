# QA Report — EPMCDME-12266

**Branch:** EPMCDME-12266_fix-file-download-filename  
**Date:** 2026-07-13  
**HEAD:** ee55284c0c02d4d3888bfd6c5b47689c1bedae7a

## Gates

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | PASS — no errors |
| Type-check | `npm run typecheck` | PASS — silent, exit 0 |
| Unit tests | `npm run test:unit` | PASS — 3377 passed, 4 pre-existing failures (unrelated) |
| Integration tests | `npm run test:integration` | PASS — 286 passed, 5 pre-existing failures (unrelated) |

## Pre-existing failures (not introduced by this branch)

- `src/utils/__tests__/analyticsFormatters.test.ts` — 2 failures (locale number formatting)
- `src/pages/releaseNotes/__tests__/ReleaseNotesPage.test.tsx` — 1 failure
- `src/pages/workflows/details/__tests__/WorkflowExecutionInfoPopup.test.tsx` — 1 failure
- `src/utils/__tests__/navigateBack.integration.test.ts` — 4 failures
- `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx` — 1 failure

## New tests added

| File | Tests | Result |
|---|---|---|
| `src/store/__tests__/files.test.ts` | 2 | PASS |
| `src/store/__tests__/chats.export.test.ts` | 3 | PASS |
| `src/store/__tests__/agentWorkspace.test.ts` | 5 (updated assertion) | PASS |
