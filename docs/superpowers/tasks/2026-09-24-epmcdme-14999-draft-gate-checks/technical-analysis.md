# Technical Research

**Task**: marketplace gate-check publish draft assistant status
**Generated**: 2026-09-24T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Currently we do not run gate-check/publish/etc for assistants which are already in marketplace with a DRAFT status. The goal is to also run all gate checks with a similar flow which we have for VERIFIED/PENDING assistants — i.e., when an assistant has DRAFT marketplace status, the same gate-check modal and gating logic should apply as for VERIFIED/PENDING assistants.

---

## 2. Codebase Findings

### Existing Implementations

- `/src/types/generated/marketplaceManagement.ts` — Generated type file defining `MarketplaceStatus` as `'DRAFT' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN'`
- `/src/types/entity/assistant.ts` — Assistant entity type; `marketplace_status?: string | null`
- `/src/store/assistants.ts` — Store methods: `checkMarketplaceGates` (POST gate-check endpoint), `publishAssistantToMarketplace`, `validatePublishToMarketplace`, `unpublishAssistantFromMarketplace`
- `/src/pages/assistants/EditAssistantPage.tsx` — Pre-save gate-check guard; contains the `handleSaveClick` condition that is the **primary exclusion point for DRAFT**
- `/src/pages/assistants/AssistantActions/AssistantActions.tsx` — Publish/unpublish/remove action items; controls publish button visibility per status
- `/src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx` — Orchestrates the publish flow; routes gate errors to `PublishGateFindingsModal` or `QualityValidationModal`
- `/src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx` — Gate findings modal; shows different footer actions based on `marketplace_status`
- `/src/pages/assistants/AssistantActions/components/QualityValidationModal.tsx` — Advisory LLM quality check modal (separate from hard gate rules)
- `/src/pages/assistants/AssistantActions/components/SubmittedForReviewModal.tsx` — Shown after `PENDING_REVIEW` publish result

### Architecture and Layers Affected

- **Page/UI layer**: `EditAssistantPage.tsx` — contains the save-flow gate-check guard; `AssistantActions.tsx` — controls action menu items
- **Modal/Component layer**: `PublishGateFindingsModal.tsx` — gate display; `PublishToMarketplaceModal.tsx` — publish orchestrator
- **Store/API layer**: `assistants.ts` store — `checkMarketplaceGates`, `publishAssistantToMarketplace`

### Integration Points

- Backend API endpoint: `POST v1/assistants/{id}/marketplace/publish/gate-check` (called by `checkMarketplaceGates`)
- Backend API endpoint: `POST v1/assistants/{id}/marketplace/publish` (called by `publishAssistantToMarketplace`)
- `isMarketplaceManagementEnabled()` feature flag function — gates the entire revalidation-on-save flow

### Patterns and Conventions

- Status checks use string literals against `marketplace_status` (e.g., `status === 'APPROVED' || status === 'PENDING_REVIEW'`), not a shared enum constant
- Gate errors are typed as `PublishGateError`; the modal receives `gateError` via state
- Conditional callbacks (`onSendForReview`, `onUnpublishAndEdit`) in `PublishGateFindingsModal` are `undefined` for non-live statuses, which controls which footer buttons render

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` exists per AGENTS.md index
- `.ai-run/guides/components/component-patterns.md` and `.ai-run/guides/patterns/state-management.md` are relevant for modal and store patterns

### Architectural Decisions

No ADRs or inline DECISION markers were found specifically for the gate-check flow. The pattern of using string comparisons against `marketplace_status` literals is consistent throughout the affected files.

### Derived Conventions

- Feature flag `isMarketplaceManagementEnabled()` wraps all marketplace management paths — any DRAFT inclusion must also be wrapped in this flag or be unconditional
- Modal footer behavior is determined by passing `undefined` vs. a function for optional callbacks — this is the established pattern for varying modal actions by status
- Status banner text in `PublishGateFindingsModal` is keyed to specific status strings — a new DRAFT-specific message would follow the same conditional pattern

---

## 4. Testing Landscape

### Existing Coverage

- `/src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx` — tests for the gate findings modal

### Testing Framework and Patterns

- Vitest with React Testing Library (two workspaces: `unit` and `integration`)
- Test files co-located in `__tests__/` subdirectories

### Coverage Gaps

- `EditAssistantPage.tsx` gate-check guard (`handleSaveClick` condition) does not appear to have dedicated tests for the DRAFT exclusion path — adding DRAFT to the condition will need test coverage
- `AssistantActions.tsx` publish button visibility logic for DRAFT status change has no confirmed test file
- `PublishGateFindingsModal` has tests but they likely do not cover a DRAFT-specific footer variant if one is introduced

---

## 5. Configuration and Environment

### Environment Variables

- `isMarketplaceManagementEnabled()` — runtime feature flag (likely reads from `window._env_` or `import.meta.env.VITE_*`); all revalidation-on-save paths are gated behind it

### Configuration Files

No additional configuration files specific to gate-check behavior were identified.

### Feature Flags and Deployment Concerns

- `isMarketplaceManagementEnabled()` must remain `true` for the DRAFT gate-check path to be exercised — no additional flag needed if the change is behind this same guard

---

## 6. Risk Indicators

- **Primary exclusion is a two-place string literal condition**: `EditAssistantPage.tsx` `handleSaveClick` at ~line 170 checks `status === 'APPROVED' || status === 'PENDING_REVIEW'` — adding `|| status === 'DRAFT'` is the minimal code change, but the downstream `handleRevalidationConfirm` flow (gate-check → auto-republish on pass) may not be correct for DRAFT, since a DRAFT assistant should not auto-republish after save
- **PublishGateFindingsModal footer actions for DRAFT are unspecified**: The modal renders "Send for Review" and "Unpublish/Remove from queue" only for APPROVED/PENDING_REVIEW. For DRAFT the correct actions are unclear — does a DRAFT assistant need a "Save & withdraw DRAFT" button, or just "Edit assistant"? This is a requirements gap.
- **`handleRevalidationConfirm` republishes on gate pass**: After `checkMarketplaceGates` passes, `handleSuccess` calls `publishAssistantToMarketplace` to re-queue. For DRAFT, this would promote the assistant out of DRAFT into PENDING_REVIEW or APPROVED — which may or may not be the intended behavior.
- **Status banner copy for DRAFT is not defined**: `PublishGateFindingsModal` has specific banner text for APPROVED and PENDING_REVIEW; a DRAFT-specific message will need to be authored.
- **String literal comparisons scattered across multiple files**: `EditAssistantPage.tsx`, `PublishGateFindingsModal.tsx`, and `AssistantActions.tsx` all contain inline `=== 'APPROVED'` / `=== 'PENDING_REVIEW'` checks. There is no shared constant or type-narrowing helper, so all three files must be updated consistently.
- **No test coverage confirmed for the save-guard branch in `EditAssistantPage.tsx`** — the new DRAFT branch will need unit tests.
- **`isMarketplaceManagementEnabled()` gating**: If the feature flag is `false`, the DRAFT gate-check path will be silently skipped just like APPROVED/PENDING_REVIEW — confirm this is acceptable behavior.

---

## 7. Summary for Complexity Assessment

The task requires extending the pre-save gate-check flow in `EditAssistantPage.tsx` (currently guarded by `status === 'APPROVED' || status === 'PENDING_REVIEW'`) to also fire for `status === 'DRAFT'`. This touches three architectural layers: the page/save-flow layer (`EditAssistantPage.tsx`), the modal/component layer (`PublishGateFindingsModal.tsx` for footer actions and status banner), and potentially the action menu layer (`AssistantActions.tsx` if the publish-button visibility logic also needs adjustment). The code change surface is narrow — approximately 3–5 files — but each requires careful conditional logic additions rather than new abstractions.

The primary technical novelty is that the post-gate-check `handleRevalidationConfirm` flow auto-republishes on a pass, which is designed for APPROVED/PENDING_REVIEW assistants. For DRAFT, the correct behavior after a gate pass is ambiguous: should the assistant stay in DRAFT (just save), be promoted to PENDING_REVIEW, or follow the same publish path? This decision significantly affects the implementation scope. If DRAFT should follow the identical flow (gate-check → promote to PENDING_REVIEW on pass), the change is straightforward extension. If DRAFT should gate-check but only save (not promote), a separate `handleDraftRevalidationConfirm` branch is needed.

Test coverage for the affected area is sparse — only `PublishGateFindingsModal` has a confirmed test file. The save-guard condition in `EditAssistantPage` and the action visibility logic in `AssistantActions` are not covered. New tests will be required for the DRAFT branch, and the existing `PublishGateFindingsModal` tests may need DRAFT-scenario cases if the modal footer changes for that status. Overall complexity is low-to-medium: the code changes are localized and the patterns are well-established, but the requirements ambiguity around post-gate-pass behavior for DRAFT and the missing test coverage are meaningful risk factors.
