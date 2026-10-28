# Marketplace Verification Modal UX — Implementation Plan

> **For agentic workers:** implemented inline via `sdlc-light` Stage 4 (TDD). Steps use checkbox (`- [ ]`) tracking.

**Goal:** Rename the marketplace publish gate modal to a clearer "Assistant Verification Failed" title and add an in-modal status banner that explains why the user is seeing it when the assistant is already in the Marketplace (APPROVED) or in the pending-review queue (PENDING_REVIEW).

**Architecture:** Two-part change confined to `src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx` and its details-page host `PublishToMarketplaceModal.tsx`. (a) Change the default `headerText` prop of `PublishGateFindingsModal` to `"Assistant Verification Failed"`. (b) Add a new optional `marketplaceStatus?: string` prop; when it equals `'APPROVED'` or `'PENDING_REVIEW'`, render a small status banner at the top of the modal body explaining the current marketplace state. (c) Pass `marketplaceStatus={assistant.marketplace_status}` from both call sites (`PublishToMarketplaceModal.tsx`, `EditAssistantPage.tsx`) so context is available regardless of entry point. The existing `EditAssistantPage` override that changes the title to `"This assistant can't be added to the Marketplace yet"` for `PENDING_REVIEW` is dropped in favor of the unified "Assistant Verification Failed" title plus the new banner — one title, banner carries the context.

**Tech Stack:** React 18 + TypeScript 5, PrimeReact `Popup`, Tailwind, Vitest + React Testing Library.

**Spec:** (n/a — sdlc-light; requirements captured in the user request and Stage 2 clarification: title → "Assistant Verification Failed"; hint delivery → status banner inside modal body.)

## Global Constraints

- Do not consolidate `PublishGateFindingsModal` with `QualityValidationModal` — their action sets differ (see jsdoc lines 96–110 of `PublishGateFindingsModal.tsx`).
- Do not add i18n; strings stay inline (matches project convention).
- Do not touch API/types/store — `Assistant.marketplace_status` already carries the needed signal.
- Use the existing `bg-failed-secondary/10` / `border-failed-secondary/40` banner styling family for consistency (or `bg-warning/10` if one exists — see the codebase; fall back to `bg-surface-elevated` with a colored left border if neither is a fit).
- Do NOT rename existing `data-testid`s; add new ones for the banner.

---

### Task 1: Rename default header and add `marketplaceStatus`-aware banner in `PublishGateFindingsModal`

**Files:**
- Modify: `src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx`
- Test: `src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx`

**Interfaces:**
- Consumes: `assistant.marketplace_status` (existing `Assistant` type, `string | null | undefined`).
- Produces: `PublishGateFindingsModalProps` now includes optional `marketplaceStatus?: string | null`. Default `headerText` is `"Assistant Verification Failed"`. New DOM node `data-testid="publish-gate-status-banner"` renders when `marketplaceStatus` is `'APPROVED'` or `'PENDING_REVIEW'`.

- [ ] **Step 1: Write failing tests**

Add to `PublishGateFindingsModal.test.tsx` (append a new `describe` block; reuse the existing `renderModal` helper):

```tsx
describe('PublishGateFindingsModal — header and status banner', () => {
  it('shows "Assistant Verification Failed" as the default header', () => {
    renderModal()
    expect(screen.getByRole('heading', { name: /assistant verification failed/i })).toBeInTheDocument()
  })

  it('does not render the status banner when marketplaceStatus is missing', () => {
    renderModal()
    expect(screen.queryByTestId('publish-gate-status-banner')).not.toBeInTheDocument()
  })

  it('renders an "already in Marketplace" banner when marketplaceStatus is APPROVED', () => {
    renderModal({ marketplaceStatus: 'APPROVED' })
    const banner = screen.getByTestId('publish-gate-status-banner')
    expect(banner).toHaveTextContent(/already in the Marketplace/i)
  })

  it('renders a "pending review" banner when marketplaceStatus is PENDING_REVIEW', () => {
    renderModal({ marketplaceStatus: 'PENDING_REVIEW' })
    const banner = screen.getByTestId('publish-gate-status-banner')
    expect(banner).toHaveTextContent(/pending Marketplace review/i)
  })

  it('does not render the banner for unrelated statuses', () => {
    renderModal({ marketplaceStatus: 'REJECTED' })
    expect(screen.queryByTestId('publish-gate-status-banner')).not.toBeInTheDocument()
  })

  it('honours a caller-provided headerText override', () => {
    renderModal({ headerText: 'Custom header' })
    expect(screen.getByRole('heading', { name: 'Custom header' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: /assistant verification failed/i })).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx`
Expected: 6 new failing assertions (header rename, banner presence for each status, absence for missing/unrelated status, override honoured).

- [ ] **Step 3: Implement the change in `PublishGateFindingsModal.tsx`**

Add `marketplaceStatus?: string | null` to `PublishGateFindingsModalProps` (right after `descriptionText`).

Change the default header value:

```tsx
headerText = 'Assistant Verification Failed',
```

Update the jsdoc for `headerText` accordingly.

Destructure `marketplaceStatus` in the component signature (default `undefined`).

Inside the component body, above the `handleEdit` declaration, compute:

```tsx
const normalizedStatus = marketplaceStatus?.toUpperCase()
const statusBannerText =
  normalizedStatus === 'APPROVED'
    ? 'This assistant is already in the Marketplace. Fix the checks below to keep it published.'
    : normalizedStatus === 'PENDING_REVIEW'
      ? 'This assistant is currently pending Marketplace review. Fix the checks below to keep it in the queue.'
      : null
```

In the returned JSX, insert the banner as the first child of `<div className="flex flex-col gap-4" data-testid="publish-gate-dialog">` (before the `<p className="text-sm text-text-quaternary">…</p>` description):

```tsx
{statusBannerText && (
  <div
    className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs text-text-primary"
    data-testid="publish-gate-status-banner"
    role="status"
  >
    {statusBannerText}
  </div>
)}
```

(If Tailwind does not resolve `warning` variants in this project, fall back to `border-failed-secondary/40 bg-failed-secondary/10` — verified in existing usage on line 265 of the same file.)

- [ ] **Step 4: Verify Tailwind class availability**

Run: `grep -rn "bg-warning/10\|border-warning/40" src/ | head -3`
If empty → switch banner classes in Step 3 to `border-failed-secondary/40 bg-failed-secondary/10` (already used elsewhere in this file).

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx`
Expected: all tests PASS (existing Force-Publish tests continue to pass; new banner/header tests now pass).

- [ ] **Step 6: Commit**

```bash
git add src/pages/assistants/AssistantActions/components/PublishGateFindingsModal.tsx \
        src/pages/assistants/AssistantActions/components/__tests__/PublishGateFindingsModal.test.tsx
git commit -m "EPMCDME-14999: Rename gate modal header and add marketplace-status banner"
```

---

### Task 2: Wire `marketplaceStatus` from both call sites

**Files:**
- Modify: `src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx:446-470`
- Modify: `src/pages/assistants/EditAssistantPage.tsx:368-394`

**Interfaces:**
- Consumes: Task 1's new `marketplaceStatus` prop.
- Produces: no new interface. Both hosts now pass `marketplaceStatus={assistant.marketplace_status}` and drop the `EditAssistantPage` `headerText`/`descriptionText` PENDING_REVIEW overrides (the unified header + banner replaces them).

- [ ] **Step 1: Edit `PublishToMarketplaceModal.tsx`**

Locate the `<PublishGateFindingsModal ... />` block (around line 446). Add a single prop line, immediately after `assistant={assistant}`:

```tsx
marketplaceStatus={assistant.marketplace_status}
```

No other change in this file.

- [ ] **Step 2: Edit `EditAssistantPage.tsx`**

Replace the IIFE block at lines 368–394 with the simpler form:

```tsx
{assistant && (
  <PublishGateFindingsModal
    visible={gateError != null}
    assistant={assistant}
    marketplaceStatus={assistant.marketplace_status}
    error={gateError}
    onHide={handleGateKeepEditing}
    onSendForReview={handleGateSaveAndUnpublish}
    sendForReviewLabel={
      assistant.marketplace_status === 'PENDING_REVIEW'
        ? 'Save and remove from Pending'
        : 'Save & Unpublish'
    }
    onUnpublishAndEdit={handleGateKeepEditing}
    isSendingForReview={isSavingAndUnpublishing}
    onForcePublish={handleGateForcePublish}
  />
)}
```

Rationale: `sendForReviewLabel` still varies with status (button copy), but the `headerText`/`descriptionText` PENDING_REVIEW overrides are removed — the new unified header ("Assistant Verification Failed") plus the banner from Task 1 replaces them, so the same message appears whether the user came from the details page or the edit page.

- [ ] **Step 3: Run related integration tests**

Run: `npx vitest run src/pages/assistants/__tests__/EditAssistantPage.integration.test.tsx src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx src/pages/assistants/__tests__/NewAssistantPage.integration.test.tsx`
Expected: PASS. If any assertion matched on the removed "This assistant can't be added to the Marketplace yet" or "This assistant can't be published yet" header strings, update those assertions to match the new "Assistant Verification Failed" header — that is the only allowed test edit.

- [ ] **Step 4: Type-check**

Run: `npm run type-check`
Expected: no errors introduced by the new prop.

- [ ] **Step 5: Commit**

```bash
git add src/pages/assistants/AssistantActions/components/PublishToMarketplaceModal.tsx \
        src/pages/assistants/EditAssistantPage.tsx
# Include any integration-test file that had to update its header assertion.
git commit -m "EPMCDME-14999: Pass marketplace_status to gate modal from both hosts"
```

---

## Self-Review

- **Coverage:** (1) Title rename → Task 1 Step 3. (2) Contextual "already in marketplace / pending queue" hint → Task 1 Step 3 (banner) + Task 2 (wire-up from both hosts). ✅
- **Placeholder scan:** none — every step has code or a concrete command. ✅
- **Type consistency:** `marketplaceStatus?: string | null` accepts the store's `Assistant.marketplace_status?: string | null` (types match). Header default string matches the rendered assertion. `data-testid="publish-gate-status-banner"` used consistently in test and impl. ✅
- **Test churn:** existing `PublishGateFindingsModal.test.tsx` uses `data-testid` selectors only (verified via grep) — rename does not break them. Integration tests are re-run in Task 2 Step 3; if any asserted the removed strings they get a targeted assertion update in the same commit.
