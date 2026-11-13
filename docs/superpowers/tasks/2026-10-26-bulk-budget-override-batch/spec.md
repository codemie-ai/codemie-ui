# EPMCDME-16071: Batch endpoint for bulk member budget overrides (frontend)

Requirements source: `sdlc-standard-prompt.md` (same directory). Research: `technical-analysis.md`.

## Intent

Bulk Actions -> Override budgets saves one request per selected user per edited category
(`ProjectMembersBulkActions.tsx:221-230`, calling `overrideMemberAllocation`, `projectBudgets.ts:231`).
For 5 users this takes about a minute. The backend now exposes one batch endpoint. Switch to it for speed,
keeping everything else the user sees identical. Additionally, give `BulkBudgetOverrideModal` the same busy
lock `UnifiedProjectBudgetModal` already has, so a duplicate batch cannot be sent and the dialog cannot be
dismissed or edited mid-save.

## Backend contract (from the requirements doc; backend branch is not merged)

`POST v1/admin/project-budgets/member-overrides/bulk`
- Request: `{ items: [{ budget_id, user_id, allocated_max_budget, allocated_soft_budget, override_reason? }] }`, 1-1000 items.
- 200 response: `{ results: [{ budget_id, user_id, status: "ok" | "failed", code?, message? }], budgets: ProjectBudget[] }`.
  Results are in input order; `code`/`message` only on failed; `budgets` is `[]` when every item fails.
- Per-item failures arrive in `results` with HTTP 200. Whole-request failures (403, 400, 422, 500) reject the call; nothing is saved.

## Scope

1. **Types** (`src/types/entity/projectBudget.ts`, next to `MemberAllocationOverridePayload`): request item,
   result item (`code`/`message` optional) and response (including `budgets: ProjectBudget[]`, typed but unused).
2. **Store** (`src/store/projectBudgets.ts`): new `bulkOverrideMemberAllocations(items)` beside
   `overrideMemberAllocation`, same style: `api.post` with `skipErrorHandling: true`, set/reset `loading` and
   `error`, no toaster, rethrow on failure, return the parsed response. `overrideMemberAllocation` stays.
3. **Handler** (`ProjectMembersBulkActions.tsx`, `BulkBudgetOverrideModal` `onSubmit`): map `updates` to items in the
   same order, spreading `payload` unchanged; one `await` of the store method; `failedUserIds` = user ids of results
   with `status === "failed"`; if the call rejects, every user in `updates` is failed; the three toasts keep their
   exact text and counting; `finishBudgetAction()` is always called; remove the sequential-loop comment and
   its `eslint-disable no-await-in-loop`. Empty `updates` sends nothing (the modal already blocks it).
4. **Busy lock** (`BulkBudgetOverrideModal.tsx`), mirroring `UnifiedProjectBudgetModal.tsx:129,375,471,481`:
   - Replace `isSubmitting` with `useInFlightGuard`; in `handleSubmit` return when `tryBegin()` is false (after the
     existing `isDirty` / `hasInvalidPendingCategory` check); `end()` in `finally`.
   - `Popup busy={inFlight}`.
   - Save Override: `isLoading={inFlight}`, `disabled={!isDirty || hasInvalidPendingCategory}` (no `inFlight`).
     Cancel: `disabled={inFlight}`. (The "Reset budget usage" button no longer exists in this modal: EPMCDME-16610
     removed it together with the `onResetUsage` prop, so there is nothing to lock.)
   - Wrap the body in `<fieldset disabled={inFlight} className="m-0 min-w-0 border-0 p-0">`. Confirm category-card
     inputs and revert buttons become disabled; only if some control is not reached, pass the flag down to it.
   - No `busyHint` (Popup renders it only in the default footer).
5. **Tests**: update `ProjectMembersBulkActions.test.tsx` (currently spies on the per-user method; must target the
   new store method) and cover all-ok, partial-failure, all-failed (200 with `budgets: []`) and rejected-request
   toasts. Add busy-lock coverage to `BulkBudgetOverrideModal.test.tsx` (same-tick double submit sends once; Popup
   dismissal ignored while busy; inputs disabled). Add a store test for the new method (success, rejection resets
   `loading`, sets `error`, no toast).

## Acceptance criteria

- AC1: Saving for N users x M categories issues exactly one POST to the bulk endpoint, with items in the former loop order and payloads unchanged (`override_reason` only when edited).
- AC2: All ok -> existing success toast; some failed -> existing partial toast listing failed users once each; all failed (including 200 with `budgets: []`) -> existing failure toast; rejected request -> failure toast naming every selected user.
- AC3: In every case `finishBudgetAction()` runs once: refresh, selection cleared, popup closed.
- AC4: A second submit in the same tick (click or Enter) sends no second request.
- AC5: While saving, X, Esc and mask click do not close the dialog; Cancel is disabled; Save shows loading; all inputs and revert buttons are disabled.
- AC6: After the save settles (and when the dialog is reopened) the dialog is interactive again where it remains open.
- AC7: Type-check and lint pass; the updated and new tests pass.

## Non-goals

- No change to the dialog's form logic, validation, payload building, or layout beyond the fieldset wrapper.
- No use of the response `budgets` (existing refresh in `finishBudgetAction` is kept).
- No `busyHint`, no progress UI, no timing assertions ("under 10 seconds" and responsiveness are covered by EPMCDME-14996).
- No change to `MemberAllocationOverrideModal`, `overrideMemberAllocation`, bulk reset, or clear override.
- No "Reset budget usage" button or `onResetUsage` prop in `BulkBudgetOverrideModal` (removed on `main` by EPMCDME-16610; not reintroduced here).
- No changes to `Popup`, `usePopupBusy` or `useInFlightGuard`.
- No chunking for more than 1000 items; no backend changes.
- No branch, commit, push or MR as part of this spec (Git steps are done only on request, ticket EPMCDME-16071).

## Risks

- Backend branch is unmerged; the response shape is taken from the requirements doc.
- Per-item failures are hard to provoke in the browser; correctness rests on mocked-store unit tests.
- Removing `setIsSubmitting(false)` from the `[visible]` effect: the guard is ref-backed and ended in `finally`, so no reset on open is needed.
