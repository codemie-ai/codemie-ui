# Remove cross-file ARIA id magic strings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate cross-file drift risk in 6 `NavigationMore` `contextId`/producer-id pairs by giving each pair a single source of truth — an imported builder function (4 pairs, Table-column-renderer architecture) or `useId()` co-location (2 pairs, single owning component) — while preserving every current DOM id exactly.

**Architecture:** New `src/utils/ariaIds.ts` exports 4 narrowly-named builder functions, one per Table-renderer pair, each preserving today's exact template string. The 2 `useId()` pairs add a new `nameId: string` prop to the consumer component and thread a locally-generated id down from the sole owning caller. No changes to `NavigationMore`'s public API. 4 existing accessibility tests are converted to source their expected id from the builder/prop instead of a hardcoded literal; 1 new accessibility test is added for the previously-uncovered MCPServer pair; 1 new regression test guards the workflow pair's duplicate-DOM-id risk.

**Tech Stack:** React 18, TypeScript, Vitest, React Testing Library.

## Global Constraints

- Exact template strings must not change (no DOM id changes): `datasource-name-${id}`, `provider-name-${id}`, `admin-mcp-name-${id}`, `workflow-name-${id}`, `skill-name-${id}`, `skill-details-name-${id}`.
- No generic `entityNameId(scope, id)` helper — each builder is a named, single-purpose function.
- Do not touch: `NavigationMore.tsx`'s public API, `KataActions.tsx`/`KataDetailView.tsx`, `ProjectSettings.tsx`, `Card.tsx` (its `titleId` prop already exists), `MCPServerCard.tsx`/`MCPServerDetail.tsx` (already correct), the 16 same-file consumers.
- All unit tests, lint, and build must pass after each task.
- Commit convention: `EPMCDME-8420: Capital sentence` (Tekton CI enforces this format).

---

### Task 1: Create the shared ARIA id builder module

**Files:**
- Create: `src/utils/ariaIds.ts`
- Test: `src/utils/__tests__/ariaIds.test.ts`

**Interfaces:**
- Produces: `dataSourceNameId(id: string): string`, `providerNameId(id: string): string`, `mcpServerNameId(id: string): string`, `workflowNameId(id: string): string` — all four consumed by Tasks 2–5.

- [ ] **Step 1: Write the failing test**

Create `src/utils/__tests__/ariaIds.test.ts`:

```typescript
import { describe, it, expect } from 'vitest'

import {
  dataSourceNameId,
  providerNameId,
  mcpServerNameId,
  workflowNameId,
} from '../ariaIds'

describe('ariaIds', () => {
  it('dataSourceNameId builds the datasource heading id', () => {
    expect(dataSourceNameId('ds-1')).toBe('datasource-name-ds-1')
  })

  it('providerNameId builds the provider heading id', () => {
    expect(providerNameId('prov-1')).toBe('provider-name-prov-1')
  })

  it('mcpServerNameId builds the MCP server heading id', () => {
    expect(mcpServerNameId('mcp-1')).toBe('admin-mcp-name-mcp-1')
  })

  it('workflowNameId builds the workflow heading id', () => {
    expect(workflowNameId('wf-1')).toBe('workflow-name-wf-1')
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/utils/__tests__/ariaIds.test.ts`
Expected: FAIL — `Cannot find module '../ariaIds'` (file does not exist yet)

- [ ] **Step 3: Write minimal implementation**

Create `src/utils/ariaIds.ts`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

export const dataSourceNameId = (id: string) => `datasource-name-${id}`
export const providerNameId = (id: string) => `provider-name-${id}`
export const mcpServerNameId = (id: string) => `admin-mcp-name-${id}`
export const workflowNameId = (id: string) => `workflow-name-${id}`
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/utils/__tests__/ariaIds.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/utils/ariaIds.ts src/utils/__tests__/ariaIds.test.ts
git commit -m "EPMCDME-8420: Add shared ARIA id builder module"
```

---

### Task 2: DataSourceActions / DataSourceName — use the shared builder

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceActions.tsx:227`
- Modify: `src/pages/dataSources/components/DataSourceName.tsx:30`
- Test: `src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx`

**Interfaces:**
- Consumes: `dataSourceNameId` from `src/utils/ariaIds.ts` (Task 1)

**Test-first: no** — behavior-preserving refactor with existing coverage; the template string is unchanged (`datasource-name-${id}`), so there is no reachable red state from a value mismatch. Verified by running the test before and after each production edit.

- [ ] **Step 1: Confirm current test passes**

Run: `npx vitest run src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 2: Update the test to source the id from the builder instead of a hardcoded literal**

In `src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx`, add the import and replace the hardcoded span id:

```typescript
import { dataSourceNameId } from '@/utils/ariaIds'
```

Change:

```typescript
        <span id="datasource-name-ds-1">my-repo</span>
```

to:

```typescript
        <span id={dataSourceNameId('ds-1')}>my-repo</span>
```

- [ ] **Step 3: Run test to verify it still passes**

Run: `npx vitest run src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 4: Update DataSourceName.tsx to use the builder**

In `src/pages/dataSources/components/DataSourceName.tsx`, add the import:

```typescript
import { dataSourceNameId } from '@/utils/ariaIds'
```

Change line 30 from:

```typescript
      id={`datasource-name-${dataSource.id}`}
```

to:

```typescript
      id={dataSourceNameId(dataSource.id)}
```

- [ ] **Step 5: Update DataSourceActions.tsx to use the builder**

In `src/pages/dataSources/components/DataSourceActions.tsx`, add the import:

```typescript
import { dataSourceNameId } from '@/utils/ariaIds'
```

Change line 227 from:

```typescript
          contextId={`datasource-name-${item.id}`}
```

to:

```typescript
          contextId={dataSourceNameId(item.id)}
```

- [ ] **Step 6: Run test to verify it still passes**

Run: `npx vitest run src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/dataSources/components/DataSourceActions.tsx src/pages/dataSources/components/DataSourceName.tsx src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Use shared dataSourceNameId builder for DataSourceActions/DataSourceName"
```

---

### Task 3: ProviderActions / ProvidersManagementPage — use the shared builder

**Files:**
- Modify: `src/pages/settings/administration/components/ProviderActions.tsx:74`
- Modify: `src/pages/settings/administration/ProvidersManagementPage.tsx:103`
- Test: `src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx`

**Interfaces:**
- Consumes: `providerNameId` from `src/utils/ariaIds.ts` (Task 1)

**Test-first: no** — behavior-preserving refactor with existing coverage; template string unchanged (`provider-name-${id}`). Verified by running the test before and after each production edit.

- [ ] **Step 1: Confirm current test passes**

Run: `npx vitest run src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 2: Update the test to source the id from the builder**

In `src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx`, add the import:

```typescript
import { providerNameId } from '@/utils/ariaIds'
```

Change:

```typescript
        <span id="provider-name-prov-1">My Provider</span>
```

to:

```typescript
        <span id={providerNameId('prov-1')}>My Provider</span>
```

- [ ] **Step 3: Run test to verify it still passes**

Run: `npx vitest run src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 4: Update ProviderActions.tsx to use the builder**

In `src/pages/settings/administration/components/ProviderActions.tsx`, add the import:

```typescript
import { providerNameId } from '@/utils/ariaIds'
```

Change line 74 from:

```typescript
  const providerNameId = `provider-name-${provider.id}`
```

to:

```typescript
  const contextId = providerNameId(provider.id)
```

Then update the `NavigationMore` usage (currently `contextId={providerNameId}`, around line 82) to `contextId={contextId}`.

- [ ] **Step 5: Update ProvidersManagementPage.tsx to use the builder**

In `src/pages/settings/administration/ProvidersManagementPage.tsx`, add the import:

```typescript
import { providerNameId } from '@/utils/ariaIds'
```

Change line 103 from:

```typescript
      name: (item: Provider) => <span id={`provider-name-${item.id}`}>{item.name}</span>,
```

to:

```typescript
      name: (item: Provider) => <span id={providerNameId(item.id)}>{item.name}</span>,
```

- [ ] **Step 6: Run test to verify it still passes**

Run: `npx vitest run src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/pages/settings/administration/components/ProviderActions.tsx src/pages/settings/administration/ProvidersManagementPage.tsx src/pages/settings/administration/components/__tests__/ProviderActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Use shared providerNameId builder for ProviderActions/ProvidersManagementPage"
```

---

### Task 4: MCPServerActions / columnRenderers — use the shared builder and add coverage

**Files:**
- Modify: `src/pages/settings/administration/components/MCPServerActions.tsx:79`
- Modify: `src/pages/settings/administration/utils/columnRenderers.tsx:34`
- Test: `src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx` (create — no test currently exists for this pair)

**Interfaces:**
- Consumes: `mcpServerNameId` from `src/utils/ariaIds.ts` (Task 1)

**Test-first: yes** — new test file; `MCPServerActions` currently has zero test coverage. Written against current production code first (passes immediately, since it asserts current behavior), establishing the regression safety net before the refactor.

- [ ] **Step 1: Write the new accessibility test against current production code**

Create `src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import MCPServerActions from '../MCPServerActions'
import { mcpServerNameId } from '@/utils/ariaIds'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/utils/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: vi.fn() }))

const makeServer = (overrides: Record<string, unknown> = {}) => ({
  id: 'mcp-1',
  name: 'My MCP Server',
  ...overrides,
})

describe('MCPServerActions accessibility (contextId pattern)', () => {
  it('More Options button references the server name element via aria-labelledby', () => {
    render(
      <div>
        <span id={mcpServerNameId('mcp-1')}>My MCP Server</span>
        <MCPServerActions
          server={makeServer() as any}
          onViewDetails={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </div>
    )
    const btn = screen.getByRole('button', { name: 'More options My MCP Server' })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toHaveAttribute('aria-label')
    const parts = btn.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('My MCP Server')
  })
})
```

- [ ] **Step 2: Run test to verify it passes against current (pre-refactor) production code**

Run: `npx vitest run src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx`
Expected: PASS (production still uses the literal template directly, which matches `mcpServerNameId`'s output)

- [ ] **Step 3: Update MCPServerActions.tsx to use the builder**

In `src/pages/settings/administration/components/MCPServerActions.tsx`, add the import:

```typescript
import { mcpServerNameId } from '@/utils/ariaIds'
```

Change line 79 from:

```typescript
  const serverNameId = `admin-mcp-name-${server.id}`
```

to:

```typescript
  const serverNameId = mcpServerNameId(server.id)
```

- [ ] **Step 4: Update columnRenderers.tsx to use the builder**

In `src/pages/settings/administration/utils/columnRenderers.tsx`, add the import:

```typescript
import { mcpServerNameId } from '@/utils/ariaIds'
```

Change line 34 from:

```typescript
      id={`admin-mcp-name-${item.id}`}
```

to:

```typescript
      id={mcpServerNameId(item.id)}
```

- [ ] **Step 5: Run test to verify it still passes**

Run: `npx vitest run src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/settings/administration/components/MCPServerActions.tsx src/pages/settings/administration/utils/columnRenderers.tsx src/pages/settings/administration/components/__tests__/MCPServerActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Use shared mcpServerNameId builder for MCPServerActions/columnRenderers"
```

---

### Task 5: WorkflowsList / WorkflowActions — use the shared builder and guard against duplicate DOM ids

**Files:**
- Modify: `src/pages/workflows/components/WorkflowsList.tsx:293,299`
- Modify: `src/pages/workflows/components/WorkflowActions.tsx:154`
- Test: `src/pages/workflows/components/__tests__/WorkflowsList.accessibility.test.tsx`
- Test: `src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx` (verify unaffected)
- Test: `src/pages/workflows/components/__tests__/WorkflowCard.duplicateId.test.tsx` (create — new regression test for the duplicate-DOM-id risk)

**Interfaces:**
- Consumes: `workflowNameId` from `src/utils/ariaIds.ts` (Task 1)

**Test-first: no** for the builder swap in `WorkflowsList.tsx`/`WorkflowActions.tsx` (behavior-preserving, template string unchanged). **Test-first: yes** for the new duplicate-id regression test — it asserts a structural invariant (`WorkflowCard`'s default `WorkflowActions` slot and `WorkflowsList`'s custom slot never render the same id together) that has no current automated coverage; it is written to pass against the current mutually-exclusive-by-convention code, locking in the invariant before the builder consolidation makes both paths depend on the same function.

- [ ] **Step 1: Confirm current tests pass**

Run: `npx vitest run src/pages/workflows/components/__tests__/WorkflowsList.accessibility.test.tsx src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 2: Write the new duplicate-DOM-id regression test**

Create `src/pages/workflows/components/__tests__/WorkflowCard.duplicateId.test.tsx`:

```typescript
// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { render } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import WorkflowCard from '../WorkflowCard'
import { workflowNameId } from '@/utils/ariaIds'

vi.mock('@/assets/icons/copy-link.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/publish.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/unpublish.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/workflows', () => ({
  workflowsStore: { deleteWorkflow: vi.fn(), unpublishWorkflowFromMarketplace: vi.fn() },
}))
vi.mock('@/store/chats', () => ({ chatsStore: { createChat: vi.fn(), startNewChat: vi.fn() } }))
vi.mock('@/store/favorites', () => ({ favoritesStore: { addFavorite: vi.fn(), removeFavorite: vi.fn() } }))
vi.mock('@/hooks/useFeatureFlags', () => ({ useFavoritesEnabled: () => [false] }))
vi.mock('@/hooks/useTheme', () => ({ useTheme: () => ({ isDark: false, appearance: { gradients: false } }) }))
vi.mock('@/hooks/useIsTruncated', () => ({ default: () => false }))
vi.mock('valtio', async (orig) => {
  const actual = await orig<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})

const makeWorkflow = (id: string, name: string) => ({
  id,
  slug: `slug-${id}`,
  name,
  user_abilities: ['read', 'update', 'delete'],
  is_global: false,
})

describe('WorkflowCard duplicate DOM id guard', () => {
  it('WorkflowsList-style usage (nameId + custom navigationSlot) renders exactly one element with the shared id', () => {
    const workflow = makeWorkflow('wf-1', 'Alpha Workflow')
    const id = workflowNameId(workflow.id)
    render(
      <WorkflowCard
        workflow={workflow}
        nameId={id}
        navigationSlot={<span id={id} data-testid="custom-slot" />}
      />
    )
    expect(document.querySelectorAll(`#${id}`).length).toBe(1)
  })

  it('default usage (no nameId, no navigationSlot) via WorkflowActions renders exactly one element with the shared id', () => {
    const workflow = makeWorkflow('wf-2', 'Beta Workflow')
    const id = workflowNameId(workflow.id)
    render(<WorkflowCard workflow={workflow} />)
    expect(document.querySelectorAll(`#${id}`).length).toBe(1)
  })
})
```

- [ ] **Step 3: Run the new test to verify it passes against current code**

Run: `npx vitest run src/pages/workflows/components/__tests__/WorkflowCard.duplicateId.test.tsx`
Expected: PASS — the two render paths are mutually exclusive today (custom `navigationSlot` replaces the default `WorkflowActions`, so only one element ever carries the id per render), so this passes before any builder change and continues to guard the invariant afterward.

- [ ] **Step 4: Update the WorkflowsList.accessibility.test.tsx to source the id from the builder**

In `src/pages/workflows/components/__tests__/WorkflowsList.accessibility.test.tsx`, add the import:

```typescript
import { workflowNameId } from '@/utils/ariaIds'
```

Change:

```typescript
    expect(contextId).toBe('workflow-name-wf-1')

    const nameSpan = document.getElementById('workflow-name-wf-1')
```

to:

```typescript
    expect(contextId).toBe(workflowNameId('wf-1'))

    const nameSpan = document.getElementById(workflowNameId('wf-1'))
```

- [ ] **Step 5: Run test to verify it still passes**

Run: `npx vitest run src/pages/workflows/components/__tests__/WorkflowsList.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 6: Update WorkflowsList.tsx to use the builder, hoisted to one variable per row**

In `src/pages/workflows/components/WorkflowsList.tsx`, add the import:

```typescript
import { workflowNameId } from '@/utils/ariaIds'
```

Inside the `activeWorkflows.map((workflow) => (...))` block (starting at line 286), change:

```typescript
          {activeWorkflows.map((workflow) => (
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
          ))}
```

to:

```typescript
          {activeWorkflows.map((workflow) => {
            const nameId = !isFavorites ? workflowNameId(workflow.id) : undefined
            return (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onCreateWorkflowChat={!isFavorites ? createWorkflowChat : undefined}
                onStartChat={startChat}
                onViewWorkflow={showWorkflow}
                nameId={nameId}
                navigationSlot={
                  nameId ? (
                    <NavigationMore
                      hideOnClickInside
                      renderInRoot
                      contextId={nameId}
                      items={navigationActions(workflow)}
                    />
                  ) : undefined
                }
                reloadWorkflows={isFavorites ? handleRefresh : undefined}
              />
            )
          })}
```

(`.map()` switches from an implicit-return arrow to a block body so `nameId` can be computed once per row and reused for both the `nameId` and `contextId` props — this is the same-file consolidation `spec.md` calls for.)

- [ ] **Step 7: Run WorkflowsList test to verify it still passes**

Run: `npx vitest run src/pages/workflows/components/__tests__/WorkflowsList.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 8: Update WorkflowActions.tsx to use the builder**

In `src/pages/workflows/components/WorkflowActions.tsx`, add the import:

```typescript
import { workflowNameId } from '@/utils/ariaIds'
```

Change line 154 from:

```typescript
  const workflowNameId = `workflow-name-${workflow.id}`
```

to:

```typescript
  const nameId = workflowNameId(workflow.id)
```

(Renamed the local variable from `workflowNameId` to `nameId` to avoid shadowing the imported function of the same name.) Update its two usages immediately below — `<span id={workflowNameId} ...>` becomes `<span id={nameId} ...>`, and `contextId={workflowNameId}` becomes `contextId={nameId}`.

- [ ] **Step 9: Run all three tests to verify everything still passes**

Run: `npx vitest run src/pages/workflows/components/__tests__/WorkflowsList.accessibility.test.tsx src/pages/workflows/components/__tests__/WorkflowActions.accessibility.test.tsx src/pages/workflows/components/__tests__/WorkflowCard.duplicateId.test.tsx`
Expected: PASS (all)

- [ ] **Step 10: Commit**

```bash
git add src/pages/workflows/components/WorkflowsList.tsx src/pages/workflows/components/WorkflowActions.tsx src/pages/workflows/components/__tests__/WorkflowsList.accessibility.test.tsx src/pages/workflows/components/__tests__/WorkflowCard.duplicateId.test.tsx
git commit -m "EPMCDME-8420: Use shared workflowNameId builder for WorkflowsList/WorkflowActions"
```

---

### Task 6: SkillActions / SkillCard — useId() co-location

**Files:**
- Modify: `src/pages/skills/components/SkillCard.tsx`
- Modify: `src/pages/skills/components/SkillActions.tsx`

**Interfaces:**
- Produces: `SkillActionsProps.nameId: string` (new required prop) — `SkillCard` is the sole caller (verified), so no other call site needs updating.

**Test-first: no** — behavior-preserving refactor; `SkillActions` and `SkillCard` currently have no accessibility test asserting the exact id string (only production code computes it), so there is no existing test to fail or convert. Verified by running the full skills test suite before and after.

- [ ] **Step 1: Confirm current skills tests pass**

Run: `npx vitest run src/pages/skills/components/__tests__/`
Expected: PASS

- [ ] **Step 2: Add the `nameId` prop to SkillActions.tsx and remove its internal template**

In `src/pages/skills/components/SkillActions.tsx`, change the props interface (around line 45) from:

```typescript
interface SkillActionsProps {
  skill: Skill
  page?: 'list' | 'details'
  onView?: () => void
  onExport?: () => void
  reloadSkills?: () => void
  loadSkill?: () => Promise<void>
}
```

to:

```typescript
interface SkillActionsProps {
  skill: Skill
  nameId: string
  page?: 'list' | 'details'
  onView?: () => void
  onExport?: () => void
  reloadSkills?: () => void
  loadSkill?: () => Promise<void>
}
```

Add `nameId` to the destructured props of the component (around line 54):

```typescript
const SkillActions: React.FC<SkillActionsProps> = ({
  skill,
  nameId,
  page = 'list',
  onView,
  onExport,
  reloadSkills,
  loadSkill,
```

Remove the local template (around line 163):

```typescript
  const skillNameId = `skill-name-${skill.id}`
```

and change the `NavigationMore` usage immediately below from `contextId={skillNameId}` to `contextId={nameId}`.

- [ ] **Step 3: Add `useId()` to SkillCard.tsx and thread it to both Card and SkillActions**

In `src/pages/skills/components/SkillCard.tsx`, change the React import (line 16) from:

```typescript
import React, { useMemo, useState } from 'react'
```

to:

```typescript
import React, { useId, useMemo, useState } from 'react'
```

Inside the `SkillCard` component body, add (near the other hooks, before `renderActions`):

```typescript
  const titleId = useId()
```

Update the `Card` usage's `titleId` prop (currently `titleId={`skill-name-${skill.id}`}` at line 188) to:

```typescript
        titleId={titleId}
```

Update the `<SkillActions>` usage inside `renderActions()` (currently missing a `nameId` prop) to pass it:

```typescript
          <SkillActions
            skill={skill}
            nameId={titleId}
            page="list"
            onView={onView}
            onExport={onExport}
            reloadSkills={reloadSkills}
          />
```

- [ ] **Step 4: Run the skills test suite to verify no regressions**

Run: `npx vitest run src/pages/skills/components/__tests__/`
Expected: PASS

- [ ] **Step 5: Run a project-wide TypeScript check to confirm SkillActions has no other unhandled callers**

Run: `npx tsc --noEmit`
Expected: PASS — `SkillActions` has exactly one call site (`SkillCard.tsx`), already updated in Step 3.

- [ ] **Step 6: Commit**

```bash
git add src/pages/skills/components/SkillCard.tsx src/pages/skills/components/SkillActions.tsx
git commit -m "EPMCDME-8420: Thread useId()-generated nameId from SkillCard into SkillActions"
```

---

### Task 7: SkillDetailsActions / SkillDetails — useId() co-location

**Files:**
- Modify: `src/pages/skills/components/SkillDetails.tsx`
- Modify: `src/pages/skills/components/SkillDetailsActions.tsx`
- Test: `src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`

**Interfaces:**
- Produces: `SkillDetailsActionsProps.nameId: string` (new required prop) — `SkillDetails` is the sole caller (verified), so no other call site needs updating.

**Test-first: no** — behavior-preserving refactor from the assertion's point of view (it still checks that `aria-labelledby` resolves to an element containing the skill name); the id value itself becomes unpredictable (`useId()`), which is exactly why the test must stop hardcoding a specific id string. Verified by running the test before and after each production edit.

- [ ] **Step 1: Confirm current test passes**

Run: `npx vitest run src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 2: Update the test to pass an arbitrary `nameId` prop instead of hardcoding the production template**

In `src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`, change:

```typescript
    render(
      <div>
        <h1 id="skill-details-name-skill-1">My Skill</h1>
        <SkillDetailsActions skill={makeSkill() as any} onExport={vi.fn()} exporting={false} />
      </div>
    )
```

to:

```typescript
    render(
      <div>
        <h1 id="test-name-id">My Skill</h1>
        <SkillDetailsActions
          skill={makeSkill() as any}
          nameId="test-name-id"
          onExport={vi.fn()}
          exporting={false}
        />
      </div>
    )
```

- [ ] **Step 3: Run test to verify it still passes (it will currently fail — nameId is not yet accepted)**

Run: `npx vitest run src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`
Expected: FAIL — `SkillDetailsActions` doesn't accept a `nameId` prop yet and still computes its own `skill-details-name-skill-1`, which no longer matches the test fixture's `test-name-id`. This is the plan's one genuine red state.

- [ ] **Step 4: Add the `nameId` prop to SkillDetailsActions.tsx and remove its internal template**

In `src/pages/skills/components/SkillDetailsActions.tsx`, change the props interface (around line 38) from:

```typescript
interface SkillDetailsActionsProps {
  skill: Skill
  onExport: () => void
  exporting: boolean
  reloadSkill?: () => Promise<void>
}
```

to:

```typescript
interface SkillDetailsActionsProps {
  skill: Skill
  nameId: string
  onExport: () => void
  exporting: boolean
  reloadSkill?: () => Promise<void>
}
```

Add `nameId` to the destructured props (around line 45):

```typescript
const SkillDetailsActions = ({
  skill,
  nameId,
  onExport,
  exporting,
  reloadSkill,
}: SkillDetailsActionsProps) => {
```

Remove the inline template at line 149 (`contextId={`skill-details-name-${skill.id}`}`) and replace with `contextId={nameId}`.

- [ ] **Step 5: Run test to verify it now passes**

Run: `npx vitest run src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 6: Add `useId()` to SkillDetails.tsx and thread it to both the heading and SkillDetailsActions**

In `src/pages/skills/components/SkillDetails.tsx`, change the React import (line 16) from:

```typescript
import { useMemo, useState } from 'react'
```

to:

```typescript
import { useId, useMemo, useState } from 'react'
```

Inside the `SkillDetails` component body (starts at line 41), add near the top:

```typescript
  const nameId = useId()
```

Update the heading (currently `id={`skill-details-name-${skill.id}`}` at line 80) to:

```typescript
              id={nameId}
```

Update the `<SkillDetailsActions>` usage (around line 92) to pass the id:

```typescript
        <SkillDetailsActions
          skill={skill}
          nameId={nameId}
          onExport={onExport}
          exporting={exporting}
          reloadSkill={reloadSkill}
        />
```

- [ ] **Step 7: Run test to verify it still passes**

Run: `npx vitest run src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx`
Expected: PASS

- [ ] **Step 8: Run a project-wide TypeScript check to confirm SkillDetailsActions has no other unhandled callers**

Run: `npx tsc --noEmit`
Expected: PASS — `SkillDetailsActions` has exactly one call site (`SkillDetails.tsx`), already updated in Step 6.

- [ ] **Step 9: Commit**

```bash
git add src/pages/skills/components/SkillDetails.tsx src/pages/skills/components/SkillDetailsActions.tsx src/pages/skills/components/__tests__/SkillDetailsActions.accessibility.test.tsx
git commit -m "EPMCDME-8420: Thread useId()-generated nameId from SkillDetails into SkillDetailsActions"
```

---

### Task 8: Document the cross-component id-sharing decision rule

**Files:**
- Modify: `.ai-run/guides/patterns/accessibility-patterns.md`
- Modify: `.ai-run/guides/development/constants-usage.md`

**Test-first: no** — documentation-only change, no test applies.

- [ ] **Step 1: Read the current accessibility-patterns.md structure**

Run: `grep -n "^#" .ai-run/guides/patterns/accessibility-patterns.md`

Identify where the existing icon-button/ARIA id guidance ends, to append the new section after it rather than in the middle of existing content.

- [ ] **Step 2: Append the cross-component id-sharing section**

Add this section to `.ai-run/guides/patterns/accessibility-patterns.md` (after the existing same-file id example):

```markdown
## Cross-component ARIA id sharing

`NavigationMore`'s `contextId` prop links its icon-only button to a named-entity heading rendered by a *different* element via `aria-labelledby`. When the heading and the menu are NOT in the same file, never write the same id template string independently in both files — a rename in one silently breaks the accessible name with no compile error and no runtime error, only a screen-reader regression. Pick one of these based on structure:

1. **Same file, single instance** — a local `const` computed once and used for both the heading's `id` and the menu's `contextId`, within one file. Sufficient whenever both elements are already rendered by the same component or the same render function. No cross-file risk exists because only one file could ever drift.

2. **One component owns both, or is the sole caller of the consumer, with no `.map()` in the way** — generate the id with `useId()` in the owning component and thread it down as a prop to both the heading and the menu-rendering child. This is the preferred pattern when it's structurally available (see `MCPServerCard.tsx` / `MCPServerDetail.tsx` for the target shape). `useId()` cannot be called inside a `.map()` — if the owning component is a list row, extract the row into its own component first so `useId()` sits at that component's top level, not inside the iteration.

3. **Split across independently-invoked renderers with no shared owning component** — e.g. a Table's `customRenderColumns`, where the "name" column and "actions" column are separate functions called per-row by the Table, with no component that renders both. Restructuring the Table to support row-level `useId()` is out of scope for a simple id-sharing fix. Instead, export a single narrowly-named builder function (e.g. `dataSourceNameId(id: string) => \`datasource-name-${id}\``) from a shared module, imported by both renderers. A rename becomes a compile error, and find-references answers "who depends on this id." Never write a generic `entityNameId(scope: string, id: string)` helper — a free-form string scope just relocates the magic string instead of removing it, and it defeats find-references' usefulness.
```

- [ ] **Step 3: Cross-reference from constants-usage.md**

Add a short pointer to `.ai-run/guides/development/constants-usage.md` (near its existing guidance on shared constant modules):

```markdown
See also: `.ai-run/guides/patterns/accessibility-patterns.md` § Cross-component ARIA id sharing — `src/utils/ariaIds.ts` is a constants-adjacent module of narrowly-named id-builder functions, not a generic keyed lookup.
```

- [ ] **Step 4: Verify the guide changes render correctly**

Run: `grep -n "Cross-component ARIA id sharing" .ai-run/guides/patterns/accessibility-patterns.md .ai-run/guides/development/constants-usage.md`
Expected: One match in each file.

- [ ] **Step 5: Commit**

```bash
git add .ai-run/guides/patterns/accessibility-patterns.md .ai-run/guides/development/constants-usage.md
git commit -m "EPMCDME-8420: Document cross-component ARIA id sharing decision rule"
```

---

## Final verification (after all tasks)

- [ ] Run the full unit test suite: `npx vitest run`
- [ ] Run lint: `npx eslint .`
- [ ] Run the TypeScript build check: `npx tsc --noEmit`
- [ ] Run the production build: `npm run build`
- [ ] Grep for any remaining independent literal templates that should now only exist in `src/utils/ariaIds.ts`:
  ```bash
  grep -rn "datasource-name-\${" src/ --include="*.tsx" --include="*.ts" | grep -v ariaIds.ts
  grep -rn "provider-name-\${" src/ --include="*.tsx" --include="*.ts" | grep -v ariaIds.ts
  grep -rn "admin-mcp-name-\${" src/ --include="*.tsx" --include="*.ts" | grep -v ariaIds.ts
  grep -rn "workflow-name-\${" src/ --include="*.tsx" --include="*.ts" | grep -v ariaIds.ts
  grep -rn "skill-name-\${" src/ --include="*.tsx" --include="*.ts"
  grep -rn "skill-details-name-\${" src/ --include="*.tsx" --include="*.ts"
  ```
  Expected: the first four return no matches outside `ariaIds.ts`/its test; the last two return no matches at all (fully replaced by `useId()`).
