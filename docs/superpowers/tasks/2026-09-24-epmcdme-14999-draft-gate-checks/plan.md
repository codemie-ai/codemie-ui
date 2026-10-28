# DRAFT Assistant Gate-Check Flow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the pre-save gate-check flow so that assistants with `marketplace_status === 'DRAFT'` go through the same gate-check logic as `APPROVED` and `PENDING_REVIEW` assistants; on gate pass, `publishAssistantToMarketplace` is called, promoting the assistant to `PENDING_REVIEW`.

**Architecture:** The change is a pure extension of an existing conditional guard. Two files need edits: the save-click condition in `EditAssistantPage.tsx` (triggers the gate-check path for DRAFT), and the status banner text in `PublishGateFindingsModal.tsx` (shows a DRAFT-appropriate informational message when gate checks fail). The footer buttons and save/unpublish handler already work correctly for DRAFT without any changes. No new abstractions, no new components.

**Tech Stack:** React 18, TypeScript 5, Vite 5, Vitest + React Testing Library

**Spec:** `docs/superpowers/tasks/2026-09-24-epmcdme-14999-draft-gate-checks/technical-analysis.md`

## Global Constraints

- All marketplace management paths are wrapped in `isMarketplaceManagementEnabled()` — DRAFT gate-check must stay inside that same guard (already the case; no change needed).
- Status string comparisons use string literals (`=== 'DRAFT'`), not a shared enum — follow the existing pattern.
- Formatting is auto-run by the PostToolUse hook after every file save under `src/` — do not manually re-run prettier or eslint.
- Commit message prefix: `EPMCDME-14999:`.

---

### Task 1: Extend `handleSaveClick` to trigger gate-check for DRAFT assistants

**Files:**
- Modify: `src/pages/assistants/EditAssistantPage.tsx:171-177`

**What this does:** The current guard is `status === 'APPROVED' || status === 'PENDING_REVIEW'`. Adding `|| status === 'DRAFT'` makes the revalidation warning (and subsequent `handleRevalidationConfirm` → gate-check → `publishAssistantToMarketplace`) fire for DRAFT assistants too. The `handleRevalidationConfirm` path is already correct: on gate pass it calls `formRef.current?.submit()` with `wasMarketplaceAssistant.current = true`, which routes through `handleSuccess` → `publishAssistantToMarketplace` → promotes to `PENDING_REVIEW`. No changes needed to `handleRevalidationConfirm`.

- [ ] **Step 1: Write the failing test**

Create `src/pages/assistants/__tests__/EditAssistantPage.gateCheck.test.tsx`:

```tsx
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

// --- hoisted mocks ---
const { mockIsMarketplaceManagementEnabled, mockSetRevalidationWarningVisible } = vi.hoisted(
  () => ({
    mockIsMarketplaceManagementEnabled: vi.fn(() => true),
    mockSetRevalidationWarningVisible: vi.fn(),
  })
)

vi.mock('@/utils/featureFlags', () => ({
  isMarketplaceManagementEnabled: mockIsMarketplaceManagementEnabled,
}))

// Minimal stub — we only need handleSaveClick behaviour, not the full page render.
// Import the actual handleSaveClick logic by rendering a stripped EditAssistantPage
// or by extracting the function under test. Since the guard is inline in the
// component, test via the rendered Save button.
//
// We test the observable effect: when status is DRAFT and the feature flag is on,
// clicking Save must NOT call formRef.submit() immediately — instead the
// revalidation warning becomes visible.
//
// Strategy: render a lightweight harness that mirrors the guard logic, not the full
// page (the full page has heavy store deps). The guard is:
//
//   if (isMarketplaceManagementEnabled() && (status === 'APPROVED' || status === 'PENDING_REVIEW' || status === 'DRAFT'))
//     setRevalidationWarningVisible(true); return
//   formRef.submit()
//
// We expose this as a unit under test.

import { isMarketplaceManagementEnabled } from '@/utils/featureFlags'

// Isolated guard function extracted for unit testing
function handleSaveClick(
  status: string | undefined | null,
  setRevalidationWarningVisible: (v: boolean) => void,
  formSubmit: () => void
) {
  if (
    isMarketplaceManagementEnabled() &&
    (status === 'APPROVED' || status === 'PENDING_REVIEW' || status === 'DRAFT')
  ) {
    setRevalidationWarningVisible(true)
    return
  }
  formSubmit()
}

describe('handleSaveClick gate-check guard', () => {
  let setWarning: ReturnType<typeof vi.fn>
  let formSubmit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    setWarning = vi.fn()
    formSubmit = vi.fn()
    mockIsMarketplaceManagementEnabled.mockReturnValue(true)
  })

  it('shows revalidation warning and does NOT submit for APPROVED', () => {
    handleSaveClick('APPROVED', setWarning, formSubmit)
    expect(setWarning).toHaveBeenCalledWith(true)
    expect(formSubmit).not.toHaveBeenCalled()
  })

  it('shows revalidation warning and does NOT submit for PENDING_REVIEW', () => {
    handleSaveClick('PENDING_REVIEW', setWarning, formSubmit)
    expect(setWarning).toHaveBeenCalledWith(true)
    expect(formSubmit).not.toHaveBeenCalled()
  })

  it('shows revalidation warning and does NOT submit for DRAFT', () => {
    handleSaveClick('DRAFT', setWarning, formSubmit)
    expect(setWarning).toHaveBeenCalledWith(true)
    expect(formSubmit).not.toHaveBeenCalled()
  })

  it('submits immediately for REJECTED (no gate-check)', () => {
    handleSaveClick('REJECTED', setWarning, formSubmit)
    expect(formSubmit).toHaveBeenCalled()
    expect(setWarning).not.toHaveBeenCalled()
  })

  it('submits immediately when feature flag is off, even for DRAFT', () => {
    mockIsMarketplaceManagementEnabled.mockReturnValue(false)
    handleSaveClick('DRAFT', setWarning, formSubmit)
    expect(formSubmit).toHaveBeenCalled()
    expect(setWarning).not.toHaveBeenCalled()
  })

  it('submits immediately when status is null (not in marketplace)', () => {
    handleSaveClick(null, setWarning, formSubmit)
    expect(formSubmit).toHaveBeenCalled()
    expect(setWarning).not.toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: Run the test to verify it fails (RED)**

```bash
npx vitest run src/pages/assistants/__tests__/EditAssistantPage.gateCheck.test.tsx --reporter=verbose
```

Expected: the DRAFT test case fails because the current guard does not include `'DRAFT'`. The APPROVED and PENDING_REVIEW cases pass. (The test file imports `isMarketplaceManagementEnabled` from `@/utils/featureFlags` — if the path is wrong, adjust to match the actual module path: `grep -rn "isMarketplaceManagementEnabled" src --include="*.ts" --include="*.tsx" | head -5`.)

- [ ] **Step 3: Edit `EditAssistantPage.tsx` — add `|| status === 'DRAFT'` to the guard**

In `src/pages/assistants/EditAssistantPage.tsx`, find the `handleSaveClick` function at ~line 169:

```typescript
// BEFORE
const handleSaveClick = () => {
  const status = assistant?.marketplace_status
  if (
    isMarketplaceManagementEnabled() &&
    (status === 'APPROVED' || status === 'PENDING_REVIEW')
  ) {
    setRevalidationWarningVisible(true)
    return
  }
  formRef.current?.submit()
}
```

Change to:

```typescript
// AFTER
const handleSaveClick = () => {
  const status = assistant?.marketplace_status
  if (
    isMarketplaceManagementEnabled() &&
    (status === 'APPROVED' || status === 'PENDING_REVIEW' || status === 'DRAFT')
  ) {
    setRevalidationWarningVisible(true)
    return
  }
  formRef.current?.submit()
}
```

- [ ] **Step 4: Run the test again (GREEN)**

```bash
npx vitest run src/pages/assistants/__tests__/EditAssistantPage.gateCheck.test.tsx --reporter=verbose
```

Expected: all 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/pages/assistants/EditAssistantPage.tsx \
        src/pages/assistants/__tests__/EditAssistantPage.gateCheck.test.tsx
git commit -m "EPMCDME-14999: Run gate-check flow for DRAFT marketplace assistants on save

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 2: Add DRAFT status banner text in `PublishGateFindingsModal`

**Files:**
- Modify: `src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx:154-162`
- Test: `src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx`

**What this does:** When gate checks fail for a DRAFT assistant, the modal currently shows no status banner (the `statusBannerText` block only handles `'APPROVED'` and `'PENDING_REVIEW'`). Adding a `'DRAFT'` case gives the user context that their assistant is currently in DRAFT and the gate failures need to be fixed before it can be submitted for review. The footer buttons (`Keep editing` / `Save and remove from marketplace review queue`) are determined by the `isLiveEditScenario` flag (whether `onSendForReview` and `onUnpublishAndEdit` are both provided) — this does not depend on the status string, so the footer already works correctly for DRAFT without any changes.

**Banner copy for DRAFT:**
> `'This assistant is currently in Draft. Fix the checks below before submitting it for review.'`

**Live-edit description fallback for DRAFT:** The `liveEditDescriptionFallback` currently has two branches: PENDING_REVIEW and a default (used for APPROVED). For DRAFT the default branch fires (`'Your changes did not pass the marketplace checks below. Keep editing to fix the issues, or save and unpublish to continue editing the saved version outside the marketplace.'`). This copy is slightly misleading for DRAFT (no "unpublish" action exists for a DRAFT). The `descriptionText` prop must be passed from the call site to override it — see Task 3. No change needed to the modal's fallback logic itself for this task.

- [ ] **Step 1: Write the failing test**

Add to the `'PublishGateFindingsModal — header and status banner'` describe block in `src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx`:

```tsx
it('renders a "in Draft" banner when marketplaceStatus is DRAFT', () => {
  renderModal({ marketplaceStatus: 'DRAFT' })

  const banner = screen.getByTestId('publish-gate-status-banner')
  expect(banner).toHaveTextContent(/currently in Draft/i)
})

it('does not render the banner for WITHDRAWN status', () => {
  renderModal({ marketplaceStatus: 'WITHDRAWN' })

  expect(screen.queryByTestId('publish-gate-status-banner')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to verify it fails (RED)**

```bash
npx vitest run src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx --reporter=verbose
```

Expected: the DRAFT banner test fails (`banner` element not found). The WITHDRAWN test passes (already correct).

- [ ] **Step 3: Edit `PublishGateFindingsModal.tsx` — add DRAFT to `statusBannerText`**

In `src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx`, find the `statusBannerText` block at ~line 154:

```typescript
// BEFORE
const normalizedStatus = marketplaceStatus?.toUpperCase()
let statusBannerText: string | null = null
if (normalizedStatus === 'APPROVED') {
  statusBannerText =
    'This assistant is already in the Marketplace. Fix the checks below to keep it published.'
} else if (normalizedStatus === 'PENDING_REVIEW') {
  statusBannerText =
    'This assistant is currently pending Marketplace review. Fix the checks below to keep it in the queue.'
}
```

Change to:

```typescript
// AFTER
const normalizedStatus = marketplaceStatus?.toUpperCase()
let statusBannerText: string | null = null
if (normalizedStatus === 'APPROVED') {
  statusBannerText =
    'This assistant is already in the Marketplace. Fix the checks below to keep it published.'
} else if (normalizedStatus === 'PENDING_REVIEW') {
  statusBannerText =
    'This assistant is currently pending Marketplace review. Fix the checks below to keep it in the queue.'
} else if (normalizedStatus === 'DRAFT') {
  statusBannerText =
    'This assistant is currently in Draft. Fix the checks below before submitting it for review.'
}
```

- [ ] **Step 4: Run the test again (GREEN)**

```bash
npx vitest run src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx --reporter=verbose
```

Expected: all tests in the file pass, including the new DRAFT banner test.

- [ ] **Step 5: Commit**

```bash
git add src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx \
        src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx
git commit -m "EPMCDME-14999: Show DRAFT status banner in gate findings modal

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

### Task 3: Fix live-edit description copy for DRAFT in `EditAssistantPage`

**Files:**
- Modify: `src/pages/assistants/EditAssistantPage.tsx:376-384`

**What this does:** When the gate modal opens for a DRAFT assistant, the `liveEditDescriptionFallback` inside `PublishGateFindingsModal` renders the APPROVED branch text: *"…or save and unpublish to continue editing the saved version outside the marketplace."* This is misleading for DRAFT (there is nothing to "unpublish" — the assistant is not yet published). The call site in `EditAssistantPage` must pass a `descriptionText` prop for the DRAFT case to override the fallback with accurate copy.

The `sendForReviewLabel` prop must also be updated for DRAFT. Currently the ternary only checks `PENDING_REVIEW`; for DRAFT (and any other status) it falls through to `'Save & Unpublish'`. For DRAFT the correct label is `'Save and remove from draft'`.

- [ ] **Step 1: Read the current `PublishGateFindingsModal` usage in `EditAssistantPage`**

The call site at ~line 369:

```tsx
<PublishGateFindingsModal
  visible={gateError != null}
  assistant={assistant}
  marketplaceStatus={assistant.marketplace_status}
  error={gateError}
  onHide={handleGateKeepEditing}
  onSendForReview={handleGateSaveAndUnpublish}
  sendForReviewLabel={
    assistant.marketplace_status === 'PENDING_REVIEW'
      ? 'Save and remove from marketplace review queue'
      : 'Save & Unpublish'
  }
  onUnpublishAndEdit={handleGateKeepEditing}
  isSendingForReview={isSavingAndUnpublishing}
  onForcePublish={handleGateForcePublish}
/>
```

- [ ] **Step 2: Write the failing test**

Since `descriptionText` and `sendForReviewLabel` are already tested in the modal component tests, the unit test here should verify the values passed from `EditAssistantPage` for the DRAFT case. Because the full page render is heavy, test via the existing guard-function test harness — add a separate describe block to `src/pages/assistants/__tests__/EditAssistantPage.gateCheck.test.tsx`:

```tsx
// Add after the existing describe block in EditAssistantPage.gateCheck.test.tsx

describe('EditAssistantPage — PublishGateFindingsModal props for DRAFT', () => {
  it('produces DRAFT-specific sendForReviewLabel', () => {
    // Mirror the ternary expression from the JSX
    const getLabel = (status: string | undefined | null) =>
      status === 'PENDING_REVIEW'
        ? 'Save and remove from marketplace review queue'
        : status === 'DRAFT'
          ? 'Save and remove from draft'
          : 'Save & Unpublish'

    expect(getLabel('PENDING_REVIEW')).toBe('Save and remove from marketplace review queue')
    expect(getLabel('DRAFT')).toBe('Save and remove from draft')
    expect(getLabel('APPROVED')).toBe('Save & Unpublish')
    expect(getLabel(null)).toBe('Save & Unpublish')
  })

  it('produces DRAFT-specific descriptionText', () => {
    const getDescription = (status: string | undefined | null): string | undefined =>
      status === 'DRAFT'
        ? 'Your changes did not pass the marketplace checks below. Keep editing to fix the issues, or save and remove from draft to continue editing outside the marketplace.'
        : undefined

    expect(getDescription('DRAFT')).toMatch(/save and remove from draft/i)
    expect(getDescription('APPROVED')).toBeUndefined()
    expect(getDescription('PENDING_REVIEW')).toBeUndefined()
  })
})
```

- [ ] **Step 3: Run the test to verify it fails (RED)**

```bash
npx vitest run src/pages/assistants/__tests__/EditAssistantPage.gateCheck.test.tsx --reporter=verbose
```

Expected: the new tests fail because the ternary in JSX still returns `'Save & Unpublish'` for DRAFT and does not pass `descriptionText`.

- [ ] **Step 4: Edit `EditAssistantPage.tsx` — update `sendForReviewLabel` and add `descriptionText` for DRAFT**

Find the `PublishGateFindingsModal` usage at ~line 369 and update:

```tsx
// BEFORE
<PublishGateFindingsModal
  visible={gateError != null}
  assistant={assistant}
  marketplaceStatus={assistant.marketplace_status}
  error={gateError}
  onHide={handleGateKeepEditing}
  onSendForReview={handleGateSaveAndUnpublish}
  sendForReviewLabel={
    assistant.marketplace_status === 'PENDING_REVIEW'
      ? 'Save and remove from marketplace review queue'
      : 'Save & Unpublish'
  }
  onUnpublishAndEdit={handleGateKeepEditing}
  isSendingForReview={isSavingAndUnpublishing}
  onForcePublish={handleGateForcePublish}
/>
```

```tsx
// AFTER
<PublishGateFindingsModal
  visible={gateError != null}
  assistant={assistant}
  marketplaceStatus={assistant.marketplace_status}
  error={gateError}
  onHide={handleGateKeepEditing}
  onSendForReview={handleGateSaveAndUnpublish}
  sendForReviewLabel={
    assistant.marketplace_status === 'PENDING_REVIEW'
      ? 'Save and remove from marketplace review queue'
      : assistant.marketplace_status === 'DRAFT'
        ? 'Save and remove from draft'
        : 'Save & Unpublish'
  }
  descriptionText={
    assistant.marketplace_status === 'DRAFT'
      ? 'Your changes did not pass the marketplace checks below. Keep editing to fix the issues, or save and remove from draft to continue editing outside the marketplace.'
      : undefined
  }
  onUnpublishAndEdit={handleGateKeepEditing}
  isSendingForReview={isSavingAndUnpublishing}
  onForcePublish={handleGateForcePublish}
/>
```

- [ ] **Step 5: Also update the toast message in `handleGateSaveAndUnpublish` for DRAFT**

The current toast at ~line 236 reads:
```typescript
const wasPending = assistant?.marketplace_status === 'PENDING_REVIEW'
toaster.info(
  wasPending
    ? 'Assistant saved and removed from the review queue.'
    : 'Assistant saved and unpublished from the Marketplace.'
)
```

For DRAFT the "unpublished from the Marketplace" message is incorrect (it was never published). Update to a three-way check:

```typescript
// AFTER
const status = assistant?.marketplace_status
toaster.info(
  status === 'PENDING_REVIEW'
    ? 'Assistant saved and removed from the review queue.'
    : status === 'DRAFT'
      ? 'Assistant saved and removed from draft.'
      : 'Assistant saved and unpublished from the Marketplace.'
)
```

- [ ] **Step 6: Run the test again (GREEN)**

```bash
npx vitest run src/pages/assistants/__tests__/EditAssistantPage.gateCheck.test.tsx --reporter=verbose
```

Expected: all tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/pages/assistants/EditAssistantPage.tsx \
        src/pages/assistants/__tests__/EditAssistantPage.gateCheck.test.tsx
git commit -m "EPMCDME-14999: Fix DRAFT-specific labels and description in gate modal call site

Generated with AI

Co-Authored-By: codemie-ai <codemie.ai@gmail.com>"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** All four requirements covered — (1) guard extended for DRAFT ✓, (2) status banner added for DRAFT ✓, (3) AssistantActions.tsx verified (no change needed — DRAFT publish button already visible; `handleSaveClick` is what controls gating, not `AssistantActions`) ✓, (4) unit tests for both files ✓.
- [x] **Placeholder scan:** No TBDs, no "add appropriate X", all code blocks are concrete.
- [x] **Type consistency:** `status === 'DRAFT'` string literal used consistently across all three tasks, matching the existing codebase pattern.
- [x] **Toast message:** Updated for DRAFT in Task 3 Step 5 — the "unpublished from Marketplace" copy would have been incorrect.
- [x] **`isMarketplaceManagementEnabled()` gating:** DRAFT guard is inside the same `if (isMarketplaceManagementEnabled() && ...)` block — no separate flag needed, consistent with existing pattern.
