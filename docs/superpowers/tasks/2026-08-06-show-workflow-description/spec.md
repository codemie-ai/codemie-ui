# Spec: Show Description on Workflow Details Page

**Ticket**: EPMCDME-8251  
**Branch**: EPMCDME-8251_show-workflow-description

---

## Problem

The workflow `description` field is fetched and typed but is only rendered inside `ViewWorkflowConfiguration`, which is dead code (not mounted on any route). Users viewing the Workflow details page have no way to see the description without switching to the Configuration tab.

---

## Solution

Add a `description` prop to `PageLayout` that renders a dedicated row between the fixed header bar and the scrollable content area. Pass `workflow?.description` from `WorkflowDetailsPage`. The row is only rendered when the description is non-empty, so all other pages and all workflows without a description are unaffected.

---

## Component Changes

### `src/components/Layouts/Layout/PageLayout.tsx`

- Add `description?: ReactNode` to `LayoutProps`.
- Render a new row between the `min-h-layout-header` bar and the `flex-grow overflow-y-auto` content div:

```tsx
{description && (
  <div className="px-6 py-2 text-sm text-text-quaternary break-words whitespace-pre-wrap border-b border-border-specific-panel-outline">
    {description}
  </div>
)}
```

No changes to the header bar height, padding, or subtitle styling. No other pages are affected.

### `src/pages/workflows/WorkflowDetailsPage.tsx`

- Add `description={workflow?.description}` to the `<PageLayout>` call.

No other changes to `WorkflowDetailsPage.tsx`.

---

## No-Regression Guarantee

- `WorkflowExecutionConfigDetails.tsx` is unchanged — the sidebar card retains its current name/ID/Configure layout.
- `ViewWorkflowConfiguration.tsx` (dead code) is untouched.
- The Configuration tab description display is unaffected.

---

## Tests

### `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx`

1. Add `description: undefined` to `createWorkflowFixture` defaults (makes the field explicit).
2. **Happy path**: render with `createWorkflowFixture({ description: 'My workflow description' })` → assert `'My workflow description'` appears in the document.
3. **Empty case**: render with `createWorkflowFixture({ description: undefined })` → assert the description text is absent.

### `src/pages/workflows/details/configuration/__tests__/WorkflowExecutionConfigDetails.test.tsx` (new file)

1. **Smoke — no description**: render with a workflow that has no description → no description element in the DOM.
2. **Smoke — existing fields**: render with a full workflow → name, ID text, and Configure button are present.

---

## Out of Scope

**AC5 — Documentation update**: This repo contains no end-user documentation. A separate follow-up with the docs team is required to update external documentation about the new description location.

---

## Acceptance Criteria Mapping

| AC | Satisfied by |
|---|---|
| 1. Description shown on details page for all users | `PageLayout` description row, visible regardless of edit permissions |
| 2. Readable, not editable | Plain `<div>` with `break-words whitespace-pre-wrap`; no input element |
| 3. No regression in Configuration tab | `ViewWorkflowConfiguration` and sidebar card unchanged |
| 4. Applies to every workflow with a description | Conditional render on `workflow?.description` |
| 5. Documentation updated | Out of scope — requires external docs team follow-up |
