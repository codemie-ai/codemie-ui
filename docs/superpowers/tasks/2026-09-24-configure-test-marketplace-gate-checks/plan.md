# Plan — Configure & Test Panel Marketplace Gate Checks

## Tasks

### T0 — Fix useMissingIntegrationsModal sentinel handling
Test-first: yes — pass `{ success: false }` from `onSubmit`; assert `onSuccess` is NOT called.

**Changes in `src/pages/assistants/hooks/useMissingIntegrationsModal.ts`:**
- Add `success?: boolean` to `SubmitResponse` interface
- In `handleSubmit`, after the `response.error` guard, add:
  ```ts
  if (response.success === false) {
    return { success: false }
  }
  ```
  This prevents the hook from calling `onSuccess()` when a caller returns the gate-check sentinel.

### T1 — Add statusBannerOverride prop to PublishGateFindingsModal
Test-first: no — prop plumbing, covered by visual inspection.

**Changes in `src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx`:**
- Add `statusBannerOverride?: string | null` to `PublishGateFindingsModalProps`
- Replace `const statusBannerText = getStatusBannerText(normalizedStatus)` with
  `const statusBannerText = statusBannerOverride ?? getStatusBannerText(normalizedStatus)`

### T2 — Add gate-check state and modals to ChatConfigAssistantForm
Test-first: yes — render with DRAFT assistant + FF on, click Save, assert revalidation `ConfirmationModal` appears.

**Changes in `src/pages/chat/components/ChatConfiguration/ChatConfigAssistants/ChatConfigAssistantForm.tsx`:**
- Import `ConfirmationModal`, `Popup`, `Spinner`
- Import `PublishGateFindingsModal` + `PublishGateError` type
- Import `isMarketplaceManagementEnabled`
- Add state: `revalidationVisible`, `isValidating`, `gateError: PublishGateError | null`, `isSavingAndUnpublishing`
- Add refs: `pendingFormValues`, `pendingAssistantId`, `pendingCategories`
- Add helper `getCategoryIds`
- Derive `gateSendForReviewLabel` and `gateDescriptionText` and `gateBannerText` from `selectedAssistant.marketplace_status`

### T3 — Implement gate-check flow in ChatConfigAssistantForm
Test-first: yes — mock `checkMarketplaceGates` to return a gate error; assert `PublishGateFindingsModal` appears after confirming revalidation.

**Changes in `handleSubmit`:**
- If FF off or status not in `{DRAFT, PENDING_REVIEW, APPROVED}` → existing path unchanged
- If FF on and marketplace-listed → store values/id/categories in refs, `setRevalidationVisible(true)`, return `{ success: false }`

**Add `handleRevalidationConfirm`:**
- `setIsValidating(true)` → `checkMarketplaceGates` → gate pass → `updateAssistant` → `handleSuccess`; gate fail → `setGateError`

**Add `handleRevalidationCancel`:**
- `setRevalidationVisible(false)`, clear pending refs

### T4 — Implement Save & Unpublish and Keep Editing in ChatConfigAssistantForm
Test-first: yes — assert "Save and remove" calls `updateAssistant` then `unpublishAssistantFromMarketplace` and closes panel.

**Add `handleGateSaveAndUnpublish`:**
- `setIsSavingAndUnpublishing(true)`
- `updateAssistant(id, pendingFormValues.current)` if values pending
- `unpublishAssistantFromMarketplace(id)`
- Status-appropriate toast, `closeConfigForm()`
- Finally: clear refs and state

**Add `handleGateKeepEditing`:**
- Clear `gateError` and pending refs

### T5 — Wire gateBannerText in EditAssistantPage
Test-first: no — mirrors ChatConfigAssistantForm; covered by visual inspection.

**Changes in `src/pages/assistants/EditAssistantPage.tsx`:**
- Derive `gateBannerText` from `assistant.marketplace_status` (same logic as ChatConfigAssistantForm)
- Update `gateSendForReviewLabel` to shortened strings ("Save and remove" for PENDING_REVIEW and DRAFT)
- Pass `statusBannerOverride={gateBannerText}` to `<PublishGateFindingsModal>`

### T6 — Remove Status column from Marketplace Management Review queue
Test-first: no — UI column removal; covered by visual inspection.

**Changes in `src/pages/settings/administration/MarketplaceAssistantsPage.tsx`:**
- Remove `status` entry from `COLUMN_DEFINITIONS`
- Remove `status` renderer from `customRenderColumns`
- Remove unused `import { AssistantStatusBadge }` (keep `toAssistantStatusBadgeStatus` — still used for action button labels)
