# Bulk Budget Override Batch Endpoint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bulk "Override budgets" saves with one `POST v1/admin/project-budgets/member-overrides/bulk` instead of a per-user PATCH loop, and `BulkBudgetOverrideModal` gets the same busy lock as `UnifiedProjectBudgetModal`.

**Architecture:** New types plus a valtio store method (modeled on `overrideMemberAllocation`); the `onSubmit` handler in `ProjectMembersBulkActions.tsx` makes one awaited call and derives `failedUserIds` from per-item results; the modal swaps local `isSubmitting` for `useInFlightGuard` + `Popup busy` + `<fieldset disabled>`.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + React Testing Library.

**Spec:** `docs/superpowers/tasks/2026-10-26-bulk-budget-override-batch/spec.md` (research: `technical-analysis.md`, same dir).

Commit per task using the repository's existing convention (ticket EPMCDME-16071). Run only the task's own test file(s); whole-suite gates are owned by the calling flow. Paths below are under `src/pages/settings/administration/components/projectsManagement/` unless absolute-from-`src/`.

## Global Constraints

- Keep `overrideMemberAllocation`, `MemberAllocationOverrideModal`, `Popup`, `usePopupBusy`, `useInFlightGuard` unchanged.
- Toast texts and counting stay byte-identical; `finishBudgetAction()` always runs once.
- Response `budgets` is typed but never used. No `busyHint`. No chunking. No toaster in the store method.
- New source/test files carry the EPAM Apache license header.

## Review Focus

- Request rejects (403/500): every selected user is reported failed, refresh/close still happen.
- 200 with every result `failed` and `budgets: []`: the "Failed to update budgets" toast, not success.
- One user failing in several categories is counted/listed once.
- Same-tick double submit (click then Enter) sends one request.
- Empty `updates` sends no request.

---

### Task 1: Types and store method

**Files:**
- Modify: `src/types/entity/projectBudget.ts` (append after `MemberAllocationOverridePayload`, ~L76-80)
- Modify: `src/store/projectBudgets.ts` (interface L37-75 beside L56-61; implementation after `overrideMemberAllocation`, L230-255)
- Create: `src/store/__tests__/projectBudgets.bulkOverride.test.ts` (style: `src/store/__tests__/costCenters.budgetSummary.test.ts`)

**Interfaces:**
- Produces (types):
  ```ts
  export interface BulkMemberOverrideItem extends MemberAllocationOverridePayload { budget_id: string; user_id: string }
  export interface BulkMemberOverrideResult { budget_id: string; user_id: string; status: 'ok' | 'failed'; code?: number; message?: string }
  export interface BulkMemberOverrideResponse { results: BulkMemberOverrideResult[]; budgets: ProjectBudget[] }
  ```
- Produces (store): `bulkOverrideMemberAllocations(items: BulkMemberOverrideItem[]): Promise<BulkMemberOverrideResponse>`

Test-first: yes — store test fails because `bulkOverrideMemberAllocations` does not exist.

- [ ] **Step 1: Write failing tests** in the new file, spying `api.post` and `toaster.error`: (a) success posts `'v1/admin/project-budgets/member-overrides/bulk'` with body `{ items }` and `{ skipErrorHandling: true }`, returns parsed JSON, `loading` false after; (b) rejection with `parsedError.message` rethrows, sets `error` to that message, resets `loading`, and `toaster.error` is not called.
- [ ] **Step 2: Run** `npx vitest run --project unit src/store/__tests__/projectBudgets.bulkOverride.test.ts`; expect FAIL.
- [ ] **Step 3: Add the three types** (above) and the interface entry plus implementation, copying the `overrideMemberAllocation` shape (loading/error, message from `error?.parsedError?.message ?? error?.message ?? 'Failed to override member allocations'`, no toaster, rethrow, `api.post`).
- [ ] **Step 4: Re-run** the file; expect PASS.

### Task 2: Batch call in `onSubmit`

**Files:**
- Modify: `ProjectMembersBulkActions.tsx:221-249` (loop at L222-231 only; toasts L232-248 and `finishBudgetAction()` untouched)
- Test: `__tests__/ProjectMembersBulkActions.test.tsx` (spy at L120, rejection test L136-148)

**Interfaces:**
- Consumes: `projectBudgetsStore.bulkOverrideMemberAllocations(items)` from Task 1.

Test-first: yes — tests spying `bulkOverrideMemberAllocations` fail while the handler still calls the per-user PATCH method.

- [ ] **Step 1: Update tests.** In the `BulkBudgetOverrideModal` mock stub (L37-40), replace both `payload: { max_budget: 1 }` with the real shape `payload: { allocated_max_budget: 1, allocated_soft_budget: 1 }`. Replace the L120 spy with `bulkOverrideMemberAllocations` resolving all-ok results for the stub's two updates (`u-1`, `u-2`, `b-1`); rewrite the L136-148 test as a rejected request. Add cases asserting toast text via the mocked `toaster` and that refresh/clear/`onBudgetsChanged` run once in each: all ok (`Updated budget overrides for 2 user(s) successfully`); partial (`u-2` failed: `Updated 1 user(s); failed for 1: John Roe`); all failed with `budgets: []` (`Failed to update budgets for 2 user(s): Jane Doe, John Roe`); rejected request (same failure toast naming both users). Assert exactly one store call whose `items` equal the updates mapped to `{ budget_id, user_id, ...payload }` in order (so each item carries `allocated_max_budget` and `allocated_soft_budget`). Add a duplicate-failure case (two results for `u-2` failed) expecting the user listed once.
- [ ] **Step 2: Run** `npx vitest run --project unit <that file>`; expect FAIL.
- [ ] **Step 3: Rewrite the handler head.** If `updates` is empty skip the call; otherwise map `updates` to items (`budget_id`, `user_id`, spread `payload`), `await` the store method in try/catch; on success `failedUserIds` = `user_id`s with `status === 'failed'`; on catch all `updates` user ids. Delete the sequential-loop comment and the `no-await-in-loop` disable.
- [ ] **Step 4: Re-run** the file; expect PASS.

### Task 3: Busy lock in `BulkBudgetOverrideModal`

**Files:**
- Modify: `BulkBudgetOverrideModal.tsx` (`isSubmitting` state L157; `[visible]` effect L276-284 drop `setIsSubmitting(false)`; `handleSubmit` L329-357; `Popup` L360; footer L368-401; body wrapper L403)
- Test: `__tests__/BulkBudgetOverrideModal.test.tsx` (model: `administration/components/__tests__/UnifiedProjectBudgetModal.busy.test.tsx`)

**Interfaces:**
- Consumes: `useInFlightGuard()` -> `{ inFlight, tryBegin, end }` from `src/hooks/useInFlightGuard.ts`.

Test-first: yes — with `onSubmit` returning a deferred promise, a second submit currently sends twice and inputs/Popup stay enabled.

- [ ] **Step 1: Add failing tests** in the existing file's render setup: (a) dirty form, click Save twice in the same tick (and Enter via `fireEvent.submit`/key if reachable) -> `onSubmit` called once; (b) while pending, Cancel is disabled, Save shows loading (`aria-busy`/loading state as `Button isLoading` renders), every category input, `bulk_override_reason` input and revert button is disabled; (c) Popup dismissal (Esc / close X) does not call `onHide` while pending; (d) after the deferred promise resolves, controls are enabled again.
- [ ] **Step 2: Run** `npx vitest run --project unit <that file>`; expect FAIL.
- [ ] **Step 3: Implement** per spec 4: replace `isSubmitting` with `const { inFlight, tryBegin, end } = useInFlightGuard()`; in `handleSubmit` `if (!tryBegin()) return` right after the existing `isDirty`/`hasInvalidPendingCategory` check and `end()` in `finally`; `Popup busy={inFlight}`; Save `isLoading={inFlight}` with `disabled={!isDirty || hasInvalidPendingCategory}`; Cancel `disabled={inFlight}` (no Reset budget usage button: removed on `main` by EPMCDME-16610); wrap the body inside the `onBlur` div's content in `<fieldset disabled={inFlight} className="m-0 min-w-0 border-0 p-0">` (keep `space-y-4` on the inner/outer wrapper). If step 1(b) shows any control not disabled, pass `inFlight` down to that component only.
- [ ] **Step 4: Re-run** the file plus the existing tests in it; expect PASS.
