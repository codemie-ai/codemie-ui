# Spec — Configure & Test Panel Marketplace Gate Checks

## Problem

When a user opens the Configure & Test panel from the chat view and saves an assistant that is already marketplace-listed (`marketplace_status ∈ {DRAFT, PENDING_REVIEW, APPROVED}`), the save bypasses the marketplace gate-check flow introduced in EPMCDME-14999. The panel calls `updateAssistant` directly with no pre-save validation.

A secondary root cause was discovered during implementation: `useMissingIntegrationsModal` did not recognise the `{ success: false }` sentinel that gate-check callers return to pause the save. The hook fell through and called `onSuccess()`, closing the form before any modal could render.

This only matters when the `isMarketplaceManagementEnabled()` feature flag is on.

## Solution

1. Fix `useMissingIntegrationsModal` so `{ success: false }` from `onSubmit` is an early return (no `onSuccess` call).
2. Add the same gate-check flow to `ChatConfigAssistantForm.handleSubmit` that `EditAssistantPage.handleRevalidationConfirm` uses.
3. Add contextual status-banner text in the gate-findings modal for both edit paths, replacing the generic default.
4. Remove the redundant Status column from the Marketplace Management Review queue table.

No backend changes are needed.

## Behaviour

### When the feature flag is OFF or the assistant is not marketplace-listed

Save proceeds exactly as today — no change.

### When the feature flag is ON and `marketplace_status ∈ {DRAFT, PENDING_REVIEW, APPROVED}`

1. **Revalidation warning modal** — before saving, show `ConfirmationModal`:
   - Header: `"Save changes"`
   - Message: `"Saving this edit will unpublish your assistant and send it for re-validation. It will be unavailable in the Marketplace until the review is complete."`
   - Confirm: `"Save"` / Cancel: `"Cancel"`
2. **On cancel** — close the modal; no save.
3. **On confirm** — show a validating spinner popup (`"Validating your Assistant configuration..."`), run `assistantsStore.checkMarketplaceGates(id, values, categories)`.
4. **Gate passes** — dismiss spinner; call `updateAssistant` → show `"Assistant has been updated successfully!"` toast → `closeConfigForm()`.
5. **Gate fails** (hard `gate_findings` / `failed_rules`, or soft `quality_validation`) — dismiss spinner; show `PublishGateFindingsModal` with:
   - `marketplaceStatus` from the assistant
   - `statusBannerOverride`: contextual explanation (see table below)
   - `descriptionText`: only for DRAFT status — `"Your changes did not pass the marketplace checks below. Keep editing to fix the issues, or save and remove from marketplace to continue editing outside the marketplace."`
   - `sendForReviewLabel`: derived from status (see table below)
6. **Primary action** — call `updateAssistant(id, pendingValues)` → `unpublishAssistantFromMarketplace(id)` → status-appropriate toast → `closeConfigForm()`.
7. **"Keep editing"** — close modal; user stays in the panel.

### No re-publish step

After a clean gate pass the panel does NOT call `publishAssistantToMarketplace`. The assistant stays in its current marketplace queue — only the edit save is performed.

### `sendForReviewLabel` values

| `marketplace_status` | Label |
|---|---|
| `PENDING_REVIEW` | `"Save and remove"` |
| `DRAFT` | `"Save and remove"` |
| `APPROVED` | `"Save & Unpublish"` |

### `statusBannerOverride` text

Passed to `PublishGateFindingsModal` via the new `statusBannerOverride?: string | null` prop. Replaces the default status-derived text in the modal's blue info banner.

| `marketplace_status` | Banner text |
|---|---|
| `PENDING_REVIEW` | `"This assistant is currently pending Marketplace review. Fix the checks below to keep it in the queue, or save without fixing to remove it from the review queue."` |
| `APPROVED` | `"This assistant is already in the Marketplace. Fix the checks below to keep it published, or save without fixing to unpublish it."` |
| `DRAFT` | *(no override — default text applies)* |

This override is wired in both `ChatConfigAssistantForm` and `EditAssistantPage`.

## Files changed

| File | Change |
|---|---|
| `src/pages/assistants/hooks/useMissingIntegrationsModal.ts` | Add `success?: boolean` to `SubmitResponse`; add early-return guard on `response.success === false` |
| `src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx` | Add `statusBannerOverride?: string \| null` prop; use it to replace the default status-derived banner text |
| `src/pages/chat/components/ChatConfiguration/ChatConfigAssistants/ChatConfigAssistantForm.tsx` | Add gate-check state, revalidation modal, validating spinner, `PublishGateFindingsModal`, gate-check logic, and `statusBannerOverride` wiring |
| `src/pages/assistants/EditAssistantPage.tsx` | Add `gateBannerText` and wire `statusBannerOverride` into existing `PublishGateFindingsModal`; update `sendForReviewLabel` to shortened strings |
| `src/pages/settings/administration/MarketplaceAssistantsPage.tsx` | Remove Status column from Review queue table (`COLUMN_DEFINITIONS` + `customRenderColumns`); remove unused `AssistantStatusBadge` import |

## Out of scope

- Admin Force-Publish in the chat panel.
- Re-publishing to the marketplace after save.
- Changes to gate-check rules or modal content.
- Publish/unpublish action buttons in the panel.
- Assistant creation flow.

## Acceptance Criteria

- Given `isMarketplaceManagementEnabled() === false`, saving via the panel proceeds without any gate-check modals.
- Given the assistant has no marketplace status, saving proceeds without any gate-check modals.
- Given `marketplace_status ∈ {DRAFT, PENDING_REVIEW, APPROVED}` and FF on: saving shows the revalidation warning modal first.
- Given user cancels the revalidation warning: no save occurs, panel stays open.
- Given gate checks pass: assistant is saved, success toast shown, panel closes.
- Given gate checks fail: `PublishGateFindingsModal` is shown with correct `marketplaceStatus`, `error`, `descriptionText`, and `sendForReviewLabel`.
- Given user clicks primary action ("Save and remove" / "Save & Unpublish"): assistant is saved and unpublished, panel closes.
- Given user clicks "Keep editing": modal closes, panel stays open with no save.
- Given `useMissingIntegrationsModal.onSubmit` returns `{ success: false }`: `onSuccess` is not called.
- Given `marketplace_status === PENDING_REVIEW` in the gate modal: the status banner explains the review-queue context with an option to remove from queue.
- Given `marketplace_status === APPROVED` in the gate modal: the status banner explains the published context with an option to unpublish.
- Given the Marketplace Management Review queue table: the Status column is not present.
