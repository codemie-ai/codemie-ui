# EPMCDME-8420: NavigationMore contextId Consolidation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Re-apply entity-contextual accessible names to five reverted NavigationMore callers and consolidate all callers to one of two explicit patterns (contextId for named entity / data-tooltip-content for action-only menus).

**Architecture:** NavigationMore has a dual aria mode: when `contextId` is passed it emits `aria-labelledby={buttonId + ' ' + contextId}` plus a sr-only "More options" span; without it, it falls back to `aria-label={dataTooltipContent || 'More options'}`. Every caller must be in exactly one of these modes. Callers without an entity name in the DOM use the sr-only synthetic span pattern or `data-tooltip-content`.

**Tech Stack:** React 18, TypeScript, Vitest 1.6.1, React Testing Library, @testing-library/user-event.

## Global Constraints

- All unit and integration tests must pass after each task.
- Do NOT modify `NavigationMore.tsx` logic or props — only the JSDoc addition in Task 14.
- Test-first: every implementation task must have a RED → GREEN cycle before commit.
- Commit convention: `EPMCDME-8420: Capital sentence` (Tekton CI enforces this format).
- `data-tooltip-content` prop is orthogonal to aria mode — it drives react-tooltip; preserve it where it exists.

---

### Task 1: Widen `clickMenuOption` type signature

**Test-first: yes — test that passing a RegExp to `clickMenuOption` finds the button**

**Files:**
- Modify: `src/test-utils/component-interactions/menu.ts`
- Test: `src/test-utils/component-interactions/__tests__/menu.test.ts` (create if not present — confirm existence first with `ls src/test-utils/component-interactions/__tests__/`)

**Note:** The RTL `screen.getByRole('button', { name: value })` already accepts `string | RegExp`. The only change is widening TypeScript's type annotation so callers can pass regex without a TS error.

- [ ] **Step 1: Check for existing test file**

```bash
ls src/test-utils/component-interactions/__tests__/ 2>/dev/null || echo "no tests dir"
```

- [ ] **Step 2: Write the failing test** (in a new or existing test file for the utility)

If no test file exists, create `src/test-utils/component-interactions/__tests__/menu.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'

// This test verifies the TypeScript signature accepts RegExp without a compile error.
// The actual runtime behavior (getByRole accepting RegExp) is RTL's responsibility.
describe('clickMenuOption type signature', () => {
  it('accepts a RegExp as buttonName without TypeScript error', async () => {
    // This test is intentionally a type-level check.
    // If the file compiles, the type is correct.
    const clickMenuOption: (
      buttonName: string | RegExp,
      menuItemName: string
    ) => Promise<void> = vi.fn()
    await clickMenuOption(/^More options( |$)/, 'Delete')
    expect(clickMenuOption).toHaveBeenCalled()
  })
})
```

- [ ] **Step 3: Run test to verify it fails (or passes but type error exists)**

```bash
npx vitest run src/test-utils/component-interactions/__tests__/menu.test.ts 2>&1 | tail -20
```

Expected: If the file doesn't exist yet, compilation fails. If no tests dir exists, the test is "new" so the check is that the existing code rejects `RegExp`.

- [ ] **Step 4: Widen the type in `menu.ts`**

In `src/test-utils/component-interactions/menu.ts`, change the function signature from:

```typescript
export async function clickMenuOption(
  buttonName: string,
  menuItemName: string,
  user?: ReturnType<typeof userEvent.setup>,
  options?: InteractionOptions
): Promise<void> {
```

to:

```typescript
export async function clickMenuOption(
  buttonName: string | RegExp,
  menuItemName: string,
  user?: ReturnType<typeof userEvent.setup>,
  options?: InteractionOptions
): Promise<void> {
```

The body uses `screen.getByRole('button', { name: buttonName })` — no body change needed since RTL already accepts `string | RegExp` for the `name` option.

Also update the JSDoc `@param buttonName` line from `string` to `string | RegExp`.

- [ ] **Step 5: Run test and verify it passes**

```bash
npx vitest run src/test-utils/component-interactions/__tests__/menu.test.ts 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Verify no regressions in existing integration tests**

```bash
npx vitest run --project integration src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx 2>&1 | tail -30
```

Expected: same results as before (some tests may still fail at literal 'More options' — that's OK here; those are fixed in Task 2).

- [ ] **Step 7: Commit**

```bash
git add src/test-utils/component-interactions/menu.ts
git commit -m "EPMCDME-8420: Widen clickMenuOption buttonName to string | RegExp"
```

---

### Task 2: Update integration test literal 'More options' queries

**Test-first: no — these ARE the tests being updated; no wrapper test needed**

**Files:**
- Modify: `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`

**Background:** After Task 3 and 4 re-apply contextId to WorkflowActions and WorkflowsList, the NavigationMore button's computed accessible name becomes "More options <WorkflowName>" — a compound name. The 12 existing test sites that find the button by literal `'More options'` will break. This task updates them proactively (before Tasks 3–4), using the regex pattern `/^More options( |$)/` which matches "More options" alone (current behavior) and "More options <anything>" (new behavior), so the tests remain green throughout the transition.

**DO THIS TASK BEFORE TASKS 3 AND 4**, so the integration tests remain green at every commit.

- [ ] **Step 1: Verify current test state**

```bash
npx vitest run --project integration src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx 2>&1 | grep -E "PASS|FAIL|✓|×" | tail -20
```

- [ ] **Step 2: Update all 11 `clickMenuOption('More options', ...)` calls**

In `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx`, change every:

```typescript
await clickMenuOption('More options', 'View Details', user)
await clickMenuOption('More options', 'Edit', user)
// etc.
```

to:

```typescript
await clickMenuOption(/^More options( |$)/, 'View Details', user)
await clickMenuOption(/^More options( |$)/, 'Edit', user)
// etc.
```

Lines to update (all `clickMenuOption('More options', ...)` callsites): 508, 530, 552, 584, 595, 615, 1621, 1656, 1693, 1727, 1775.

- [ ] **Step 3: Update the 1 direct `screen.getByRole` call at line 1802**

Change:

```typescript
const moreButton = await waitFor(() => screen.getByRole('button', { name: 'More options' }))
```

to:

```typescript
const moreButton = await waitFor(() => screen.getByRole('button', { name: /^More options( |$)/ }))
```

- [ ] **Step 4: Run integration tests and verify they still pass**

```bash
npx vitest run --project integration src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx 2>&1 | tail -30
```

Expected: all tests that passed before still pass. No failures.

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx
git commit -m "EPMCDME-8420: Update WorkflowsListPage integration test queries to regex"
```

---

### Task 3: Re-apply contextId to WorkflowActions

**Test-first: yes — assert aria-labelledby references a span containing workflow.name**

**Files:**
- Modify: `src/pages/workflows/components/WorkflowActions.tsx`
- Test: `src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx` (exists on branch — read it first)

**Note:** `WorkflowActions.test.tsx` mocks NavigationMore entirely so it won't catch this change. The accessibility test file is the right home.

- [ ] **Step 1: Read existing accessibility test**

```bash
cat src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx
```

- [ ] **Step 2: Write failing test in the accessibility test file**

Add to `WorkflowActions.accessibility.test.tsx`:

```typescript
it('More Options button has aria-labelledby referencing the workflow name span', () => {
  // render WorkflowActions with a workflow that has a known name
  render(<WorkflowActions workflow={makeWorkflow({ id: 'wf-1', name: 'My Workflow' })} />)
  const moreBtn = screen.getByRole('button', { name: /^More options My Workflow$/ })
  expect(moreBtn).toBeInTheDocument()
  // aria-labelledby must include the workflow name span's id
  const labelledBy = moreBtn.getAttribute('aria-labelledby')!
  const parts = labelledBy.split(/\s+/)
  expect(parts).toHaveLength(2)
  const nameEl = document.getElementById(parts[1])
  expect(nameEl).toBeInTheDocument()
  expect(nameEl).toHaveTextContent('My Workflow')
})
```

- [ ] **Step 3: Run test to confirm RED**

```bash
npx vitest run src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: FAIL — button found by name "More options" not "More options My Workflow".

- [ ] **Step 4: Apply the contextId change in WorkflowActions.tsx**

In `src/pages/workflows/components/WorkflowActions.tsx`, locate the `return` block (around line 153):

```typescript
  if (actions.length === 0) return null

  return (
    <>
      <NavigationMore hideOnClickInside renderInRoot items={actions} />
```

Change to:

```typescript
  if (actions.length === 0) return null

  const workflowNameId = `workflow-name-${workflow.id}`

  return (
    <>
      <span id={workflowNameId} className="sr-only">{workflow.name}</span>
      <NavigationMore hideOnClickInside renderInRoot items={actions} contextId={workflowNameId} />
```

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Run integration tests to confirm no regressions**

```bash
npx vitest run --project integration src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx 2>&1 | tail -20
```

Expected: PASS (Task 2 already updated the queries to regex).

- [ ] **Step 7: Commit**

```bash
git add src/pages/workflows/components/WorkflowActions.tsx \
        src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Re-apply contextId to WorkflowActions with sr-only name span"
```

---

### Task 4: Re-apply contextId to WorkflowsList navigationSlot

**Test-first: yes — assert button accessible name includes workflow name in list view**

**Files:**
- Modify: `src/pages/workflows/components/WorkflowsList.tsx`
- Test: `src/pages/workflows/components/__tests__/WorkflowsList.test.tsx` (check existence)

**Background:** `WorkflowCard` already has `nameId?: string` prop that sets `id={nameId}` on the workflow name `<div>` (line 215 of WorkflowCard.tsx). Pass `nameId` and `contextId` with the same value to wire them up.

- [ ] **Step 1: Read current WorkflowsList test**

```bash
cat src/pages/workflows/components/__tests__/WorkflowsList.test.tsx
```

- [ ] **Step 2: Write failing test**

Add to `WorkflowsList.test.tsx` (or a new accessibility-focused file):

```typescript
it('NavigationMore button in WorkflowCard has aria-labelledby referencing workflow name', async () => {
  // render WorkflowsList with at least one workflow
  // the WorkflowCard name div gets id="workflow-name-<id>"
  // the NavigationMore button should have aria-labelledby containing that id
  render(<WorkflowsList scope="all" />)
  // wait for workflows to load (mock store should return at least one)
  const moreBtn = await screen.findByRole('button', { name: /^More options/ })
  const labelledBy = moreBtn.getAttribute('aria-labelledby')
  expect(labelledBy).toBeTruthy()
  const parts = labelledBy!.split(/\s+/)
  expect(parts).toHaveLength(2)
  const nameEl = document.getElementById(parts[1])
  expect(nameEl).toBeInTheDocument()
})
```

- [ ] **Step 3: Run test to confirm RED**

```bash
npx vitest run src/pages/workflows/components/__tests__/WorkflowsList.test.tsx 2>&1 | tail -20
```

Expected: FAIL — `aria-labelledby` missing / button found by simple "More options".

- [ ] **Step 4: Apply changes in WorkflowsList.tsx**

In `src/pages/workflows/components/WorkflowsList.tsx`, find the `WorkflowCard` render (around line 287):

```typescript
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onCreateWorkflowChat={!isFavorites ? createWorkflowChat : undefined}
              onStartChat={startChat}
              onViewWorkflow={showWorkflow}
              navigationSlot={
                !isFavorites ? (
                  <NavigationMore
                    hideOnClickInside
                    renderInRoot
                    items={navigationActions(workflow)}
                  />
                ) : undefined
              }
              reloadWorkflows={isFavorites ? handleRefresh : undefined}
            />
```

Change to:

```typescript
            <WorkflowCard
              key={workflow.id}
              workflow={workflow}
              onCreateWorkflowChat={!isFavorites ? createWorkflowChat : undefined}
              onStartChat={startChat}
              onViewWorkflow={showWorkflow}
              nameId={!isFavorites ? `workflow-name-${workflow.id}` : undefined}
              navigationSlot={
                !isFavorites ? (
                  <NavigationMore
                    hideOnClickInside
                    renderInRoot
                    contextId={`workflow-name-${workflow.id}`}
                    items={navigationActions(workflow)}
                  />
                ) : undefined
              }
              reloadWorkflows={isFavorites ? handleRefresh : undefined}
            />
```

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run src/pages/workflows/components/__tests__/WorkflowsList.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/workflows/components/WorkflowsList.tsx \
        src/pages/workflows/components/__tests__/WorkflowsList.test.tsx
git commit -m "EPMCDME-8420: Re-apply contextId to WorkflowsList navigationSlot"
```

---

### Task 5: Re-apply contextId to AssistantActions (self-contained sr-only span)

**Test-first: yes — assert the More Options button references an assistant name span**

**Files:**
- Modify: `src/pages/assistants/AssistantActions/AssistantActions.tsx`
- Test: `src/pages/assistants/AssistantActions/components/__tests__/AssistantMenu.test.tsx` (exists)

**Design:** `AssistantActions` already has `assistant` prop with `assistant.id` and `assistant.name`. Add a sr-only span with `id="assistant-name-${assistant.id}"` before `<AssistantMenu>`, and pass `contextId` to `AssistantMenu`. `AssistantMenu` already wires `contextId` to `NavigationMore`.

- [ ] **Step 1: Read AssistantMenu test to understand existing coverage**

```bash
cat src/pages/assistants/AssistantActions/components/__tests__/AssistantMenu.test.tsx
```

- [ ] **Step 2: Write failing test in AssistantMenu test (or a new AssistantActions.accessibility.test.tsx)**

Create `src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// Minimal stubs
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('valtio', async (orig) => ({ ...(await orig<typeof import('valtio')>()), useSnapshot: () => ({}) }))
vi.mock('@/store/assistants', () => ({ assistantsStore: {} }))
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))

import AssistantActions from '../AssistantActions'

const makeAssistant = (overrides = {}) => ({
  id: 'asst-1',
  name: 'My Assistant',
  type: 'SIMPLE',
  is_global: false,
  created_by: { id: 'u1', name: 'User' },
  ...overrides,
})

describe('AssistantActions accessibility', () => {
  it('More Options button has aria-labelledby referencing the assistant name sr-only span', () => {
    render(<AssistantActions assistant={makeAssistant()} />)
    const moreBtn = screen.getByRole('button', { name: /^More options My Assistant$/ })
    expect(moreBtn).toBeInTheDocument()
    const labelledBy = moreBtn.getAttribute('aria-labelledby')!
    const parts = labelledBy.split(/\s+/)
    expect(parts).toHaveLength(2)
    const nameEl = document.getElementById(parts[1])
    expect(nameEl).toHaveTextContent('My Assistant')
  })
})
```

- [ ] **Step 3: Run test to confirm RED**

```bash
npx vitest run src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx 2>&1 | tail -25
```

Expected: FAIL — element not found with compound name.

- [ ] **Step 4: Apply changes in AssistantActions.tsx**

In `src/pages/assistants/AssistantActions/AssistantActions.tsx`, find the return block (around line 148):

```typescript
  return (
    <>
      <AssistantMenu actions={assistantActions} />
```

Change to:

```typescript
  const assistantNameId = `assistant-name-${assistant.id}`

  return (
    <>
      <span id={assistantNameId} className="sr-only">{assistant.name}</span>
      <AssistantMenu actions={assistantActions} contextId={assistantNameId} />
```

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Run full unit suite to catch regressions**

```bash
npx vitest run src/pages/assistants/ 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/assistants/AssistantActions/AssistantActions.tsx \
        src/pages/assistants/AssistantActions/__tests__/AssistantActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Re-apply contextId to AssistantActions via sr-only name span"
```

---

### Task 6: Re-apply contextId to KataActions

**Test-first: yes — assert button name includes kata title**

**Files:**
- Modify: `src/pages/katas/components/KataActions.tsx`
- Test: create `src/pages/katas/components/__tests__/KataActions.accessibility.test.tsx`

- [ ] **Step 1: Check KataActions props for kata.id and kata.title**

```bash
grep -n "kata\." src/pages/katas/components/KataActions.tsx | grep -E "\.id|\.title" | head -5
```

Expected: confirms `kata.id` and `kata.title` are available.

- [ ] **Step 2: Write failing test**

Create `src/pages/katas/components/__tests__/KataActions.accessibility.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('valtio', async (orig) => ({ ...(await orig<typeof import('valtio')>()), useSnapshot: () => ({}) }))
vi.mock('@/store/katas', () => ({ katasStore: {} }))
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))

import KataActions from '../KataActions'

const makeKata = (overrides = {}) => ({
  id: 'kata-1',
  title: 'My Kata',
  status: 'draft',
  visibility: 'private',
  created_by: { id: 'u1', name: 'User' },
  ...overrides,
})

describe('KataActions accessibility', () => {
  it('More Options button has aria-labelledby referencing the kata title sr-only span', () => {
    render(<KataActions kata={makeKata()} isAdmin />)
    const moreBtn = screen.getByRole('button', { name: /^More options My Kata$/ })
    expect(moreBtn).toBeInTheDocument()
    const labelledBy = moreBtn.getAttribute('aria-labelledby')!
    const parts = labelledBy.split(/\s+/)
    const nameEl = document.getElementById(parts[1])
    expect(nameEl).toHaveTextContent('My Kata')
  })
})
```

- [ ] **Step 3: Run test to confirm RED**

```bash
npx vitest run src/pages/katas/components/__tests__/KataActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: FAIL

- [ ] **Step 4: Apply change in KataActions.tsx**

Find the return block in `src/pages/katas/components/KataActions.tsx` (around line 163):

```typescript
  return (
    <>
      <NavigationMore hideOnClickInside items={kataActions} />
```

Change to:

```typescript
  const kataNameId = `kata-name-${kata.id}`

  return (
    <>
      <span id={kataNameId} className="sr-only">{kata.title}</span>
      <NavigationMore hideOnClickInside items={kataActions} contextId={kataNameId} />
```

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run src/pages/katas/components/__tests__/KataActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/katas/components/KataActions.tsx \
        src/pages/katas/components/__tests__/KataActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Re-apply contextId to KataActions with sr-only name span"
```

---

### Task 7: Apply data-tooltip-content to WorkflowExecutionsListItem (action-only)

**Test-first: yes — assert trigger aria-label equals "Remove execution"**

**Files:**
- Modify: `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutionsListItem.tsx`
- Test: create `src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutionsListItem.accessibility.test.tsx`

**Decision:** No entity name element exists in this component — the menu has only a "Remove" action. Classified as action-only: use `data-tooltip-content="Remove execution"`.

- [ ] **Step 1: Write failing test**

Create `src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutionsListItem.accessibility.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))

import WorkflowExecutionsListItem from '../WorkflowExecutionsListItem'

const makeExecution = (overrides = {}) => ({
  id: 'exec-1',
  name: 'Run 1',
  overall_status: 'succeeded',
  date: '2026-01-01T00:00:00Z',
  update_date: null,
  conversation_id: null,
  ...overrides,
})

describe('WorkflowExecutionsListItem accessibility', () => {
  it('More Options button has aria-label "Remove execution" (action-only pattern)', () => {
    render(
      <WorkflowExecutionsListItem
        execution={makeExecution()}
        isActive={false}
        onRemove={vi.fn()}
        onClick={vi.fn()}
      />
    )
    const moreBtn = screen.getByRole('button', { name: 'Remove execution' })
    expect(moreBtn).toBeInTheDocument()
    expect(moreBtn).toHaveAttribute('aria-label', 'Remove execution')
    expect(moreBtn).not.toHaveAttribute('aria-labelledby')
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

```bash
npx vitest run "src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutionsListItem.accessibility.test.tsx" 2>&1 | tail -20
```

Expected: FAIL — button found only by "More options" not "Remove execution".

- [ ] **Step 3: Apply change in WorkflowExecutionsListItem.tsx**

Find the NavigationMore call (around line 65):

```typescript
      <NavigationMore
        hideOnClickInside
        className="absolute right-1 top-1"
        buttonClassName="hover:bg-surface-base-secondary"
        items={[
```

Add `data-tooltip-content`:

```typescript
      <NavigationMore
        hideOnClickInside
        className="absolute right-1 top-1"
        buttonClassName="hover:bg-surface-base-secondary"
        data-tooltip-content="Remove execution"
        items={[
```

- [ ] **Step 4: Run test to confirm GREEN**

```bash
npx vitest run "src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutionsListItem.accessibility.test.tsx" 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/pages/workflows/details/WorkflowExecutions/WorkflowExecutionsListItem.tsx \
        "src/pages/workflows/details/WorkflowExecutions/__tests__/WorkflowExecutionsListItem.accessibility.test.tsx"
git commit -m "EPMCDME-8420: Add data-tooltip-content to WorkflowExecutionsListItem (action-only)"
```

**Follow-up (discovered post-pipeline):** Changing the accessible name from `"More options"` to `"Remove execution"` broke three query sites in `WorkflowDetailsPage.integration.test.tsx` (lines 221, 465, 508). Updated and committed as `EPMCDME-8420: Update WorkflowDetailsPage integration tests — execution button name is now 'Remove execution'`.

---

### Task 8: Migrate ProviderActions from data-tooltip-content to contextId

**Test-first: yes — assert button aria-labelledby references provider name cell**

**Files:**
- Modify: `src/pages/settings/administration/ProvidersManagementPage.tsx` (add id to name column)
- Modify: `src/pages/settings/administration/components/ProviderActions.tsx` (swap to contextId)
- Test: create `src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx`

**Design:** The `name` column in `ProvidersManagementPage` uses `DefinitionTypes.String` (plain text). Change it to `DefinitionTypes.Custom` and add a `customRenderColumns.name` renderer that wraps the name in `<span id="provider-name-${item.id}">`. Then swap `data-tooltip-content` in `ProviderActions` to `contextId`.

- [ ] **Step 1: Write failing test**

Create `src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))

import ProviderActions from '../ProviderActions'

const makeProvider = (overrides = {}) => ({
  id: 'prov-1',
  name: 'My Provider',
  ...overrides,
})

describe('ProviderActions accessibility', () => {
  it('More Options button has aria-labelledby referencing the provider name element', () => {
    render(
      <div>
        <span id="provider-name-prov-1">My Provider</span>
        <ProviderActions
          provider={makeProvider()}
          onViewDetails={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </div>
    )
    const moreBtn = screen.getByRole('button', { name: 'More options My Provider' })
    expect(moreBtn).toBeInTheDocument()
    expect(moreBtn).not.toHaveAttribute('aria-label')
    const labelledBy = moreBtn.getAttribute('aria-labelledby')!
    const parts = labelledBy.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('My Provider')
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

```bash
npx vitest run src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: FAIL — button found by aria-label "More options for My Provider" not compound name.

- [ ] **Step 3: Update ProviderActions.tsx**

In `src/pages/settings/administration/components/ProviderActions.tsx`, find the const before return:

```typescript
  return (
    <div className="flex justify-end">
      <NavigationMore
        hideOnClickInside
        renderInRoot
        items={menuActions}
        data-tooltip-content={`More options for ${provider.name}`}
      />
```

Change to:

```typescript
  const providerNameId = `provider-name-${provider.id}`

  return (
    <div className="flex justify-end">
      <NavigationMore
        hideOnClickInside
        renderInRoot
        items={menuActions}
        contextId={providerNameId}
      />
```

- [ ] **Step 4: Update ProvidersManagementPage.tsx name column**

In `src/pages/settings/administration/ProvidersManagementPage.tsx`:

Change:

```typescript
const columnDefinitions: ColumnDefinition[] = [
  { key: 'id', label: 'ID', type: DefinitionTypes.String, headClassNames: 'w-[65%]' },
  { key: 'name', label: 'Name', type: DefinitionTypes.String, headClassNames: 'w-[30%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[5%]' },
]
```

to:

```typescript
const columnDefinitions: ColumnDefinition[] = [
  { key: 'id', label: 'ID', type: DefinitionTypes.String, headClassNames: 'w-[65%]' },
  { key: 'name', label: 'Name', type: DefinitionTypes.Custom, headClassNames: 'w-[30%]' },
  { key: 'actions', label: '', type: DefinitionTypes.Custom, headClassNames: 'w-[5%]' },
]
```

Then in the `customRenderColumns` (or `renderActions`) section, add a `name` renderer. Find where `renderActions` is defined and add a sibling renderer in `customRenderColumns`. If `customRenderColumns` doesn't exist yet, add it:

```typescript
  const customRenderColumns = useMemo(
    () => ({
      name: (item: Provider) => (
        <span id={`provider-name-${item.id}`}>{item.name}</span>
      ),
      actions: renderActions,
    }),
    [renderActions]
  )
```

Then pass `customRenderColumns` to the `<Table>` component.

**Note:** Check the existing table render call signature first:

```bash
grep -n "customRenderColumns\|columnDefinitions\|<Table" src/pages/settings/administration/ProvidersManagementPage.tsx | head -15
```

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/ProvidersManagementPage.tsx \
        src/pages/settings/administration/components/ProviderActions.tsx \
        src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Migrate ProviderActions from data-tooltip-content to contextId"
```

---

### Task 9: Migrate DataSourceActions from data-tooltip-content to contextId

**Test-first: yes — assert button references DataSourceName element**

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceName.tsx` (add id to name span)
- Modify: `src/pages/dataSources/components/DataSourceActions.tsx` (swap to contextId)
- Test: create `src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx`

**Design:** `DataSourceName` renders `<span className="font-bold hover:underline cursor-pointer">`. Add `id={`datasource-name-${dataSource.id}`}` to that span. Then `DataSourceActions` references `contextId={`datasource-name-${item.id}`}`.

- [ ] **Step 1: Write failing test**

Create `src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('valtio', async (orig) => ({ ...(await orig<typeof import('valtio')>()), useSnapshot: () => ({}) }))
vi.mock('@/store/dataSources', () => ({ dataSourceStore: {} }))

import DataSourceActions from '../DataSourceActions'

const makeItem = (overrides = {}) => ({
  id: 'ds-1',
  repo_name: 'my-repo',
  full_name: 'org/my-repo',
  index_type: 'git',
  status: 'indexed',
  ...overrides,
})

describe('DataSourceActions accessibility', () => {
  it('More Options button has aria-labelledby referencing the datasource name element', () => {
    render(
      <div>
        <span id="datasource-name-ds-1">my-repo</span>
        <DataSourceActions item={makeItem()} />
      </div>
    )
    const moreBtn = screen.getByRole('button', { name: 'More options my-repo' })
    expect(moreBtn).toBeInTheDocument()
    expect(moreBtn).not.toHaveAttribute('aria-label')
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

```bash
npx vitest run src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx 2>&1 | tail -20
```

- [ ] **Step 3: Update DataSourceName.tsx — add id**

In `src/pages/dataSources/components/DataSourceName.tsx`:

```typescript
  return (
    <span className="font-bold hover:underline cursor-pointer" onClick={handleNavigationToDetails}>
      {dataSource.repo_name}
    </span>
  )
```

Change to:

```typescript
  return (
    <span
      id={`datasource-name-${dataSource.id}`}
      className="font-bold hover:underline cursor-pointer"
      onClick={handleNavigationToDetails}
    >
      {dataSource.repo_name}
    </span>
  )
```

- [ ] **Step 4: Update DataSourceActions.tsx**

In `src/pages/dataSources/components/DataSourceActions.tsx`, find the NavigationMore call (around line 224):

```typescript
        <NavigationMore
          hideOnClickInside
          items={menuActions}
          data-tooltip-content={`More options for ${
            item.repo_name || item.full_name || 'Data source'
          }`}
        ></NavigationMore>
```

Change to:

```typescript
        <NavigationMore
          hideOnClickInside
          items={menuActions}
          contextId={`datasource-name-${item.id}`}
        ></NavigationMore>
```

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/dataSources/components/DataSourceName.tsx \
        src/pages/dataSources/components/DataSourceActions.tsx \
        src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Migrate DataSourceActions from data-tooltip-content to contextId"
```

---

### Task 10: Migrate SkillDetailsActions from data-tooltip-content to contextId

**Test-first: yes — assert button references h1 skill name**

**Files:**
- Modify: `src/pages/skills/components/SkillDetails.tsx` (add id to h1)
- Modify: `src/pages/skills/components/SkillDetailsActions.tsx` (swap to contextId)
- Test: create `src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`

**Design:** `SkillDetails.tsx` line 79 renders `<h1 className="text-2xl font-bold text-text-primary">{skill.name}</h1>`. Add `id={`skill-details-name-${skill.id}`}`. Then `SkillDetailsActions` uses `contextId={`skill-details-name-${skill.id}`}`.

- [ ] **Step 1: Write failing test**

Create `src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('valtio', async (orig) => ({ ...(await orig<typeof import('valtio')>()), useSnapshot: () => ({}) }))
vi.mock('@/store/skills', () => ({ skillsStore: {} }))

import SkillDetailsActions from '../SkillDetailsActions'

const makeSkill = (overrides = {}) => ({
  id: 'skill-1',
  name: 'My Skill',
  visibility: 'private',
  created_by: { id: 'u1', name: 'User' },
  assistants_count: 0,
  ...overrides,
})

describe('SkillDetailsActions accessibility', () => {
  it('More Options button references the skill name element via aria-labelledby', () => {
    render(
      <div>
        <h1 id="skill-details-name-skill-1">My Skill</h1>
        <SkillDetailsActions skill={makeSkill()} />
      </div>
    )
    const moreBtn = screen.getByRole('button', { name: /^More options My Skill$/ })
    expect(moreBtn).toBeInTheDocument()
    expect(moreBtn).not.toHaveAttribute('aria-label')
  })
})
```

- [ ] **Step 2: Run test to confirm RED**

```bash
npx vitest run src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx 2>&1 | tail -20
```

- [ ] **Step 3: Update SkillDetails.tsx — add id to h1**

In `src/pages/skills/components/SkillDetails.tsx`, line ~79:

```typescript
<h1 className="text-2xl font-bold text-text-primary">{skill.name}</h1>
```

Change to:

```typescript
<h1 id={`skill-details-name-${skill.id}`} className="text-2xl font-bold text-text-primary">{skill.name}</h1>
```

- [ ] **Step 4: Update SkillDetailsActions.tsx**

In `src/pages/skills/components/SkillDetailsActions.tsx` around line 148:

```typescript
          <NavigationMore
            hideOnClickInside
            items={visibleMenuActions}
            data-tooltip-content={`More options for ${skill.name}`}
          />
```

Change to:

```typescript
          <NavigationMore
            hideOnClickInside
            items={visibleMenuActions}
            contextId={`skill-details-name-${skill.id}`}
          />
```

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/skills/components/SkillDetails.tsx \
        src/pages/skills/components/SkillDetailsActions.tsx \
        src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Migrate SkillDetailsActions from data-tooltip-content to contextId"
```

---

### Task 11: Migrate MCPServerDetail from data-tooltip-content to contextId

**Test-first: yes — assert button references sr-only server name span**

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerDetail.tsx`
- Test: modify `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerDetail.test.tsx` (exists — read first)

**Design:** `MCPServerDetails` type has no `id` field. Use `useId()` (React 18) to create a stable instance ID. Add `<span id={nameId} className="sr-only">{server.name || 'MCP Server'}</span>` before NavigationMore (inside the `!isUnavailable` branch). Pass `contextId={nameId}` instead of `data-tooltip-content`.

- [ ] **Step 1: Read existing MCPServerDetail test**

```bash
cat src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerDetail.test.tsx
```

- [ ] **Step 2: Write failing test** (add to the existing test file)

```typescript
describe('MCPServerDetail accessibility', () => {
  it('More Options button has aria-labelledby with sr-only server name (useId pattern)', () => {
    render(
      <MCPServerDetail
        server={{ name: 'My MCP Server', description: 'desc' }}
        settingsDefinitions={[]}
        isSelected={false}
        onUpdate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        showNewIntegrationPopup={vi.fn()}
      />
    )
    const moreBtn = screen.getByRole('button', { name: /^More options My MCP Server$/ })
    expect(moreBtn).toBeInTheDocument()
    expect(moreBtn).not.toHaveAttribute('aria-label')
    const labelledBy = moreBtn.getAttribute('aria-labelledby')!
    const parts = labelledBy.split(/\s+/)
    const nameEl = document.getElementById(parts[1])
    expect(nameEl).toHaveTextContent('My MCP Server')
  })
})
```

- [ ] **Step 3: Run test to confirm RED**

```bash
npx vitest run "src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerDetail.test.tsx" 2>&1 | tail -20
```

- [ ] **Step 4: Update MCPServerDetail.tsx**

At the top of the component function, add `useId` import and call:

```typescript
// Add to import: import { useId } from 'react'

const MCPServerDetail = ({ server, ... }) => {
  const nameId = useId()
  // ... rest of the component
```

In the `!isUnavailable` branch where NavigationMore is rendered (around line 65):

```typescript
          {!isUnavailable && (
            <MCPToolkitTestProvider mcpServer={server}>
              <NavigationMore
                renderInRoot
                alignment="end"
                hideOnClickInside
                data-tooltip-content={`More options for ${server.name || 'MCP Server'}`}
                items={menuItems}
              >
                <MCPToolkitTestTrigger inline />
              </NavigationMore>
            </MCPToolkitTestProvider>
          )}
```

Change to:

```typescript
          {!isUnavailable && (
            <MCPToolkitTestProvider mcpServer={server}>
              <span id={nameId} className="sr-only">{server.name || 'MCP Server'}</span>
              <NavigationMore
                renderInRoot
                alignment="end"
                hideOnClickInside
                contextId={nameId}
                items={menuItems}
              >
                <MCPToolkitTestTrigger inline />
              </NavigationMore>
            </MCPToolkitTestProvider>
          )}
```

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run "src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerDetail.test.tsx" 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerDetail.tsx \
        "src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/__tests__/MCPServerDetail.test.tsx"
git commit -m "EPMCDME-8420: Migrate MCPServerDetail from data-tooltip-content to contextId"
```

---

### Task 12: Migrate ProjectSettingActionsCell from data-tooltip-content to contextId

**Test-first: yes — assert button references alias cell span**

**Files:**
- Modify: `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx`
- Test: create `src/pages/integrations/components/ProjectSettings/__tests__/ProjectSettings.accessibility.test.tsx`

**Design:** Mirror the pattern in `UserSettings.tsx`:
1. Add `alias` to `customRenderColumns` with a span carrying `id={`project-setting-name-${item.id}`}`.
2. Replace `data-tooltip-content` in `ProjectSettingActionsCell` with `contextId={`project-setting-name-${item.id}`}`.

**Note:** The `alias` column is already `type: 'custom'` in `IntegrationsTab.tsx` (line 46), so the table will use `customRenderColumns.alias` automatically.

- [ ] **Step 1: Write failing test**

Create `src/pages/integrations/components/ProjectSettings/__tests__/ProjectSettings.accessibility.test.tsx`:

```typescript
import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))

import { ProjectSettingActionsCell } from '../ProjectSettings' // may need to export it

const makeItem = (overrides = {}) => ({
  id: 'ps-1',
  alias: 'my-github',
  credential_type: 'github',
  credential_values: [],
  is_enabled: true,
  ...overrides,
})

describe('ProjectSettingActionsCell accessibility', () => {
  it('More Options button references the alias cell via aria-labelledby', () => {
    render(
      <div>
        <span id="project-setting-name-ps-1">my-github</span>
        <ProjectSettingActionsCell
          item={makeItem()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </div>
    )
    const moreBtn = screen.getByRole('button', { name: 'More options my-github' })
    expect(moreBtn).toBeInTheDocument()
    expect(moreBtn).not.toHaveAttribute('aria-label')
  })
})
```

**Note:** If `ProjectSettingActionsCell` is not exported, export it from the file:
```typescript
export const ProjectSettingActionsCell: FC<ProjectSettingActionsCellProps> = ({ ... }) => { ... }
```

- [ ] **Step 2: Run test to confirm RED**

```bash
npx vitest run "src/pages/integrations/components/ProjectSettings/__tests__/ProjectSettings.accessibility.test.tsx" 2>&1 | tail -20
```

- [ ] **Step 3: Update ProjectSettings.tsx**

In `ProjectSettingActionsCell`, change:

```typescript
      data-tooltip-content={`More options for ${accessibleName}`}
```

to:

```typescript
      contextId={`project-setting-name-${item.id}`}
```

Also remove the `accessibleName` const if it's only used for data-tooltip-content.

In `customTableColumns`, add the alias renderer:

```typescript
  const customTableColumns: TableProps<ProjectSetting>['customRenderColumns'] = {
    project_name: renderProjectNameCell,
    alias: (item) => (
      <span id={`project-setting-name-${item.id}`}>
        {item.alias || item.credential_type || 'Integration'}
      </span>
    ),
    actions: (item) => (
      <ProjectSettingActionsCell
        item={item}
        onEdit={editProjectSetting}
        onDelete={setSettingToDelete}
      />
    ),
    // ... rest unchanged
  }
```

- [ ] **Step 4: Export ProjectSettingActionsCell if needed**

Check if it's exported; if not, add `export` keyword to its declaration.

- [ ] **Step 5: Run test to confirm GREEN**

```bash
npx vitest run "src/pages/integrations/components/ProjectSettings/__tests__/ProjectSettings.accessibility.test.tsx" 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx \
        "src/pages/integrations/components/ProjectSettings/__tests__/ProjectSettings.accessibility.test.tsx"
git commit -m "EPMCDME-8420: Migrate ProjectSettingActionsCell from data-tooltip-content to contextId"
```

---

### Task 13: Add regression test for data-tooltip-content aria-label branch

**Test-first: yes — this IS the test**

**Files:**
- Modify: `src/components/NavigationMore/__tests__/NavigationMore.test.tsx`

- [ ] **Step 1: Read existing test to confirm gap**

```bash
grep -n "data-tooltip-content\|aria-label.*tooltip" src/components/NavigationMore/__tests__/NavigationMore.test.tsx
```

Expected: no match — confirms gap.

- [ ] **Step 2: Add failing test**

In `src/components/NavigationMore/__tests__/NavigationMore.test.tsx`, add to the `'NavigationMore accessibility attributes'` describe block:

```typescript
  it('with data-tooltip-content and no contextId sets aria-label to the tooltip content', () => {
    render(
      <NavigationMore
        data-tooltip-content="Export diagram"
        items={makeItems()}
      />
    )
    const trigger = screen.getByRole('button', { name: 'Export diagram' })
    expect(trigger).toHaveAttribute('aria-label', 'Export diagram')
    expect(trigger).not.toHaveAttribute('aria-labelledby')
  })
```

- [ ] **Step 3: Run test to confirm GREEN** (this branch already works — test just wasn't covered)

```bash
npx vitest run src/components/NavigationMore/__tests__/NavigationMore.test.tsx 2>&1 | tail -20
```

Expected: PASS (the behavior exists; we're adding coverage).

- [ ] **Step 4: Commit**

```bash
git add src/components/NavigationMore/__tests__/NavigationMore.test.tsx
git commit -m "EPMCDME-8420: Add regression test for data-tooltip-content aria-label branch"
```

---

### Task 14: Add JSDoc to NavigationMore

**Test-first: no — documentation change only**

**Files:**
- Modify: `src/components/NavigationMore/NavigationMore.tsx`

- [ ] **Step 1: Add JSDoc above NavigationMoreProps**

In `src/components/NavigationMore/NavigationMore.tsx`, find:

```typescript
interface NavigationMoreProps {
```

Add JSDoc immediately above it:

```typescript
/**
 * Prefer `contextId` when an entity name exists in the DOM; use `data-tooltip-content` for
 * action-only menus with no named entity (e.g. "Export diagram", "Remove execution").
 */
interface NavigationMoreProps {
```

- [ ] **Step 2: Run unit tests to confirm no regressions**

```bash
npx vitest run src/components/NavigationMore/ 2>&1 | tail -20
```

Expected: PASS

- [ ] **Step 3: Commit**

```bash
git add src/components/NavigationMore/NavigationMore.tsx
git commit -m "EPMCDME-8420: Add JSDoc to NavigationMore on contextId vs data-tooltip-content pattern"
```

---

## Self-Review

**Spec coverage:**
- ✅ Task 1: clickMenuOption widened to `string | RegExp`
- ✅ Task 2: 12 integration test sites updated to regex
- ✅ Task 3: WorkflowActions contextId re-applied
- ✅ Task 4: WorkflowsList contextId re-applied
- ✅ Task 5: AssistantActions contextId re-applied (sr-only span)
- ✅ Task 6: KataActions contextId re-applied (sr-only span)
- ✅ Task 7: WorkflowExecutionsListItem — action-only, `data-tooltip-content="Remove execution"` applied; `WorkflowDetailsPage.integration.test.tsx` updated (3 sites) to match the new accessible name (follow-up commit `746472748`)
- ✅ Task 8: ProviderActions migrated contextId
- ✅ Task 9: DataSourceActions migrated contextId
- ✅ Task 10: SkillDetailsActions migrated contextId
- ✅ Task 11: MCPServerDetail migrated contextId (useId + sr-only)
- ✅ Task 12: ProjectSettingActionsCell migrated contextId
- ✅ Task 13: NavigationMore regression test for data-tooltip-content branch
- ✅ Task 14: JSDoc

**Action-only callers kept as-is (not in this plan):** `MermaidDiagram`, `ChatAiMessageActions` — these are correctly labeled per spec; no change needed.

**Type consistency:** `string | RegExp` in Task 1 is used as the `name` option in RTL's `getByRole`, which accepts the same type. No mismatches.

**Placeholder scan:** All steps contain actual code. No TBDs. Task 8 Step 4 has a conditional note ("if customRenderColumns doesn't exist yet") but includes concrete code for both cases.
