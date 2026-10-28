# Technical Research

**Task**: marketplace publish modal assistant validation approval
**Generated**: 2026-09-23
**Research path**: filesystem (codegraph MCP not available in this environment)

---

## 1. Original Context

The marketplace publish flow shows a modal when assistant quality validation fails (or when an assistant is already in marketplace / pending queue). Two UX issues to fix:

1) Modal title should be renamed to something clearer like "Verification Failed" / "Verification Not Passed", or match the existing pattern "Assistant Quality Validation Failed" that appears on another modal in the app.
2) The modal is confusing because users do not understand why they are seeing it. The modal should highlight/indicate when the assistant is already in the marketplace or currently in the pending approval queue.

Locate: (a) the marketplace publish modal component(s), (b) the "Assistant Quality Validation Failed" modal to reference its title pattern, (c) the state/logic that decides which modal opens (validation failure vs. already-in-marketplace vs. pending-queue), (d) i18n / string constants where the current title lives, (e) how "already in marketplace" and "pending queue" statuses are represented in the store/API.

Recent commits on branch EPMCDME-14999 relevant to this area: "Fix marketplace publish modal UX issues", "Fix async error handling in EditAssistantPage approval flow", "Approval flow functionality update".

---

## 2. Codebase Findings

### Existing Implementations

Assistant marketplace publish/approval flow lives under `src/pages/assistants/AssistantActions/components/`:

- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx` — parent orchestrator. Runs pre-publish validation via `assistantsStore.validatePublishToMarketplace`, renders the "Publish to Marketplace" popup, and dispatches to sub-modals based on the server response.
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx` — the modal at the center of this task. Header defaults to `"This assistant can't be published yet"` (line 123). Also owns Force-Publish flow (admins) and the live-edit two-action footer (`Keep editing` + `Send for manual review` / `Save & Unpublish` / `Save and remove from Pending`).
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/AssistantActions/components/QualityValidationModal.tsx` — the *other* modal, whose header (`"Assistant Quality Validation Failed"`, line 96) is the reference title pattern the ticket cites. This one is advisory (LLM verdict); admins may "Publish Anyway".
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/AssistantActions/components/SubmittedForReviewModal.tsx` — success confirmation ("Sent for review") after PENDING_REVIEW response.
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/AssistantActions/components/QualityValidationSummary.tsx` — shared recommendations renderer used by both quality/gate modals.
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/AssistantActions/components/ActionConfirmationModal.tsx` — generic confirmation used inside publish flow (auto-populate categories, revalidation warning).
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/AssistantActions/AssistantActions.tsx` — hosts `<PublishToMarketplaceModal>` from the assistant details/actions surface.
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/EditAssistantPage.tsx` — the *other* invocation site of `PublishGateFindingsModal` (lines 372–394). It wires `onSendForReview`, `onUnpublishAndEdit`, `onForcePublish`, and passes `sendForReviewLabel` / `headerText` / `descriptionText` overrides tailored to the `PENDING_REVIEW` case.

### Architecture and Layers Affected

- **UI layer** — `src/pages/assistants/AssistantActions/components/` (modal components) and `src/pages/assistants/EditAssistantPage.tsx` (edit-flow modal host).
- **Store layer (Valtio)** — `src/store/assistants.ts` — exposes `validatePublishToMarketplace`, `publishAssistantToMarketplace`, `unpublishAssistantFromMarketplace`, `checkMarketplaceGates`, `updateAssistant`, `getAssistant`.
- **Types / API contract** — `src/types/entity/assistant.ts` (`Assistant.marketplace_status?: string | null` at lines 87 and 168; `QualityValidation`, `PublishValidationResponse`, `SubAssistantPublishSettings`, `SubAssistantInfo`).
- **Feature flag** — `isMarketplaceManagementEnabled()` from `@/utils/featureFlags` — gates the `PENDING_REVIEW` handling path.

### Integration Points

Server-side error contract (documented inline in `PublishGateFindingsModal.tsx` lines 34–56):
- HTTP 422 with `error.details.gate_findings` and/or `error.details.failed_rules` → CRITICAL deterministic gate failure → `PublishGateFindingsModal`.
- HTTP 422 with `error.details.quality_validation` → advisory LLM verdict → `QualityValidationModal`.
- Successful publish response includes `marketplace_status` (uppercase strings). If `PENDING_REVIEW` and the marketplace-management flag is on → `SubmittedForReviewModal`.

`marketplace_status` is compared as literal uppercase strings: `'APPROVED'`, `'PENDING_REVIEW'`. There is no enum type — these are stringly typed throughout `PublishToMarketplaceModal.tsx` (lines 205, 457–466), `EditAssistantPage.tsx` (lines 101, 104, 155, 170, 173, 236, 370), and inside the modal-dispatch decisions.

### Patterns and Conventions

- Modals use a shared `Popup` component (`@/components/Popup`) with `header` prop and a `footerContent` render slot. Titles are plain string literals passed inline; **there is no i18n file** — strings are inlined at the JSX call site.
- Modals are controlled by boolean state in the parent (`showQualityValidationModal`, `gateError != null`, `showPendingReviewConfirm`) — the parent orchestrates which is visible via mutually exclusive `visible=` predicates.
- The gate-findings modal already supports contextual overrides via `headerText` / `descriptionText` / `sendForReviewLabel` props (see `PublishGateFindingsModalProps`, lines 68–90). `EditAssistantPage` uses these to swap the header to "This assistant can't be added to the Marketplace yet" when `marketplace_status === 'PENDING_REVIEW'`. `PublishToMarketplaceModal` currently does **not** pass any header/description overrides — it inherits the default `"This assistant can't be published yet"` regardless of whether the assistant is already APPROVED or PENDING_REVIEW.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/yevhen_slyva/codemie-dev/codemie-ui/docs/superpowers/tasks/2026-09-17-epmcdme-14999-approval-flow-functionality-update/spec.md` and `technical-analysis.md` — prior EPMCDME-14999 spec that introduced this modal set. Includes the approval flow design.
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/docs/codemie/be-contract-marketplace-gate-dry-run.md` — backend contract for the marketplace gate dry-run endpoint (`checkMarketplaceGates`).
- `.ai-run/guides/components/component-patterns.md` and `.ai-run/guides/patterns/modal-patterns.md` — general modal conventions (not read in full, but referenced by AGENTS.md routing table).

### Architectural Decisions

Recorded inline as jsdoc in `PublishGateFindingsModal.tsx` (lines 96–110): the deterministic gate modal is deliberately a distinct component from `QualityValidationModal`. The former is a hard 422 (no admin "Publish Anyway"); the latter is an advisory LLM verdict (admins may override). This distinction is load-bearing — do not consolidate them.

### Derived Conventions

- String literals are inlined at JSX call sites, not centralized. Renaming a modal title is a single-file edit at the `<Popup header=...>` prop.
- Contextual title/description variation is achieved via optional props with defaults, not via a lookup table.

---

## 4. Testing Landscape

### Existing Coverage

- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx` — updated in the "Fix async error handling" commit; exercises the gate modal + PENDING_REVIEW flow from the edit page.
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx` — exercises the publish flow from the new-assistant path.
- `/Users/yevhen_slyva/codemie-dev/codemie-ui/src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx` — assistant details surface that hosts `<AssistantActions>` (indirectly exercises `PublishToMarketplaceModal`).
- Tests under `src/pages/assistants/AssistantActions/components/__tests__/` cover the modal behaviors.

### Testing Framework and Patterns

Vitest + React Testing Library, `unit` and `integration` projects declared in `vitest.workspace.ts`. Tests likely assert on header text via `screen.getByText(/This assistant can't be published yet/i)` or `getByRole('heading')` — a title-string change WILL break existing assertions and those tests must be updated in the same commit.

### Coverage Gaps

- No test currently asserts the modal appears with a specific title depending on `assistant.marketplace_status` in the `PublishToMarketplaceModal` (details page) flow — the parametrised header path exists only in `EditAssistantPage.tsx`. Adding APPROVED-vs-PENDING_REVIEW branching in the details-page flow would need new test cases.

---

## 5. Configuration and Environment

### Environment Variables

None directly relevant. The flow is controlled by a runtime feature flag (`isMarketplaceManagementEnabled()`), read from `window._env_` via `@/utils/featureFlags`.

### Configuration Files

`vite.config.ts` is modified locally (unrelated to this task, per `git status`).

### Feature Flags and Deployment Concerns

- `isMarketplaceManagementEnabled()` gates the PENDING_REVIEW handling. When off, the pending-review branch is bypassed and the SubmittedForReviewModal never shows. Any new "already in marketplace" indicator that depends on `marketplace_status === 'PENDING_REVIEW'` should behave sensibly when the flag is off (the status still comes back from the API — the flag governs routing, not the field itself).

---

## 6. Risk Indicators

- **Title change ripples into tests** — integration tests under `src/pages/assistants/__tests__/` and `src/pages/assistants/AssistantActions/components/__tests__/` almost certainly match on the current header text. Any rename must update those assertions in the same MR.
- **Two modals with overlapping semantics** — `PublishGateFindingsModal` (deterministic hard gate) vs. `QualityValidationModal` (advisory LLM). The jsdoc at lines 96–110 of `PublishGateFindingsModal.tsx` explicitly warns not to conflate them. If the ticket asks to align titles across both, take care not to imply admins can "Publish Anyway" on the gate modal (the server refuses).
- **Stringly-typed `marketplace_status`** — no enum; typos in status literals will silently fail the branch check. Prefer a shared const or type union if adding new branches.
- **Two invocation sites, divergent props** — `EditAssistantPage.tsx` already passes contextual `headerText`/`descriptionText`/`sendForReviewLabel` for the PENDING_REVIEW case. `PublishToMarketplaceModal.tsx` does not (it renders `PublishGateFindingsModal` with only `onSendForReview`/`onUnpublishAndEdit` conditional on status but no header/description override). Fix (2) likely requires symmetry: also pass contextual overrides from `PublishToMarketplaceModal` when `assistant.marketplace_status === 'APPROVED' || 'PENDING_REVIEW'`.
- **No i18n layer** — strings inline. Fine for this task but no central place to enforce naming consistency across the app.
- **Header text "publishing" during in-flight state** — `QualityValidationModal.tsx` line 96 swaps header to `'Publishing to Marketplace'` while publishing. Any new dynamic-header logic must preserve or mirror this behaviour.
- **Force-Publish path** — the gate modal shows Force-Publish (admin/maintainer) below Edit. Renaming the header must not obscure that Force-Publish is still a distinct escape hatch from the (unavailable) "Publish Anyway".

---

## 7. Summary for Complexity Assessment

This is a **narrowly scoped UX polish** confined to the assistant-marketplace publish flow: two modal components (`PublishGateFindingsModal.tsx`, `QualityValidationModal.tsx`), one orchestrator (`PublishToMarketplaceModal.tsx`), and one host page (`EditAssistantPage.tsx`) — all under `src/pages/assistants/`. Expected file surface: 2–4 source files plus 2–4 test files. No store, API contract, or type changes are required — `Assistant.marketplace_status` already carries the `APPROVED` / `PENDING_REVIEW` signal the UI needs to branch on, and `PublishGateFindingsModal` already accepts `headerText`/`descriptionText` overrides used by one call site.

Technical novelty is low: the pattern for contextual header/description overrides already exists (see `EditAssistantPage.tsx` lines 384–391). The fix likely mirrors that pattern into `PublishToMarketplaceModal.tsx` and either renames the default header of `PublishGateFindingsModal` (single string edit at line 123) or introduces two/three variants keyed off `marketplace_status`. The "already in marketplace / pending queue" indicator can be a small banner inside the modal body, following the existing `bg-failed-secondary/10` styling used for findings rows.

Primary risks are (a) test churn — the integration tests almost certainly match the current header text and will break on rename; (b) avoiding conflation of the two distinct modals (deterministic gate vs. advisory quality) whose jsdoc explicitly warns against merging their affordances; (c) ensuring the branching remains sensible when `isMarketplaceManagementEnabled()` is off. Test coverage of the affected files is present but not exhaustive at the "which title shows for which status" level; new assertions should be added alongside the change. Overall complexity: **low** (a targeted UX/copy change on top of pre-existing contextual-override plumbing).
