# Technical Research

**Task**: project budgets bulk override members
**Generated**: 2026-10-26
**Research path**: codegraph

---

## 1. Original Context

Review https://jiraeu.epam.com/browse/EPMCDME-16071, lets implement frontend part of that. Helpful doc with details is available at docs/superpowers/tasks/2026-10-26-bulk-budget-override-batch/sdlc-standard-prompt.md (READ IT IN FULL — it is the requirements source: batch endpoint POST v1/admin/project-budgets/member-overrides/bulk replacing the per-user PATCH loop in ProjectMembersBulkActions.tsx, new types + store method, and a busy lock in BulkBudgetOverrideModal via useInFlightGuard/Popup busy/fieldset). No need to verify/implement the "under 10 seconds" rule or "The UI remains responsive during the operation and shows progress or completion feedback" — handled by the Popup busy updates from EPMCDME-14996.

---

## 2. Codebase Findings

### Existing Implementations
Paths under `src/pages/settings/administration/components/projectsManagement/` unless noted.
- `ProjectMembersBulkActions.tsx` — renders `BulkBudgetOverrideModal`; `onSubmit` (~L221-249) loops `updates` with `await projectBudgetsStore.overrideMemberAllocation(budgetId, userId, payload, true)` inside try/catch, adds user to `failedUserIds` on throw, then builds the three toasts (all ok / `Updated N user(s); failed for M: names` / `Failed to update budgets for M user(s): names`) and calls `await finishBudgetAction()`. The loop carries a "Backend rebalances after every PATCH..." comment and `// eslint-disable-next-line no-await-in-loop` (L225-226) to remove. `finishBudgetAction` (L131) = `await onBudgetsChanged?.()` in try/catch, `finally closePopup(true)` (refresh, clear selection, onSuccess, `setActivePopup(null)`); it closes via `visible`, not `Popup.onHide`.
- `BulkBudgetOverrideModal.tsx` — exports (non-exported interface) `BulkBudgetOverrideUpdate {budgetId,userId,payload: MemberAllocationOverridePayload}`; `onSubmit: (updates) => Promise<void>`. Local `isSubmitting` state at L157; reset by `setIsSubmitting(false)` inside the `useEffect([visible])` at L276-284 (alongside `setPending`, `setClearedMixed`); `handleSubmit` L329-357 (`if (!isDirty || hasInvalidPendingCategory) return`, builds `updates` per dirty category x user, `setIsSubmitting(true)` / `try await onSubmit(updates) finally setIsSubmitting(false)`). `Popup` (L360) has no `busy`; custom `footerContent` (L368-401): Reset usage button `disabled={isSubmitting}`, Cancel `disabled={isSubmitting}`, Save Override `disabled={isSubmitting || !isDirty || hasInvalidPendingCategory}`. Body is `<div className="space-y-4" onBlur={handleFieldBlur}>` (L403) holding `BudgetOverrideCategoryTable` > `BudgetOverrideCategoryCard` x up to 3 and a standalone `Input id="bulk_override_reason"` (L475).
- `BudgetOverrideCategoryCard.tsx` — two `components/form/Input` per card plus `RevertButton` (a native `<button type="button">` in the Input `rightIcon`); no `disabled` prop is passed or accepted. `Input` (`src/components/form/Input/Input.tsx`) renders a native `<input disabled={disabled}>` so a wrapping `<fieldset disabled>` reaches inputs and revert buttons natively (cosmetic `opacity-60` only follows the explicit `disabled` prop).
- `src/store/projectBudgets.ts` — valtio `proxy<ProjectBudgetsStore>`; interface at L37-75 (`overrideMemberAllocation` L56-61). Implementation L230-255: `this.loading=true; this.error=null; try { api.patch(url, payload, {skipErrorHandling:true}); return await response.json() } catch(error:any){ msg = error?.parsedError?.message ?? error?.message ?? '<fallback>'; this.error=msg; if(!silent) toaster.error(msg); throw error } finally { this.loading=false }`. `clearMemberOverride` follows directly (L257).
- `src/types/entity/projectBudget.ts` — `MemberAllocationOverridePayload` at L76-80 (`allocated_max_budget`, `allocated_soft_budget`, `override_reason?: string|null`) is the last declaration; also `ProjectBudget` (L30), `ProjectBudgetListResponse`, `BudgetSyncStatus`.
- `src/hooks/useInFlightGuard.ts` — returns `{inFlight, tryBegin, end}`; ref-backed so same-tick double invocation is rejected.
- `src/components/Popup/Popup.tsx` + `usePopupBusy.ts` — `busy` prop routes X/Esc/mask through `handleHide` (ignored while busy), refocuses dialog content, `aria-busy` on content. Popup sets `isLoading` on its own buttons only in the default footer; `busyHint` renders only in the default footer.
- `MemberAllocationOverrideModal.tsx` (`projectsManagement/components/`) — single-user dialog, still uses `overrideMemberAllocation`; must stay untouched.

### Architecture and Layers Affected
- Types layer: `src/types/entity/projectBudget.ts`.
- Store layer (valtio): `src/store/projectBudgets.ts` (the HTTP layer is `@/utils/api`).
- Page component layer: `ProjectMembersBulkActions.tsx` (orchestration, toasts) and `BulkBudgetOverrideModal.tsx` (dialog UI). Parent is `ProjectMembersManager.tsx` (`projectsManagement/`), which passes `onBudgetsChanged`, `budgets`, `budgetAllocationLookup`.
- Shared UI: `Popup`, `useInFlightGuard` are consumed, not changed.

### Integration Points
- Backend `POST v1/admin/project-budgets/member-overrides/bulk` (contract in section 8).
- `toaster` (`@/utils/toaster`) in `ProjectMembersBulkActions`.
- `ProjectMembersBulkActions` -> `BulkBudgetOverrideModal` prop `onSubmit`; `BulkBudgetOverrideModal` -> `Popup`, `BudgetOverrideCategoryCard`, `Input`, `Button`.

### Patterns and Conventions
- Reference busy-lock implementation: `UnifiedProjectBudgetModal.tsx` — `const { inFlight: submitting, tryBegin, end } = useInFlightGuard()` (L129); `if (... || !tryBeginSubmit()) return` (L375); `finally { endSubmit() }`; `busy={submitting}` (L471); body `<fieldset disabled={submitting} className="m-0 min-w-0 space-y-4 border-0 p-0">` (L481).
- Store methods use `skipErrorHandling: true`, set/reset `loading` and `error`, derive message via `error?.parsedError?.message ?? error?.message ?? fallback`.
- Source files carry the EPAM Apache license header.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists (architecture, patterns/state-management, development/api-integration, testing/testing-patterns, testing/local-verification, standards/git-workflow, quality-gates, patterns/modal-patterns, patterns/accessibility-patterns). Routed per AGENTS.md; not read in depth here (conventions were derived from code, see below). Task-specific requirement doc: `docs/superpowers/tasks/2026-10-26-bulk-budget-override-batch/sdlc-standard-prompt.md` (section 8).

### Architectural Decisions
- Recorded in the requirements doc: ignore `budgets` from the response, keep `finishBudgetAction` refresh; no `busyHint`; keep `overrideMemberAllocation`.
- AGENTS.md: tests only when explicitly asked (task doc itself references unit tests for per-item failure toasts); git ops only when asked, ticket key required (EPMCDME-16071), new branch from `EPMCDME-14996_lock-budget-dialog`; no push/MR without asking.

### Derived Conventions
See "Patterns and Conventions" above.

---

## 4. Testing Landscape

### Existing Coverage
- `components/projectsManagement/__tests__/ProjectMembersBulkActions.test.tsx` — mocks `BulkBudgetOverrideModal` with a stub that calls `onSubmit([{b-1,u-1,{max_budget:1}},{b-1,u-2,...}])`; spies `projectBudgetsStore.overrideMemberAllocation` (L120, L137-146, asserting 2 calls and a rejection case); asserts refresh-once, selection clear, popup close, refetch-rejection behavior. These tests spy the per-user method and will no longer reflect the handler once it calls the new store method.
- `components/projectsManagement/__tests__/BulkBudgetOverrideModal.test.tsx` — renders the real modal (real `Popup`, not mocked), `onSubmit` is `vi.fn().mockResolvedValue`; covers validation, mixed fields, revert, Save enable/disable via `userEvent`. No test of in-flight/busy behavior.
- `administration/components/__tests__/UnifiedProjectBudgetModal.busy.test.tsx` — model for busy-lock tests (deferred promise, `MockPopup` from `./budgetModalTestUtils`).
- `src/hooks/__tests__/useInFlightGuard.test.ts`, `src/components/Popup/__tests__/Popup.test.tsx` — hook and Popup busy.
- `projectsManagement/__tests__/ProjectMembersBudgetPermissions.test.tsx` — opens the bulk override from the menu (`isBulkOverrideVisible`).

### Testing Framework and Patterns
Vitest + React Testing Library (`unit` and `integration` projects), `vi.mock`/`vi.spyOn` on valtio stores, `@testing-library/user-event`, jest-dom matchers.

### Coverage Gaps
- No store test file for `projectBudgets` (no `src/store/__tests__/*projectBudgets*`).
- No test of the failed/partial/all-failed toast branches (current tests do not assert toast text; toaster is mocked in `ProjectMembersBulkActions.test.tsx`).
- No busy/double-submit test for `BulkBudgetOverrideModal`.

---

## 5. Configuration and Environment

### Environment Variables
None specific to this area found.

### Configuration Files
`vite.config.ts` (`test.projects`, worker cap/timeouts per AGENTS.md); dev server at `localhost:5173` per task doc.

### Feature Flags and Deployment Concerns
None found for the bulk override (the action is gated by `canManageBudgets` / `canResetBudgets` props). Backend dependency: endpoint lives on `codemie` branch `EPMCDME-16071_bulk-member-budget-override-batch`; FE verification needs it running locally.

---

## 6. Risk Indicators

- `BulkBudgetOverrideModal.tsx` L279: `setIsSubmitting(false)` inside the `[visible]` open effect; replacing `isSubmitting` with `useInFlightGuard` removes that call. Whether an `end()` is wanted there is a design choice (existing behavior resets on open).
- Wrapping the body in a `<fieldset disabled>` changes DOM nesting inside the `onBlur` wrapper div and the `Popup` content scroll area (`max-h-[70vh] overflow-y-auto`); `min-w-0` class needed per reference. The task doc asks to verify category-card inputs are actually disabled; the code shows native `input`/`button` elements, so the fieldset reaches them, but opacity styling is tied to the explicit `disabled` prop on `Input`, which cards do not pass.
- Existing `ProjectMembersBulkActions.test.tsx` spies on `overrideMemberAllocation` and asserts 2 calls (L146); it targets the code being replaced.
- Partial-failure semantics: toasts derive from `failedUserIds` over `selectedUsers`; a user failed in any category counts once. Result items identify failures by `user_id`, with `budget_id` also present.
- Hard-to-reproduce server per-item failures in browser; correctness rests on unit tests with a mocked store.
- Dependency on unmerged backend branch; the response shape (`code`/`message` optional on failed results, `budgets` typed but ignored) is taken from the task doc, not from code in this repo.
- Speculative: the success toast path for 200-with-all-failed (`budgets: []`) must still go through the "Failed to update budgets" toast and `finishBudgetAction`.
- Speculative: because `Popup` `busy` only blocks `onHide`, any code path that closes the dialog via `visible` (`finishBudgetAction`) is unaffected; double-check Cancel (`onHide`) wiring remains disabled via `disabled={inFlight}`.

---

## 7. Summary for Complexity Assessment

The change touches four source files in three layers: a types addition (`projectBudget.ts`), a new method in the valtio store (`projectBudgets.ts`, modeled on `overrideMemberAllocation`), a rewrite of one `onSubmit` handler in `ProjectMembersBulkActions.tsx` (loop to one awaited call plus failed-user derivation, toasts unchanged), and a busy lock in `BulkBudgetOverrideModal.tsx` copied from the established `UnifiedProjectBudgetModal` pattern (`useInFlightGuard`, `Popup busy`, `isLoading` on Save, `fieldset disabled`). All building blocks already exist on this branch; no new dependencies, config, or routing.

Technical novelty is low: the store style, hook, and Popup busy behavior have direct in-repo precedents. The main care points are preserving toast text and ordering, sending items in the same order as the current loop, treating a rejected request as all-users-failed, and ensuring the fieldset actually disables the category-card inputs and revert buttons.

Test posture is moderate: component tests exist for both the actions wrapper and the modal, and a close busy-test precedent exists, but the wrapper test targets the per-user method being replaced, there is no store test file, and failure-toast branches and busy behavior are untested. Backend contract comes from an external branch, so FE behavior against real per-item failures is verified mainly through mocks.

---

## 8. External References

Named by the task: `docs/superpowers/tasks/2026-10-26-bulk-budget-override-batch/sdlc-standard-prompt.md` — resolved, read in full. Jira EPMCDME-16071 URL was not fetched (external; the prompt doc is declared the requirements source). Backend files on the `codemie` repo branch `EPMCDME-16071_bulk-member-budget-override-batch` (`project_budget.py`, `project_budget_router.py`, `spec.md`) are not in this repository and were not read; facts below are from the prompt doc.

Facts:
- Endpoint: `POST v1/admin/project-budgets/member-overrides/bulk`. Request `{ items: [{ budget_id, user_id, allocated_max_budget, allocated_soft_budget, override_reason? }] }`, 1-1000 items. Response 200: `{ results: [{ budget_id, user_id, status: "ok" | "failed", code?, message? }], budgets: ProjectBudget[] }`; results same order as input; `code`/`message` only on failed (type optional); `budgets` = ProjectBudget for each budget with at least one ok item, `[]` when all fail.
- Per-item failures (HTTP 200): invalid amounts 400, unknown member 404, unknown budget 404, project limit per category on final state (all items of that category fail 400). Repeated user resolves to later item.
- Whole-request failures (nothing saved, go through the request-fails path): 403, 400 (concurrent change), 422, 500.
- Types go in `src/types/entity/projectBudget.ts` next to `MemberAllocationOverridePayload` (:75); store method e.g. `bulkOverrideMemberAllocations(items)` next to `overrideMemberAllocation` (:231), `api.post(..., { skipErrorHandling: true })`, set/reset `loading`/`error`, no toaster, rethrow, return parsed response. Keep `overrideMemberAllocation`.
- Handler: map `updates` to items in same order spreading `payload` as is (do not change how the modal builds payloads; `override_reason` only when edited); one `await`; `failedUserIds` = user IDs with `status === "failed"`; request failure => every user in `updates` failed; keep three toasts exactly; always call `finishBudgetAction()`; remove sequential-loop comment and eslint disable; send nothing when `updates` is empty (modal already blocks this); ignore `budgets` (keep existing refresh).
- Busy lock: replace `isSubmitting` with `useInFlightGuard`; in `handleSubmit` `if (!tryBegin()) return` after the existing `isDirty`/`hasInvalidPendingCategory` check; `end()` in `finally`; `busy={inFlight}` on `Popup`; Save Override `isLoading={inFlight}` with `disabled={!isDirty || hasInvalidPendingCategory}` (no `inFlight`); Cancel and Reset budget usage `disabled={inFlight}`; wrap body in `<fieldset disabled={inFlight} className="m-0 min-w-0 border-0 p-0">`, verify category-card inputs are disabled, pass flag down if not; no `busyHint`.
- Must not change: toast texts/counts, refresh once and selection cleared and popup closed (including partial/all failure), single-user dialog and store method.
- Verification: `.ai-run/guides/testing/local-verification.md`; `localhost:5173/settings/administration/projects/epm-sdai-runway-2026-09/members`, 5 users x 3 categories, one network request; record save time before/after.
- Git: new branch from `EPMCDME-14996_lock-budget-dialog` per `.ai-run/guides/standards/git-workflow.md` (ticket EPMCDME-16071); do not push or open an MR without asking.
