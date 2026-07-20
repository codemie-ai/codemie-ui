# Spec: Remove Three-Dots Menu from Workflow Template Cards

**Ticket:** EPMCDME-13544
**Type:** Bug fix
**Complexity:** XS (6/36)

---

## Problem

On the Templates page, `WorkflowCard` renders a three-dots kebab menu (`WorkflowActions`) on template cards. The `navigationSlot ?? <WorkflowActions />` fallback block at lines 280-293 of `WorkflowCard.tsx` has no guard for `isTemplate`, so the menu always appears even though it exposes actions (View Details, Copy Link, Clone) that are not applicable to templates.

## Solution

### Production change — `WorkflowCard.tsx`

Wrap the `navigationSlot ?? <WorkflowActions />` block (lines 280-293) with `{!isTemplate && (...)}`. This follows the identical pattern already used at lines 244-278 of the same file where `isTemplate` gates the primary action buttons.

```tsx
{!isTemplate && (
  <div onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
    {navigationSlot ?? (
      <WorkflowActions
        workflow={workflow}
        onView={() =>
          router.push({ name: VIEW_WORKFLOW, params: { workflowId: String(workflow.id) } })
        }
        reloadWorkflows={reloadWorkflows}
      />
    )}
  </div>
)}
```

`isTemplate` defaults to `false`, so regular workflow cards in `WorkflowsList` are completely unaffected.

### Regression test — `WorkflowTemplatesPagination.integration.test.tsx`

Add one new test using the file's existing `createTemplateFixture`, `mockAPI`, and `renderPage` helpers (no new infrastructure needed). Render the templates page with at least one template, then assert that the kebab-menu trigger button is absent:

```ts
it('does not render the three-dots menu on workflow template cards', async () => {
  mockAPI('GET', 'v1/workflows/prebuilt', [createTemplateFixture()]);
  renderPage('/workflows/templates');
  await waitFor(() => {
    expect(screen.getByText('Workflow Template')).toBeInTheDocument();
  });
  expect(screen.queryByRole('button', { name: /more options/i })).not.toBeInTheDocument();
});
```

The test uses the real `WorkflowCard` (no stubs), so removing the `!isTemplate` guard in the future will immediately cause a failure.

## Acceptance Criteria

- The three-dots menu is not displayed on any workflow template card on the Templates page.
- Users cannot access View Details, Copy Link, or Clone from a template card.
- The Create Workflow button and card layout remain visually unchanged.
- Regular workflow cards in `WorkflowsList` continue to show the three-dots menu (no regression).
- The new integration test fails if the guard is removed.

## Out of Scope

- Changes to `WorkflowActions`, `NavigationMore`, or `WorkflowTemplates`.
- Feature flag gating.
- Visual rework of the card layout.
