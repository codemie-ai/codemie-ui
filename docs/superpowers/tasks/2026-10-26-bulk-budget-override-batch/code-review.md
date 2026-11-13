---
schema: sdlc-factory/code-review@1
decision: approve
reviewed_head: 2311d58b72f6b685d782682d8c1f4fa6bcc39215
---

# Code review — 2026-10-26-bulk-budget-override-batch

**Decision:** approve (final round, confidence high)  
**Reviewed head:** `2311d58` · **Rounds:** final

Edge-case and acceptance lenses plus standards ran; all story/spec criteria pass (AC7 pending-stage-7). 1 deferred (empty-updates success toast, pre-existing behavior; see code-review-deferred.local.md), 3 filtered as noise (malformed/omitted response results and onSubmit rejection are covered by the typed contract and the catch in finishBudgetAction).

## Open — 0

## Pre-existing (not blocking) — 1

- **Success toast shown when no request is sent** — `src/pages/settings/administration/components/projectsManagement/ProjectMembersBulkActions.tsx:223-245` — when a dirty category has no matching budget, `updates` is empty, nothing is sent, yet the "Updated budget overrides for N user(s) successfully" toast is shown. Pre-existing: the previous sequential loop produced the same toast for empty updates, and the spec requires "empty updates sends nothing" with toasts unchanged.

## Coverage

| Acceptance criterion | Status | Notes |
|---|---|---|
| Scope 1: Types for request item, result item and response | pass | Types added next to MemberAllocationOverridePayload; code/message optional; budgets typed |
| Scope 2: Store bulkOverrideMemberAllocations beside overrideMemberAllocation | pass | Posts bulk endpoint with skipErrorHandling, loading/error handled, rethrows, no toaster |
| Scope 3: Handler uses single batch request, failedUserIds from status failed | pass | Toasts unchanged; finishBudgetAction always called; loop and eslint-disable removed |
| Scope 4a: useInFlightGuard replaces isSubmitting | pass | tryBegin before try, end in finally |
| Scope 4b: Popup busy={inFlight} | pass | Matches spec |
| Scope 4c: Save loading; Cancel and Reset disabled while in flight | pass | Footer buttons match spec |
| Scope 4d: Body wrapped in disabled fieldset | pass | Inputs and revert buttons disabled; asserted by test |
| Scope 4e: No busyHint | pass | Not passed to Popup |
| Scope 5a: ProjectMembersBulkActions tests for new store method | pass | all-ok, partial, all-failed, dedupe, rejection, empty updates covered |
| Scope 5b: Modal busy-lock tests | pass | Double submit, locked controls, Escape ignored, re-enable after settle |
| Scope 5c: Store test for new method | pass | Success, rejection, loading reset, error, no toast |
| Non-goals respected | pass | Only listed files touched; response budgets unused |
| AC1: N users x M categories issues exactly one POST, order preserved | pass | Single call, ordered map, payload unchanged |
| AC2: Success, partial, all-failed, rejected toasts | pass | Branches unchanged; Set-based dedupe; tested |
| AC3: finishBudgetAction runs once in every case | pass | Awaited unconditionally; tests assert once incl. rejection |
| AC4: Same-tick second submit sends no second request | pass | Ref-backed tryBegin guard; tested |
| AC5: While saving dismissal blocked and controls locked | pass | Popup busy, disabled buttons, fieldset |
| AC6: Dialog interactive again after save settles | pass | end() in finally; tested |
| AC7: Type-check, lint and tests pass | pending-stage-7 | Code and tests present; run results owned by Stage 7 |

Standards: commit-format pass · code-quality na · security pass
