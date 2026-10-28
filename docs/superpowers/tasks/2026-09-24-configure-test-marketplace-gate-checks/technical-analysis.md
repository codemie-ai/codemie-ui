# Technical Analysis — Configure & Test Marketplace Gate Checks

## Codebase Findings

### The gap

`ChatConfigAssistantForm` (`src/pages/chat/components/ChatConfiguration/ChatConfigAssistants/ChatConfigAssistantForm.tsx`) is the only component that wires the Configure & Test panel in the chat sidebar. Its `handleSubmit` calls `updateAssistant` directly — no gate checks, no revalidation warning, no `PublishGateFindingsModal`.

### Gate-check implementation in EditAssistantPage

`src/pages/assistants/EditAssistantPage.tsx` owns the full flow:
- `handleSaveClick` checks `isMarketplaceManagementEnabled()` and `marketplace_status ∈ {DRAFT, PENDING_REVIEW, APPROVED}`; if true, shows a `ConfirmationModal` ("Revalidation warning").
- On confirm → `handleRevalidationConfirm` → `assistantsStore.checkMarketplaceGates(id, formValues, categories)`.
- Gate pass → calls `formRef.current?.submit()` → `handleSubmit` → `updateAssistant` → `handleSuccess` → `publishAssistantToMarketplace`.
- Gate fail → `setGateError(result.error)` → `PublishGateFindingsModal` shown.
- `handleGateSaveAndUnpublish` → saves + unpublishes if user accepts.
- `handleGateForcePublish` (admin only) → bypasses findings.
- `getCategoryIds` helper (file-local) extracts string IDs from category objects.

### AssistantFormRef API

`src/pages/assistants/components/AssistantForm/AssistantForm.tsx` exports:
```ts
interface AssistantFormRef {
  submit: () => void
  getValues: () => AssistantFormSchema
  handleRefineWithAI: () => void
  unblockTransition: () => void
}
```
In `isChatConfig` mode the Save button in AssistantForm calls `handleFormSubmit` internally, which calls `handleMissingIntegrationsSubmit(values)` → `onSubmit` prop. The `onSubmit` prop is `ChatConfigAssistantForm.handleSubmit`.

### Where to add the gate check

The gate check must run in `ChatConfigAssistantForm.handleSubmit` (the `onSubmit` prop) because that is the single exit point for all saves from this panel. The flow:

1. On `handleSubmit` call, check `isMarketplaceManagementEnabled()` and `selectedAssistant.marketplace_status`.
2. If marketplace-listed: show revalidation `ConfirmationModal` (same wording as edit page).
3. On confirm: run `assistantsStore.checkMarketplaceGates(id, values, categories)`.
4. On gate pass: call `updateAssistant` → `handleSuccess`.
5. On gate fail: store `values` in a ref, show `PublishGateFindingsModal`.
6. `onSendForReview` (Save & Unpublish / remove from queue): save + `unpublishAssistantFromMarketplace` → `handleSuccess`.
7. `onHide` / `onUnpublishAndEdit`: clear modal, let user keep editing.

### Feature flag

`isMarketplaceManagementEnabled` is in `src/utils/featureFlags.ts:111`. All gate-check paths must be guarded by it.

### Categories

`getCategoryIds` in `EditAssistantPage` is a file-local helper. It must be duplicated or extracted to a shared util. Current location: `EditAssistantPage.tsx:43`. Since it is small (4 lines) and the only consumer is the gate-check path, duplicating it inline in `ChatConfigAssistantForm` is acceptable; extracting it to a shared util is cleaner.

### `PublishGateFindingsModal` props needed

```ts
visible, assistant, error, onHide, onSendForReview, sendForReviewLabel,
descriptionText, marketplaceStatus, onUnpublishAndEdit, isSendingForReview
```
`onForcePublish` is admin-only; the chat panel does not have an admin context — omit it or pass `undefined`.

### No publish-to-marketplace step

The Configure & Test panel does NOT re-publish after save (unlike `EditAssistantPage.handleSuccess` which calls `publishAssistantToMarketplace`). After a clean gate pass, save is sufficient — the assistant stays in its current marketplace queue.

### Risk Indicators

- The `handleSubmit` in `ChatConfigAssistantForm` is async. Gate check introduces additional async steps that must not race with form state.
- `PublishGateFindingsModal` import adds a dependency on the `assistants/AssistantActions/components` subtree from the `chat/` page tree — acceptable given both are under `src/pages/`.
- `ConfirmationModal` is already used widely; no risk.
- No backend changes needed — `checkMarketplaceGates` and `unpublishAssistantFromMarketplace` already exist in the store.
