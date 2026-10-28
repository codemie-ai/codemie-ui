# Spec: EPMCDME-14999 — Approval Flow Functionality Update

## Problem

The marketplace approval flow had several UX gaps for both publishing users and admins:

1. When an assistant entered the pending-review queue, users saw only a transient toast — no confirmation of what had happened or what to expect.
2. When a user saved an edit to a live or pending-review assistant, the backend silently re-submitted it for review (unpublishing it), with no pre-save warning.
3. When a live assistant's edit failed the publish gate (422), there was no path for non-admin users to take any meaningful action — the only options were "Edit assistant" (confusing when already on edit page) or admin-only "Force-Publish".
4. The "Skip Validation & Save" / "Force-Publish" button in `MissingIntegrationsModal` was visible to all users, even though the backend rejects it for non-admins.
5. The admin Marketplace Management tab showed a status filter and loaded all statuses by default, cluttering the queue with non-pending items.
6. The new AC#1–3 behaviors needed to be inactive in environments where `isMarketplaceManagementEnabled` is off.

---

## Acceptance Criteria

### AC#1 — Submitted-for-review confirmation modal

- When a user publishes an assistant and the response returns `marketplace_status === 'PENDING_REVIEW'`, show `SubmittedForReviewModal` (not a toast).
- Modal text: "Your assistant has been sent for manual review and is now pending approval — it will not be visible in the Marketplace until approved."
- On modal close, the assistant status badge reflects Pending Review without a page reload.
- Gated behind `isMarketplaceManagementEnabled()` (AC#6).

### AC#2 — Gate-check-before-save with revalidation warning on edit

- When a user attempts to save an assistant with `marketplace_status === 'APPROVED'` or `'PENDING_REVIEW'`, intercept the save and show a `ConfirmationModal` warning.
- Modal header: `"Save changes"`
- Modal message: "Saving this edit will unpublish your assistant and send it for re-validation. It will be unavailable in the Marketplace until the review is complete."
- Confirm button: `"Save"` — runs a pre-save gate-check (`checkMarketplaceGates`) before committing the update.
  - If gate-check passes: proceeds with `updateAssistant` then `publishAssistantToMarketplace`.
  - If gate-check fails: shows `PublishGateFindingsModal` (see AC#3 edit-page variant) without saving; user can choose "Save & Unpublish" or "Keep editing".
- Cancel button: `"Cancel"` — abandons the save; assistant remains unchanged.
- Warning does not re-trigger on subsequent `handleSubmit` calls within the same save sequence (e.g. after missing-integration resolution).
- Gated behind `isMarketplaceManagementEnabled()` (AC#6).

### AC#3 — Validation-failed modal with clear user choice

Two contexts share the gate-failure surface. Both are gated behind `isMarketplaceManagementEnabled()` (AC#6).

#### Publish-flow context (`PublishToMarketplaceModal`)
- When a user publishes and the gate returns 422, `PublishGateFindingsModal` presents two action buttons in addition to the existing Cancel/Force-Publish:
  - **"Send for manual review"** — calls `performPublish(false, false)`; on PENDING_REVIEW outcome, `SubmittedForReviewModal` (AC#1) follows.
  - **"Unpublish and keep editing"** — calls `unpublishAssistantFromMarketplace`, clears `gateError`, calls `onClose()` to close the publish modal. The assistant is left unpublished; the user can continue editing.
- Admin "Force-Publish" remains available.
- The two-button layout applies only when `assistant.marketplace_status === 'APPROVED'` or `'PENDING_REVIEW'` at the time the gate fails.

#### Edit-page context (`EditAssistantPage`)
- When the pre-save gate-check (AC#2 confirm flow) fails, `PublishGateFindingsModal` presents two action buttons:
  - **"Save & Unpublish"** — saves the assistant with `updateAssistant` (skipping re-publish) and navigates back; assistant is left in draft state.
  - **"Keep editing"** — closes the gate-error modal; user remains on the edit page with their changes intact.
- Admin "Force-Publish" remains available.

### AC#4 — Admin-only "Skip Validation & Save"

- The "Skip Validation & Save" button (formerly "Force-Publish") in `MissingIntegrationsModal` is rendered only when the current user is admin (`user?.isAdmin`).

### AC#5 — Pending Assistants tab

- The "Marketplace management" tab in the admin area is renamed to "Pending Assistants".
- The status filter is removed from the tab.
- The tab always loads records with status `PENDING`.

### AC#6 — Feature-flag gate

- The behaviors introduced in AC#1, AC#2, and AC#3 are inactive when `isMarketplaceManagementEnabled()` returns false.
- AC#4 and AC#5 are admin-area changes not affected by this flag.

---

## Design

### AC#1 — SubmittedForReviewModal

`SubmittedForReviewModal` already exists and is rendered inside `PublishToMarketplaceModal`. The change is:

1. In `performPublish()`, when `result.marketplace_status === 'PENDING_REVIEW'` **and** `isMarketplaceManagementEnabled()`: set `showPendingReviewConfirm = true` instead of calling `toaster.info(...)`.
2. Call `onSuccess()` immediately when the PENDING_REVIEW result is received so the status badge and assistant list update in the background.
3. On `SubmittedForReviewModal` close: call `onClose()` to dismiss the publish flow.
4. Also wired in `EditAssistantPage.handleSuccess`: when `publishAssistantToMarketplace` returns `PENDING_REVIEW` and `isMarketplaceManagementEnabled()`, set `showPendingReviewConfirm = true` to show the same modal.

### AC#2 — Gate-check-before-save in `EditAssistantPage`

State and refs:
```ts
const [revalidationWarningVisible, setRevalidationWarningVisible] = useState(false)
const [isValidating, setIsValidating] = useState(false)
const [validatingMessage, setValidatingMessage] = useState('Validating...')
const [showPendingReviewConfirm, setShowPendingReviewConfirm] = useState(false)
const wasMarketplaceAssistant = useRef(false)
const categoriesAtSave = useRef<string[]>([])
const pendingFormValues = useRef<any>(null)
```

Save-click intercept in `handleSaveClick`:
```ts
const handleSaveClick = () => {
  if (isMarketplaceManagementEnabled() && (status === 'APPROVED' || status === 'PENDING_REVIEW')) {
    setRevalidationWarningVisible(true)
    return
  }
  formRef.current?.submit()
}
```

Confirm flow in `handleRevalidationConfirm`:
1. Capture current `categoriesAtSave.current`.
2. Run `assistantsStore.checkMarketplaceGates(assistantId, formValues, categories)` with a validating spinner.
3. If gate fails: set `gateError` to show `PublishGateFindingsModal` (edit-page variant) without saving.
4. If gate passes: set `wasMarketplaceAssistant.current = true`, call `formRef.current?.submit()`.

Post-save in `handleSuccess`:
1. If `wasMarketplaceAssistant.current` is true: call `publishAssistantToMarketplace` with captured categories.
2. On PENDING_REVIEW: show `SubmittedForReviewModal`.
3. On non-gate error from publish: show error toast, do not navigate.
4. Otherwise: show success toast and navigate back.

JSX: `<ConfirmationModal>` + `<PublishGateFindingsModal>` + `<SubmittedForReviewModal>` rendered inline in `EditAssistantPage`.

### AC#3 — Live-edit scenario in `PublishGateFindingsModal`

New optional props on `PublishGateFindingsModalProps`:
```ts
onSendForReview?: () => Promise<void>
onUnpublishAndEdit?: () => Promise<void>
isSendingForReview?: boolean
isUnpublishing?: boolean
onSaveAndUnpublish?: () => Promise<void>
isSavingAndUnpublishing?: boolean
onKeepEditing?: () => void
```

Discriminator for publish-flow variant:
```ts
const isLiveEditScenario =
  isMarketplaceManagementEnabled() &&
  (assistant.marketplace_status === 'APPROVED' || assistant.marketplace_status === 'PENDING_REVIEW')
```

When `isLiveEditScenario` in publish context: show "Unpublish and keep editing" + "Send for manual review" buttons. "Force-Publish" remains for admins.

When called from `EditAssistantPage` (edit-page context): show "Save & Unpublish" + "Keep editing" buttons.

Wiring in `PublishToMarketplaceModal`:
- `handleSendForReview`: calls `performPublish(false, false)` wrapped in `isSendingForReview` loading state.
- `handleUnpublishAndEdit`: calls `assistantsStore.unpublishAssistantFromMarketplace(assistant.id)`, then `setGateError(null)`, `onSuccess()`, `onClose()`.

Wiring in `EditAssistantPage`:
- `handleSaveAndUnpublish`: saves using `pendingFormValues`, navigates back; assistant is left unpublished.
- `handleKeepEditing` (= cancel): closes the gate-error modal.

### AC#4 — Admin gate in `MissingIntegrationsModal`

```tsx
{user?.isAdmin && (
  <Button onClick={onSkipValidation}>Skip Validation & Save</Button>
)}
```

### AC#5 — Pending Assistants tab

In the `MarketplaceManagement` tab component:
- Rename tab label from "Marketplace management" to "Pending Assistants".
- Remove `status` filter UI element.
- Hard-code the data fetch to always request `status=PENDING`.

---

## Files Changed

| File | Change |
|---|---|
| `src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx` | AC#1: replace toast with SubmittedForReviewModal on PENDING_REVIEW; AC#3 publish-context: add `handleSendForReview`, `handleUnpublishAndEdit` (calls `onClose()`), loading states, pass new props |
| `src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx` | AC#3: add optional props for both publish-flow and edit-page variants; conditional footer swap |
| `src/pages/assistants/EditAssistantPage.tsx` | AC#2: `handleSaveClick` intercept + `handleRevalidationConfirm` gate-check + `handleSuccess` publish; AC#3 edit-page: `handleSaveAndUnpublish` + `handleKeepEditing`; AC#1: `SubmittedForReviewModal` wired |
| `src/pages/assistants/AssistantActions/components/MissingIntegrationsModal.tsx` | AC#4: gate "Skip Validation & Save" behind `user?.isAdmin` |
| `src/pages/settings/administration/MarketplaceManagement/` (tab component) | AC#5: rename tab, remove status filter, hardcode PENDING |

---

## Out of Scope

- Navigation guards (leaving the edit page without saving) — not required.
- Backend API changes — all changes are frontend-only; `POST /v1/assistants/{id}/marketplace/publish/gate-check` (used for AC#2 pre-save check) is a pre-existing side-effect-free endpoint.
- New store methods — `assistantsStore.checkMarketplaceGates` was added as part of this work to call the gate-check endpoint.
