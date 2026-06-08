# QA Health

**Last assessed**: 2026-06-08
**Coverage**: qualitative: medium — ~90 unit test files cover components and utilities well; store layer and page-level integration tests are sparse

## Coverage Summary

| Module / area | Coverage | Notes |
|---|---|---|
| `src/components/` | medium-high | Most reusable components have unit tests |
| `src/pages/assistants/` | medium | 29 unit tests; no integration tests |
| `src/pages/chat/` | medium | 21 unit tests; no integration tests |
| `src/pages/workflows/` | medium | 26 unit tests (node rendering); no integration tests |
| `src/pages/analytics/` | medium | 11 unit tests (form state hooks); no integration tests |
| `src/pages/settings/` | low-medium | 6 unit tests; 2 integration tests (Providers pages) |
| `src/pages/skills/` | low | 4 unit tests |
| `src/pages/help/` | low | 3 unit tests |
| `src/pages/releaseNotes/` | low | 2 unit tests |
| `src/pages/dataSources/` | very low | 1 unit test |
| `src/pages/applications/` | 0% | No tests |
| `src/pages/error/` | 0% | No tests |
| `src/pages/favorites/` | 0% | No tests |
| `src/pages/integrations/` | 0% | No tests |
| `src/pages/katas/` | 0% | No tests |
| `src/store/` | low | 8 store test files out of ~30 store modules |
| `src/store/analytics.ts` | 0% | High-complexity store, no tests |
| `src/store/assistants.ts` | 0% | Core store, no direct tests |
| `src/store/chats.ts` | 0% | Core store, no direct tests |
| `src/store/workflows.ts` | 0% | Core store, no direct tests |
| `src/store/auth.ts` | 0% | Auth store, no direct tests |
| `src/utils/workflowEditor/` | high | Well-tested: serializer, deserializer, actions, helpers |
| `src/hooks/` | low | 3 hook tests (`useUndo`, `useFileUpload`, `usePolling`) |
| `src/authentication/` | medium | 3 component tests + 2 integration tests (SignIn, SignUp) |

## Risky Untested Areas

Modules with zero or low coverage that carry business logic:

| Path | Coverage | Risk reason |
|---|---|---|
| `src/pages/integrations/` | 0% | Integration management UI — no tests at any level |
| `src/pages/applications/` | 0% | Application list/detail — no tests |
| `src/pages/favorites/` | 0% | Favorites store + UI — recently added, no tests |
| `src/pages/katas/` | 0% | Katas feature — no tests |
| `src/store/analytics.ts` | 0% | Complex analytics queries and aggregations |
| `src/store/chats.ts` | 0% | Core chat state, streaming, history management |
| `src/store/assistants.ts` | 0% | Core assistant CRUD and configuration logic |
| `src/store/workflows.ts` | 0% | Workflow CRUD — complex state management |
| `src/store/auth.ts` | 0% | Authentication and session management |
| `src/store/budgets.ts` | 0% | Budget enforcement logic |
| `src/pages/dataSources/` | very low | Data source management — only 1 test |

## Known Test Debt

- Integration test coverage is minimal (2 files, authentication only). The `src/test-utils/integration.tsx` infrastructure was set up in EPMCDME-10409 (Apr 2026) but adoption across pages has not happened yet.
- No coverage thresholds are configured — regressions in tested areas go undetected by CI.
- The external test harness (`../codemie-sdk/test-harness`) provides Playwright UI coverage for many of the zero-coverage areas above, but requires a live environment to run.

## Recent Test Activity

Most recently modified test files (from git log):

1. `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx`
2. `src/store/__tests__/chatGeneration.test.ts`
3. `src/pages/analytics/components/__tests__/AnalyticsFilters.test.tsx`
4. `src/pages/workflows/details/states/__tests__/ContinueWithInputPopup.test.tsx`
5. `src/authentication/local/__tests__/SignInPage.integration.test.tsx`
