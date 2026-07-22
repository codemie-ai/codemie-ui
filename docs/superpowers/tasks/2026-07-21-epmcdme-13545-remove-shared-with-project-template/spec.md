# Spec: Remove "Shared with Project" from Template Cards

**Ticket**: EPMCDME-13545
**Branch**: EPMCDME-13545_remove-shared-with-project-template-cards
**Complexity**: XS (9/36)

---

## Problem

The "Shared with Project" item (and its counterpart "Not shared") is rendered on Assistants template cards and Workflows template cards. Template cards represent reusable templates — they have no meaningful "shared" state for the current user — so the sharing label is misleading and should not be shown. Non-template cards must continue to show the sharing label unchanged.

## Scope

- **In scope**: Assistants template cards (`AssistantCard.tsx`) and Workflows template cards (`WorkflowCard.tsx`).
- **Out of scope**: `ViewWorkflowHeader.tsx` (workflow template detail view header) — the ticket targets cards specifically.

---

## Design

### Approach

Guard the sharing display at the call site in each card component using the `isTemplate` prop, which is already in scope at both fix sites. This follows the established `{!isTemplate && (...)}` pattern introduced by EPMCDME-13544 for the same `WorkflowCard.tsx` file. No changes are needed to `StatusLabel`, `WorkflowShared`, `WorkflowMarketplace`, or the base `Card` component.

### Source Changes

**`AssistantCard.tsx` (line 277)**

Change:
```tsx
status={renderStatus()}
```
To:
```tsx
status={isTemplate ? null : renderStatus()}
```

`Card` already renders `{status && (...)}`, so passing `null` cleanly suppresses the entire status row with no spacing residue.

**`WorkflowCard.tsx` (lines 302–308)**

Change the sharing block from unconditional to guarded:
```tsx
{!isTemplate && (
  <div className="flex flex-row ml-auto items-center text-xs gap-3">
    {workflow.is_global ? (
      <WorkflowMarketplace uniqueUsersCount={workflow.unique_users_count} />
    ) : (
      <WorkflowShared workflow={workflow} />
    )}
  </div>
)}
```

This suppresses both `WorkflowShared` and `WorkflowMarketplace` on template cards in a single guard. The outer `<div className="flex items-center mt-2 gap-2">` wrapper remains and is not empty — it still contains the "Create Workflow" button when `isTemplate=true`.

### Test Changes

**`AssistantCard.test.tsx`** — add one test case:
- Render `<AssistantCard>` with `isTemplate={true}` and `isShared={true}`
- Assert `queryByRole('status')` returns `null` (sharing label is absent)

**`WorkflowCard.test.tsx`** — add one test case:
- Render `<WorkflowCard>` with `isTemplate={true}` and a workflow that has `shared: true`
- Mock `WorkflowShared` (already mocked via the existing module mock pattern) or query by text
- Assert that neither "Shared with Project" nor "Not shared" text appears

### Regression Guard

`WorkflowsListPage.integration.test.tsx` lines 264 and 278 assert sharing text on non-template workflow cards. These tests require no modification and must stay green after the change.

---

## Acceptance Criteria

1. "Shared with Project" is not displayed on Assistants template cards.
2. "Shared with Project" is not displayed on Workflows template cards.
3. No empty spacing or alignment gap is left after removal.
4. Existing template card actions (Create Workflow, more options, favorite) continue to work.
5. Non-template Assistants and Workflows cards continue to display sharing status unchanged.
