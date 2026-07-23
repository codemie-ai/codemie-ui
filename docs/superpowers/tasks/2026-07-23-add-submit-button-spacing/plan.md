# Submit-Toolbar Spacing Implementation Plan

> **For agentic workers:** This plan is executed inline via sdlc-task Stage 5 (test-driven-development). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add clear vertical spacing between the interactive user-input surface's Submit button and the per-message action toolbar in the CodeMie chat UI.

**Architecture:** Single Tailwind class edit on the `InteractiveSurface` root container (`mb-3`, symmetric with the existing `mt-4`). The shared `ChatAiMessageActions` toolbar is untouched to avoid a global regression.

**Tech Stack:** React + TypeScript + Tailwind CSS, Vitest + React Testing Library.

## Global Constraints

- Do NOT modify `ChatAiMessageActions` or its shared `mt-1` spacing.
- Do NOT change surface internal spacing (`gap-3`) or element rendering.
- Spacing value is `mb-3` (12px), user-approved.
- Branch: `EPMCDME-13673_add-submit-button-spacing`; commit format `EPMCDME-13673: Capital sentence`.

---

### Task 1: Add bottom spacing to the interactive surface root

**Files:**
- Modify: `src/components/InteractiveElements/InteractiveSurface.tsx` (root `div`, ~line 139)
- Test: `src/components/InteractiveElements/__tests__/InteractiveSurface.test.tsx`

**Test-first: yes** — a test asserting the surface root (`data-testid="interactive-surface"`) carries the `mb-3` bottom-margin class, failing until the class is added.

**Interfaces:**
- Consumes: existing `InteractiveSurface` component and its `data-testid="interactive-surface"` root.
- Produces: no API change; a styling-only change to the root container's className.

- [ ] **Step 1: Write the failing test**

Add to `InteractiveSurface.test.tsx` (inside the top-level `describe`):

```tsx
it('separates the surface from the message action toolbar with bottom spacing', () => {
  render(
    <InteractiveSurface
      request={req([
        { type: 'checkbox', id: 'cb1', label: 'Checkbox 1' },
        { type: 'checkbox', id: 'cb2', label: 'Checkbox 2' },
      ])}
      disabled={false}
      submittedResponse={null}
      onSubmit={vi.fn()}
    />
  )
  // The Submit button must not sit flush against the per-message action toolbar
  // (Copy/Edit) rendered directly below the surface — see EPMCDME-13673.
  expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument()
  expect(screen.getByTestId('interactive-surface')).toHaveClass('mb-3')
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/InteractiveElements/__tests__/InteractiveSurface.test.tsx -t "bottom spacing"`
Expected: FAIL — the root element does not have class `mb-3`.

- [ ] **Step 3: Write minimal implementation**

In `src/components/InteractiveElements/InteractiveSurface.tsx`, change the root container className:

```tsx
<div className="mt-4 mb-3 flex flex-col gap-3" data-testid="interactive-surface">
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/InteractiveElements/__tests__/InteractiveSurface.test.tsx`
Expected: PASS — the new test and all existing InteractiveSurface tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/InteractiveElements/InteractiveSurface.tsx \
        src/components/InteractiveElements/__tests__/InteractiveSurface.test.tsx
git commit -m "EPMCDME-13673: Add spacing between Submit button and message action buttons"
```
