# Technical Analysis — EPMCDME-14999: Approval Flow Functionality Update

**Task**: Marketplace approval-flow frontend improvements (AC#1–AC#6)
**Generated**: 2026-09-18
**Research path**: consolidated from three per-point analyses + branch diff

---

## 1. Original Context

EPMCDME-14999 adds six acceptance criteria to improve the marketplace approval flow in the CodeMie UI:

- **AC#1** — When a non-admin user publishes an assistant that enters the pending-review queue, show a `SubmittedForReviewModal` (instead of a transient toast) and update the status badge without a page reload.
- **AC#2** — When a user attempts to save an edit to an `APPROVED` or `PENDING_REVIEW` assistant, intercept with a revalidation-warning modal before the API call.
- **AC#3** — When a live (`APPROVED`) assistant's edit fails the publish gate (422), offer two explicit choices: "Send for manual review" or "Unpublish and keep editing".
- **AC#4** — Gate the "Skip Validation & Save" (formerly "Force-Publish") button in `MissingIntegrationsModal` to admin users only.
- **AC#5** — In the admin Marketplace Management area, rename the tab to "Pending Assistants", remove the status filter, and always load PENDING records.
- **AC#6** — Gate the AC#1–3 behaviors behind the `isMarketplaceManagementEnabled` feature flag so they are inactive in environments where the flag is off.

All changes are frontend-only. No backend API changes.

---

## 2. Codebase Findings

### Key Files

| File | Relevance |
|---|---|
| `src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx` | Orchestrates the full publish flow; manages `gateError`, `showQualityValidationModal`, `showPendingReviewConfirm` state; calls `assistantsStore.publishAssistantToMarketplace` |
| `src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx` | Shown on 422 gate failure; footer: Cancel + Edit assistant + Force-Publish (admin); receives new `onSendForReview` / `onUnpublishAndEdit` optional props for AC#3 |
| `src/pages/assistants/AssistantActions/components/SubmittedForReviewModal.tsx` | Informational Popup with single "Got it" button; already wired in `PublishToMarketplaceModal` |
| `src/pages/assistants/AssistantActions/components/QualityValidationModal.tsx` | Advisory quality path (separate from deterministic gate path) |
| `src/pages/assistants/AssistantActions/AssistantActions.tsx` | Renders `PublishToMarketplaceModal`; passes `onSuccess` that calls `reloadAssistants?.()` and `loadAssistant?.()` |
| `src/pages/assistants/EditAssistantPage.tsx` | Edit page; owns `handleSubmit(values, skipValidation)`; reads `assistant?.marketplace_status` at line 75; intercept point for AC#2 |
| `src/pages/assistants/components/AssistantForm/AssistantForm.tsx` | Renders single-page edit form; exposes `submit` via `AssistantFormRef`; `handleFormSubmit` calls `useMissingIntegrationsModal` |
| `src/pages/assistants/hooks/useMissingIntegrationsModal.ts` | Pre-save interception hook; may call `onSubmit` (= `handleSubmit`) more than once after integration resolution |
| `src/pages/assistants/AssistantActions/components/MissingIntegrationsModal.tsx` | Shows when required integrations are missing; "Skip Validation & Save" (formerly "Force-Publish") button gated behind admin check for AC#4 |
| `src/pages/settings/administration/MarketplaceManagement/` | Admin marketplace management area; tab renamed and status filter removed for AC#5 |
| `src/components/ConfirmationModal/ConfirmationModal.tsx` | Reusable two-button modal; used for AC#2 revalidation warning |
| `src/components/Popup/Popup.tsx` | Base modal; accepts `visible`, `onHide`, `header`, `footerContent` |
| `src/store/assistants.ts` | `publishAssistantToMarketplace` (line 587); `updateAssistant` (line 831); `unpublishAssistantFromMarketplace` |
| `src/utils/featureFlags.ts` | `isMarketplaceManagementEnabled()` (line 111) — reads `FEATURE_FLAGS.MARKETPLACE_MANAGEMENT` from `window._env_`; non-reactive |
| `src/store/user.ts` | `userStore`; `user.isAdmin`, `user.isMaintainer` flags |

### Status Values

`assistant.marketplace_status` values relevant to this ticket:
- `'APPROVED'` — live, publicly visible
- `'PENDING_REVIEW'` — submitted, awaiting admin decision
- `'REJECTED'` — declined
- `null` / draft — not submitted

### Architecture: Publish Flow Layers

```
AssistantActions
  └─ PublishToMarketplaceModal            ← orchestrator; manages all state
       ├─ QualityValidationModal          ← advisory path (non-blocking)
       ├─ PublishGateFindingsModal        ← deterministic gate failure path (AC#3)
       └─ SubmittedForReviewModal         ← pending-review confirmation (AC#1)
```

### Architecture: Edit Flow Layers

```
EditAssistantPage.handleSubmit
  └─ [NEW] revalidation warning guard (AC#2)
       └─ useMissingIntegrationsModal.handleSubmit
            └─ assistantsStore.updateAssistant
```

---

## 3. Risk Indicators

- **`handleSubmit` called multiple times**: `useMissingIntegrationsModal` may call `handleSubmit` a second time after the user resolves missing integrations. The AC#2 guard must use a `useRef` confirmed flag to fire only on the first invocation per save sequence.
- **`onHide` on `PublishGateFindingsModal` closes the whole publish flow**: The existing `onHide` calls both `setGateError(null)` and `onClose()`. The "Unpublish and keep editing" callback (AC#3) must clear `gateError` without calling `onClose()` so the edit session remains open.
- **`performPublish` backend contract for AC#3 "Send for review"**: Calling `publishAssistantToMarketplace` without `forcePublish=true` for a live assistant that fails gates must return `PENDING_REVIEW` (not another 422) for the "Send for review" path to work. The task is scoped as frontend-only, implying this contract is guaranteed by the backend.
- **No test coverage for `PublishToMarketplaceModal`, `PublishGateFindingsModal`, or the edit-page revalidation guard** — all affected files had zero or minimal tests before this work.
- **Feature flag gating (AC#6)**: `isMarketplaceManagementEnabled()` is non-reactive (reads `window._env_` directly). It must be called at render time within components, not stored in state.

---

## 4. Testing Landscape

- `src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx` — integration tests for edit page; natural home for AC#2 tests.
- `src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx` — accessibility tests; not the right file for functional tests.
- `src/pages/settings/administration/__tests__/MarketplaceQueuePages.test.tsx` — admin queue pages; relevant for AC#5.
- No test files existed for `PublishToMarketplaceModal`, `PublishGateFindingsModal`, or `MissingIntegrationsModal` before this work.

---

## 5. Summary

The change surface is entirely within the UI/presentation and page layers. No store methods, API endpoints, or type definitions are added or changed. The six ACs cluster into three areas:

1. **Publish flow modals** (AC#1, AC#3): `PublishToMarketplaceModal` + `PublishGateFindingsModal`
2. **Edit page save guard** (AC#2): `EditAssistantPage`
3. **Admin plumbing** (AC#4, AC#5, AC#6): `MissingIntegrationsModal`, `MarketplaceManagement` tab, feature-flag gating across AC#1–3
