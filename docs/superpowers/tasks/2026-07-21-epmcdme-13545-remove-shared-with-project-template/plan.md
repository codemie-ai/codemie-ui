# EPMCDME-13545: Remove "Shared with Project" from Template Cards — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Suppress the "Shared with Project" / "Not shared" sharing label on Assistants and Workflows template cards by guarding at the call site with the existing `isTemplate` prop.

**Architecture:** Both `AssistantCard` and `WorkflowCard` already receive `isTemplate`. The guard is added in each card component — `AssistantCard` passes `null` to `Card`'s `status` prop (which already skips rendering on falsy values), while `WorkflowCard` wraps the sharing `div` with `{!isTemplate && (...)}`. No changes to `StatusLabel`, `WorkflowShared`, `WorkflowMarketplace`, or `Card`.

**Tech Stack:** React 18, TypeScript, Vitest 1.6.1, @testing-library/react 16.3.0

---

### Task 1: Suppress sharing label on AssistantCard template cards (TDD)

**Test-first: yes — renders `<AssistantCard isTemplate={true} isShared={true} />` and asserts `queryByRole('status')` returns null**

**Files:**
- Modify: `src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx`
- Modify: `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx:277`

- [ ] **Step 1: Write the failing test**

Add this test case inside the existing `describe('AssistantCard', ...)` block in `AssistantCard.test.tsx`, after the existing `'renders status label with correct text'` test:

```tsx
it('does not render status label when isTemplate is true', () => {
  render(
    <AssistantCard
      assistant={mockAssistant}
      isTemplate={true}
      isShared={true}
      onViewAssistant={() => {}}
    />
  )
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test:unit -- src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx
```

Expected: FAIL — `queryByRole('status')` finds an element but `not.toBeInTheDocument()` expects it to be absent.

- [ ] **Step 3: Implement the fix in AssistantCard.tsx**

In `src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx`, change line 277 from:

```tsx
        status={renderStatus()}
```

To:

```tsx
        status={isTemplate ? null : renderStatus()}
```

`Card` renders `{status && (...)}`, so passing `null` cleanly suppresses the entire status row with no spacing residue.

- [ ] **Step 4: Run the test to confirm it passes**

```bash
npm run test:unit -- src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx
```

Expected: PASS — all tests including the new one green.

- [ ] **Step 5: Commit**

```bash
git add src/pages/assistants/components/AssistantList/AssistantCard/AssistantCard.tsx \
        src/pages/assistants/components/AssistantList/AssistantCard/__tests__/AssistantCard.test.tsx
git commit -m "EPMCDME-13545: Suppress sharing label on assistant template cards"
```

---

### Task 2: Suppress sharing block on WorkflowCard template cards (TDD)

**Test-first: yes — renders `<WorkflowCard workflow={makeWorkflow({ shared: true })} isTemplate />` and asserts neither "Shared with Project" nor "Not shared" text is in the document**

**Files:**
- Modify: `src/pages/workflows/components/__tests__/WorkflowCard.test.tsx`
- Modify: `src/pages/workflows/components/WorkflowCard.tsx:302-308`

- [ ] **Step 1: Write the failing test**

Add this test case inside the existing `describe('WorkflowCard', ...)` block in `WorkflowCard.test.tsx`, after the existing heading test:

```tsx
it('does not render sharing status when isTemplate is true', () => {
  render(
    <WorkflowCard
      workflow={makeWorkflow({ shared: true })}
      isTemplate
    />
  )
  expect(screen.queryByText('Shared with Project')).not.toBeInTheDocument()
  expect(screen.queryByText('Not shared')).not.toBeInTheDocument()
})
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
npm run test:unit -- src/pages/workflows/components/__tests__/WorkflowCard.test.tsx
```

Expected: FAIL — "Shared with Project" is found in the document even though `isTemplate` is true.

- [ ] **Step 3: Implement the fix in WorkflowCard.tsx**

In `src/pages/workflows/components/WorkflowCard.tsx`, replace lines 302–308 (the unconditional sharing div) with a guarded block:

Before:
```tsx
            <div className="flex flex-row ml-auto items-center text-xs gap-3">
              {workflow.is_global ? (
                <WorkflowMarketplace uniqueUsersCount={workflow.unique_users_count} />
              ) : (
                <WorkflowShared workflow={workflow} />
              )}
            </div>
```

After:
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

This follows the same `{!isTemplate && (...)}` pattern as lines 285–300 (WorkflowActions guard, introduced by EPMCDME-13544). The outer `flex items-center mt-2 gap-2` container is not empty when `isTemplate=true` — it still holds the "Create Workflow" button.

- [ ] **Step 4: Run WorkflowCard unit test to confirm it passes**

```bash
npm run test:unit -- src/pages/workflows/components/__tests__/WorkflowCard.test.tsx
```

Expected: PASS — all tests including the new one green.

- [ ] **Step 5: Run regression integration tests to confirm non-template cards still show sharing**

```bash
npm run test:integration -- src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx
```

Expected: PASS — the existing `'shows Shared with Project text when workflow is shared'` (line 264) and `'shows Not shared text when workflow is not shared'` (line 278) assertions must remain green.

- [ ] **Step 6: Commit**

```bash
git add src/pages/workflows/components/WorkflowCard.tsx \
        src/pages/workflows/components/__tests__/WorkflowCard.test.tsx
git commit -m "EPMCDME-13545: Suppress sharing block on workflow template cards"
```
