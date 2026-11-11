# Budget Created-By (Frontend) Implementation Plan

> Revised on 2026-10-26: this plan describes the delivered change. The first version had the backend (codemie !4563) return `created_by` as an object and showed the creator in the edit modal. That approach was dropped: the ticket scopes the change as display-only, nobody agreed to the breaking API change, and the ticket asks for a detail view. `decisions.jsonl` records the change.

**Goal:** Show the budget creator in the budgets list and in a budget detail view (EPMCDME-15628), without changing the API or how `created_by` is captured or stored.

**Architecture:** The API keeps returning `created_by` as a user id string (`"system"` for config budgets). The UI resolves names itself: `budgetsStore.resolveCreators` calls the existing `GET v1/admin/users/{id}` once per distinct creator and caches the result in `budgetsStore.creatorNames`. The list gets a "Created By" column. A new read-only "Budget details" popup, opened from a "View details" row action, is the detail view. The rest of the budgets table layout is unchanged from `main`.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL.

**Spec:** Jira EPMCDME-15628 (acceptance criteria below).

## Acceptance criteria

- AC1: the budgets list has a "Created By" column showing the creator's name, else username.
- AC2: a read-only "Budget details" popup, opened from a "View details" action in the row menu, shows "Created by". The action is available to every role that can view budgets (admin, maintainer, auditor), including preconfigured budgets. "Edit" stays maintainer-only and hidden for preconfigured budgets.
- AC3: config budgets (`"system"` or `is_preconfigured`) show "System", the product-wide fallback for a missing creator (`SYSTEM_CREATED_BY` in `utils/helpers.ts`). Unknown or soft-deleted creators (`deleted_at` set) show "—". Nothing errors or toasts.
- AC4: the create and update flows are untouched: `BudgetModal.tsx` stays identical to `main`, and the create/update store methods and payloads are unchanged.
- No other table layout change: the "Budget ID" and "Name" columns and the date cells stay as on `main`. Column widths are rebalanced only to fit the new column (they sum to 100).
- Lookups: one request per distinct creator id, no error toast. Only a 4xx is cached as unknown; 5xx, 408, 429 and network errors are retried on the next lookup.

## Task 1: Type and store

**Files:** `src/types/entity/budget.ts`, `src/store/budgets.ts`. Tests: `src/store/__tests__/budgets.resolveCreators.test.ts`.

- [x] `Budget.created_by` stays `string | null`. Add `SYSTEM_BUDGET_CREATOR` and `getBudgetCreatorDisplay(budget, creatorNames)` (resolved name, else "System" for preconfigured/`"system"`, else "—").
- [x] Add `creatorNames` and `resolveCreators(ids)`: skip `"system"`, empty, cached and in-flight ids; `name || username`; `deleted_at` → `null`; 4xx → `null`; other errors not cached. Calls `api.get` directly with `skipErrorHandling` (`userStore.getUserById` toasts on every failure).
- [x] Tests: dedupe, system/empty skip, cache hit, 4xx → `null` without toast, 5xx/429/network retried, soft-deleted → `null`.

## Task 2: List column

**Files:** `src/pages/settings/administration/BudgetsManagementPage.tsx`. Tests: `BudgetsManagementPage.createdBy.test.tsx`, store mocks in `.auditor` / `.category`.

- [x] Add the "Created By" column after "Reset"; rebalance widths to 100.
- [x] Call `resolveCreators` whenever the listed budgets change.

## Task 3: Detail view

**Files:** `src/pages/settings/administration/components/BudgetDetailsPopup.tsx`, `BudgetsManagementPage.tsx`. Tests: `BudgetDetailsPopup.test.tsx`, `BudgetsManagementPage.details.test.tsx`.

- [x] Read-only popup (`Popup`, no footer): Budget ID, Name, Description, Category, Limits, Duration, Reset, Created by, Updated. Requests the creator lookup on open.
- [x] Actions column shown to every viewer; menu: "View details" always, "Edit" for maintainers on non-preconfigured budgets (same pattern as Users management "View details").
- [x] Tests: popup content (name, System, "—", hidden without a budget); menu per role (auditor: View details only, including preconfigured; maintainer: Edit only on non-preconfigured); View details opens the chosen budget.
