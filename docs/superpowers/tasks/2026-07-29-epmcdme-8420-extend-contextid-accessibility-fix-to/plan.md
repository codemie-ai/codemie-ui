# NavigationMore contextId Extension — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire `contextId` (or `data-tooltip-content` fallback) into all 21 remaining `NavigationMore` callers to give every ⁝ button a compound accessible name audible to screen readers.

**Architecture:** Four fix patterns apply per the approved spec. `NavigationMore.tsx` needs no changes — it already supports `contextId`. For action components that already receive the entity object, a visually-hidden `sr-only` span provides the name in the component's own scope without prop-threading through parents (same approach as MCPServerDetail approved in design). For inline `customRenderColumns` table pages, both the name cell renderer and the actions renderer use the entity's stable id to coordinate the id/contextId pair.

**Tech Stack:** React 18 `useId` (already in NavigationMore), Tailwind `sr-only`, vitest + `@testing-library/react`

## Global Constraints

- All ids use format `{entity-type}-name-{entity.id}` where `entity.id` is the stable backend id (UUID or numeric)
- Use a local `const` (e.g. `const assistantNameId = \`assistant-name-${assistant.id}\``) to avoid duplicating template literals in the same scope
- `sr-only` class (Tailwind) for visually hidden name spans
- `contextId` prop on `NavigationMore` is optional — no breaking changes
- No changes to `NavigationMore.tsx`
- No changes to `NavigationMore.test.tsx`, `ChatListItem.test.tsx`, or `FolderList.test.tsx`
- All new tests: `describe` + one `it` asserting full `aria-labelledby` value with `.toBe` (order-sensitive — `.toContain` is insufficient)
- Run tests: `npm run test -- <path-to-test-file>` (vitest)
- Run type check: `npm run typecheck`

---

### Task 1: Sidebar Assistants + Workflows — Inline contextId Fix + Tests

**Files:**
- Modify: `src/pages/chat/components/ChatSidebar/ChatSidebarAssistants.tsx:101-123`
- Modify: `src/pages/chat/components/ChatSidebar/ChatSidebarWorkflows.tsx:73-99`
- Create: `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarAssistants.test.tsx`
- Create: `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarWorkflows.test.tsx`

**Interfaces:**
- Consumes: `assistant.id: string`, `assistant.name: string`; `workflow.id: any`, `workflow.name: string`
- Produces: name spans with stable ids consumable by NavigationMore `contextId`

- [ ] **Step 1: Write failing test for ChatSidebarAssistants**

Use the id prefix `sidebar-assistant-name-` to avoid duplicate ids with `AssistantActions` (Task 2), which uses `assistant-actions-name-`. Both components can be mounted simultaneously: the sidebar persists across all routes including the Assistants page where AssistantGrid renders AssistantActions.

```tsx
// src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarAssistants.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('valtio', () => ({
  useSnapshot: vi.fn(() => ({
    recentAssistants: [{ id: 'asst-1', name: 'Test Assistant', icon_url: null, type: 'EPAM' }],
  })),
}))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/assistants', () => ({
  assistantsStore: { getRecentAssistants: vi.fn() },
  MAX_RECENT_ASSISTANTS: 5,
}))
vi.mock('@/store/chats', () => ({ chatsStore: { startNewChat: vi.fn() } }))

import ChatSidebarAssistants from '../ChatSidebarAssistants'

describe('ChatSidebarAssistants', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('provides compound accessible name for NavigationMore via contextId', () => {
    render(<ChatSidebarAssistants />)
    const nameSpan = screen.getByText('Test Assistant')
    expect(nameSpan).toHaveAttribute('id', 'sidebar-assistant-name-asst-1')
    const moreBtn = screen.getByRole('button', { name: /More Options/i })
    const labelledBy = moreBtn.getAttribute('aria-labelledby') ?? ''
    expect(labelledBy).toContain('sidebar-assistant-name-asst-1')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL** (`npm run test -- ChatSidebarAssistants.test`)

- [ ] **Step 3: Fix ChatSidebarAssistants.tsx**

In the map callback (currently around line 101), add a const and update the span + NavigationMore. Use prefix `sidebar-assistant-name-` to avoid id collisions with AssistantActions (which uses `assistant-actions-name-`):

```tsx
// After:
{recentAssistants.slice(0, MAX_RECENT_ASSISTANTS).map((assistant) => {
  const assistantNameId = `sidebar-assistant-name-${assistant.id}`
  return (
    <div key={assistant.id} className="flex justify-between items-center h-9 px-1.5">
      <button type="button" aria-label={`Start new chat with ${assistant.name}`} onClick={() => createChat(assistant)} className="flex justify-start items-center gap-2 cursor-pointer">
        <Avatar withTooltip type={AvatarType.XS} iconUrl={assistant.icon_url} name={assistant.name} />
        <span id={assistantNameId} className="block w-full truncate text-text-primary text-sm font-normal">
          {truncateName(assistant)}
        </span>
      </button>
      <div className="flex items-center">
        <NavigationMore hideOnClickInside items={getMenuItems(assistant)} contextId={assistantNameId} />
      </div>
    </div>
  )
})}
```

Note: also change `(assistant) => (` to `(assistant) => {` + `return (...)` to introduce the const.

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Write failing test for ChatSidebarWorkflows**

Use prefix `sidebar-workflow-name-` to avoid duplicate ids with `WorkflowActions` (Task 5), which uses `workflow-actions-name-`. The sidebar and WorkflowCard can both be mounted simultaneously on the Workflows page.

```tsx
// src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarWorkflows.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('valtio', () => ({
  useSnapshot: vi.fn(() => ({
    recentWorkflows: [{ id: 42, name: 'Deploy Pipeline', icon_url: null }],
  })),
}))
vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/store/workflows', () => ({
  workflowsStore: { getRecentWorkflows: vi.fn(), updateRecentWorkflows: vi.fn() },
  MAX_RECENT_WORKFLOWS: 5,
}))
vi.mock('@/store/chats', () => ({ chatsStore: { startNewChat: vi.fn() } }))

import ChatSidebarWorkflows from '../ChatSidebarWorkflows'

describe('ChatSidebarWorkflows', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('provides compound accessible name for NavigationMore via contextId', () => {
    render(<ChatSidebarWorkflows />)
    const nameSpan = screen.getByText('Deploy Pipeline')
    expect(nameSpan).toHaveAttribute('id', 'sidebar-workflow-name-42')
    const moreBtn = screen.getByRole('button', { name: /More Options/i })
    const labelledBy = moreBtn.getAttribute('aria-labelledby') ?? ''
    expect(labelledBy).toContain('sidebar-workflow-name-42')
  })
})
```

- [ ] **Step 6: Run test — expect FAIL**

- [ ] **Step 7: Fix ChatSidebarWorkflows.tsx**

In the map callback (line 73), add const and update span + NavigationMore. Use prefix `sidebar-workflow-name-`:

```tsx
{recentWorkflows.slice(0, MAX_RECENT_WORKFLOWS).map((workflow) => {
  const workflowNameId = `sidebar-workflow-name-${workflow.id}`
  return (
    // existing <div key={workflow.id}...>
```

Add `id={workflowNameId}` to the span at line 88:
```tsx
<span
  id={workflowNameId}
  className="block w-full truncate text-text-primary text-sm font-normal"
  title="Start a new conversation with this Workflow"
>
  {truncateName(workflow.name)}
</span>
```

Add `contextId={workflowNameId}` to NavigationMore at line 96.
Close with `)}` → `  )})`.

- [ ] **Step 8: Run test — expect PASS**

- [ ] **Step 9: Type check** (`npm run typecheck`)

- [ ] **Step 10: Commit**

```bash
git add src/pages/chat/components/ChatSidebar/ChatSidebarAssistants.tsx \
        src/pages/chat/components/ChatSidebar/ChatSidebarWorkflows.tsx \
        "src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarAssistants.test.tsx" \
        "src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarWorkflows.test.tsx"
git commit -m "EPMCDME-8420: wire contextId for ChatSidebarAssistants and ChatSidebarWorkflows"
```

---

### Task 2: AssistantMenu — Add contextId Prop + AssistantActions sr-only + Test

**Files:**
- Modify: `src/pages/assistants/AssistantActions/components/AssistantMenu.tsx`
- Modify: `src/pages/assistants/AssistantActions/AssistantActions.tsx:148-151`
- Create: `src/pages/assistants/AssistantActions/components/__tests__/AssistantMenu.test.tsx`

**Interfaces:**
- Consumes: `contextId?: string` (new optional prop on both AssistantMenu and AssistantActions)
- Produces: `aria-labelledby` on NavigationMore trigger button when `contextId` is set

- [ ] **Step 1: Write failing test for AssistantMenu**

```tsx
// src/pages/assistants/AssistantActions/components/__tests__/AssistantMenu.test.tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import AssistantMenu from '../AssistantMenu'

const actions = [
  { id: '1', label: 'View Details', icon: <span />, isVisible: true, onClick: vi.fn() },
]

describe('AssistantMenu', () => {
  it('passes contextId to NavigationMore as aria-labelledby on trigger button', () => {
    render(<AssistantMenu actions={mockActions} contextId="test-context-id" />)
    const triggerButton = screen.getByRole('button', { name: /More options/i })
    const buttonId = triggerButton.getAttribute('id')!
    expect(triggerButton.getAttribute('aria-labelledby')).toBe(`${buttonId} test-context-id`)
  })

  it('renders without contextId without errors', () => {
    render(<AssistantMenu actions={actions} />)
    const btn = screen.getByRole('button')
    expect(btn).not.toHaveAttribute('aria-labelledby')
  })
})
```

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Update AssistantMenu.tsx**

```tsx
// Before:
interface AssistantMenuProps {
  actions: ActionItem[]
}

const AssistantMenu: React.FC<AssistantMenuProps> = ({ actions }) => {
  // ...
  return <NavigationMore hideOnClickInside items={actionItems} />
}

// After:
interface AssistantMenuProps {
  actions: ActionItem[]
  contextId?: string
}

const AssistantMenu: React.FC<AssistantMenuProps> = ({ actions, contextId }) => {
  // ...
  return <NavigationMore hideOnClickInside items={actionItems} contextId={contextId} />
}
```

- [ ] **Step 4: Run test — expect PASS**

- [ ] **Step 5: Update AssistantActions.tsx — add sr-only span + pass contextId**

AssistantActions has `assistant.id` and `assistant.name`. Use prefix `assistant-actions-name-` to avoid clashing with `sidebar-assistant-name-` used in ChatSidebarAssistants (both can be in DOM simultaneously):

```tsx
// Add const inside the component body (before the return):
const assistantNameId = `assistant-actions-name-${assistant.id}`

// In the return, before <AssistantMenu ...:
return (
  <>
    <span id={assistantNameId} className="sr-only">{assistant.name}</span>
    <AssistantMenu actions={assistantActions} contextId={assistantNameId} />
    {/* existing ActionConfirmationModal, PublishToMarketplaceModal ... */}
  </>
)
```

- [ ] **Step 6: Type check** (`npm run typecheck`)

- [ ] **Step 7: Commit**

```bash
git add src/pages/assistants/AssistantActions/components/AssistantMenu.tsx \
        src/pages/assistants/AssistantActions/AssistantActions.tsx \
        "src/pages/assistants/AssistantActions/components/__tests__/AssistantMenu.test.tsx"
git commit -m "EPMCDME-8420: add contextId prop to AssistantMenu, wire sr-only name in AssistantActions"
```

---

### Task 3: KataMenu + KataDetailView — Prop Threading

**Files:**
- Modify: `src/pages/katas/components/KataMenu.tsx`
- Modify: `src/pages/katas/components/KataDetailView.tsx`

**Interfaces:**
- Consumes: `contextId?: string` on KataMenu; kata object in KataDetailView
- Produces: compound accessible name for NavigationMore in kata detail view

- [ ] **Step 1: Read KataDetailView.tsx** — find where `kata.title` is rendered as a visible heading/text element. Add `id={kataNameId}` to that element. Note the kata's type from the store snapshot.

- [ ] **Step 2: Update KataMenu.tsx**

```tsx
// Before:
interface KataMenuProps {
  actions: KataActionItem[]
}
const KataMenu: React.FC<KataMenuProps> = ({ actions }) => {
  // ...
  return <NavigationMore hideOnClickInside items={actionItems} />
}

// After:
interface KataMenuProps {
  actions: KataActionItem[]
  contextId?: string
}
const KataMenu: React.FC<KataMenuProps> = ({ actions, contextId }) => {
  // ...
  return <NavigationMore hideOnClickInside items={actionItems} contextId={contextId} />
}
```

- [ ] **Step 3: Update KataDetailView.tsx**

Based on what you found in Step 1 — example pattern if the kata title is in an `<h1>`:

```tsx
const kataNameId = `kata-name-${kata.id}`

// Add id to the title element:
<h1 id={kataNameId}>{kata.title}</h1>

// Pass contextId to KataMenu:
<KataMenu actions={kataActions} contextId={kataNameId} />
```

Adapt to the actual element and variable names found in Step 1.

- [ ] **Step 4: Type check** (`npm run typecheck`)

- [ ] **Step 5: Commit**

```bash
git add src/pages/katas/components/KataMenu.tsx \
        src/pages/katas/components/KataDetailView.tsx
git commit -m "EPMCDME-8420: add contextId to KataMenu, wire kata title id in KataDetailView"
```

---

### Task 4: KataActions — Self-Contained sr-only Fix

**Files:**
- Modify: `src/pages/katas/components/KataActions.tsx:163-165`

**Interfaces:**
- Consumes: `kata.id: string | number`, `kata.title: string` (already on `kata: AIKataListItem`)
- Produces: sr-only span + contextId so NavigationMore button announces kata title

- [ ] **Step 1: Update KataActions.tsx**

```tsx
// Add const before return:
const kataNameId = `kata-name-${kata.id}`

// In the return, before NavigationMore:
return (
  <>
    <span id={kataNameId} className="sr-only">{kata.title}</span>
    <NavigationMore hideOnClickInside items={kataActions} contextId={kataNameId} />
    <UnpublishKataConfirmation ... />
    <ArchiveKataConfirmation ... />
  </>
)
```

- [ ] **Step 2: Type check** (`npm run typecheck`)

- [ ] **Step 3: Commit**

```bash
git add src/pages/katas/components/KataActions.tsx
git commit -m "EPMCDME-8420: add sr-only name span and contextId to KataActions"
```

---

### Task 5: WorkflowActions — Self-Contained sr-only Fix

**Files:**
- Modify: `src/pages/workflows/components/WorkflowActions.tsx:154-156`

**Interfaces:**
- Consumes: `workflow.id: string | number`, `workflow.name: string` (already on `workflow: Workflow`)
- Produces: sr-only span + contextId on NavigationMore

- [ ] **Step 1: Update WorkflowActions.tsx**

Use prefix `workflow-actions-name-` to avoid duplicate ids with `sidebar-workflow-name-` used in ChatSidebarWorkflows (Task 1):

```tsx
// Add const before return:
const workflowNameId = `workflow-actions-name-${workflow.id}`

// In the return fragment, before NavigationMore at line 156:
return (
  <>
    <span id={workflowNameId} className="sr-only">{workflow.name}</span>
    <NavigationMore hideOnClickInside renderInRoot items={actions} contextId={workflowNameId} />
    <ConfirmationModal ... />  {/* existing modals unchanged */}
  </>
)
```

- [ ] **Step 2: Type check** (`npm run typecheck`)

- [ ] **Step 3: Commit**

```bash
git add src/pages/workflows/components/WorkflowActions.tsx
git commit -m "EPMCDME-8420: add sr-only name span and contextId to WorkflowActions"
```

---

### Task 6: SkillActions — Self-Contained sr-only Fix

**Files:**
- Modify: `src/pages/skills/components/SkillActions.tsx:164-166`

**Interfaces:**
- Consumes: `skill.id: string`, `skill.name: string` (already on `skill: Skill`)
- Produces: sr-only span + contextId on NavigationMore

- [ ] **Step 1: Update SkillActions.tsx**

```tsx
// Add const before the return (after the visibleActions check at line 158):
const skillNameId = `skill-name-${skill.id}`

// In the return, before NavigationMore at line 166:
return (
  <>
    <span id={skillNameId} className="sr-only">{skill.name}</span>
    <NavigationMore hideOnClickInside items={visibleActions} contextId={skillNameId} />
    <ConfirmationModal ... />   {/* existing modals unchanged */}
    <PublishToMarketplaceModal ... />
    <ConfirmationModal ... />
  </>
)
```

- [ ] **Step 2: Type check** (`npm run typecheck`)

- [ ] **Step 3: Commit**

```bash
git add src/pages/skills/components/SkillActions.tsx
git commit -m "EPMCDME-8420: add sr-only name span and contextId to SkillActions"
```

---

### Task 7: MCPServerCard + MCPServerDetail — Card-Based contextId

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerCard.tsx:117-164`
- Modify: `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerDetail.tsx:55-68`

**Interfaces:**
- Consumes: `mcpServer.id`, `mcpServer.name`; `server.id`, `server.name`
- Produces: MCPServerCard wires existing visible h4 as context; MCPServerDetail uses sr-only span (server name not visible inside this component)

- [ ] **Step 1: Update MCPServerCard.tsx**

Add const and id to the `<h4>` at line 119, and `contextId` to NavigationMore at line 146:

```tsx
// In the component body, before the return (or inside JSX using IIFE would be messy — add before return):
const mcpServerCardNameId = `mcp-server-card-name-${mcpServer.id}`

// Line 119 — add id:
<h4 id={mcpServerCardNameId} className="text-sm font-semibold text-text-primary truncate">
  {mcpServer.name}
</h4>

// Line 146 — add contextId:
<NavigationMore
  renderInRoot
  alignment="end"
  hideOnClickInside
  contextId={mcpServerCardNameId}
  items={[...]}
>
```

- [ ] **Step 2: Update MCPServerDetail.tsx**

Add a sr-only span before NavigationMore (server name is not visible in this component):

```tsx
// Add const before the return (component has access to server.id and server.name):
const serverDetailNameId = `mcp-server-detail-name-${server.id}`

// In the JSX, just before NavigationMore at line 64:
{!isUnavailable && (
  <MCPToolkitTestProvider mcpServer={server}>
    <span id={serverDetailNameId} className="sr-only">{server.name}</span>
    <NavigationMore renderInRoot alignment="end" hideOnClickInside items={menuItems} contextId={serverDetailNameId}>
      <MCPToolkitTestTrigger inline />
    </NavigationMore>
  </MCPToolkitTestProvider>
)}
```

- [ ] **Step 3: Type check** (`npm run typecheck`)

- [ ] **Step 4: Commit**

```bash
git add "src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerCard.tsx" \
        "src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerDetail.tsx"
git commit -m "EPMCDME-8420: wire contextId in MCPServerCard and MCPServerDetail"
```

---

### Task 8: ProjectBudgetCard — AssignedCard Variant contextId

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx`

**Interfaces:**
- Consumes: `budget.budget_id` (stable id), `getBudgetCategoryLabel(budget.budget_category)` (visible label text)
- Produces: id on the category label div, contextId on NavigationMore

- [ ] **Step 1: Read `ProjectBudgetCard.tsx` in full** — find the `<div>` around line 173 that renders `getBudgetCategoryLabel(budget.budget_category)` in the AssignedCard variant, and the NavigationMore around line 210.

- [ ] **Step 2: Add const and wire id + contextId**

Example pattern (adapt to what you find in Step 1):

```tsx
// In the AssignedCard variant render path, add const:
const budgetCategoryId = `budget-card-category-${budget.budget_id}`

// Add id to the label element (around line 173):
<div id={budgetCategoryId} className="...existing classes...">
  {getBudgetCategoryLabel(budget.budget_category)}
</div>

// Add contextId to NavigationMore (around line 210):
<NavigationMore ... contextId={budgetCategoryId} />
```

- [ ] **Step 3: Type check** (`npm run typecheck`)

- [ ] **Step 4: Commit**

```bash
git add "src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx"
git commit -m "EPMCDME-8420: wire contextId in ProjectBudgetCard AssignedCard variant"
```

---

### Task 9: DataSourceActions — Self-Contained sr-only Fix

**Files:**
- Modify: `src/pages/dataSources/components/DataSourceActions.tsx`

**Interfaces:**
- Consumes: the DataSource item passed as prop (has `id` and either `repo_name` or `full_name`)
- Produces: sr-only span + contextId on NavigationMore

- [ ] **Step 1: Read `src/pages/dataSources/components/DataSourceActions.tsx`** — identify the props interface and which field is the display name (`repo_name`, `full_name`, or similar). Confirm `id` field name.

- [ ] **Step 2: Add const and sr-only span + contextId**

```tsx
// Example (adapt field names from Step 1):
const datasourceNameId = `datasource-name-${item.id}`

// Before NavigationMore (around line 224):
<span id={datasourceNameId} className="sr-only">{item.repo_name}</span>
<NavigationMore ... contextId={datasourceNameId} />
```

- [ ] **Step 3: Type check** (`npm run typecheck`)

- [ ] **Step 4: Commit**

```bash
git add src/pages/dataSources/components/DataSourceActions.tsx
git commit -m "EPMCDME-8420: add sr-only name span and contextId to DataSourceActions"
```

---

### Task 10: ProviderActions — Self-Contained sr-only Fix

**Files:**
- Modify: `src/pages/settings/administration/components/ProviderActions.tsx:74-76`

**Interfaces:**
- Consumes: `provider.id: string`, `provider.name: string`

- [ ] **Step 1: Update ProviderActions.tsx**

```tsx
// Add const before return (component body already has access to provider):
const providerNameId = `provider-name-${provider.id}`

// In the return, before NavigationMore at line 76:
return (
  <div className="flex justify-end">
    <span id={providerNameId} className="sr-only">{provider.name}</span>
    <NavigationMore hideOnClickInside renderInRoot items={menuActions} contextId={providerNameId} />
    <ConfirmationModal ... />  {/* unchanged */}
  </div>
)
```

- [ ] **Step 2: Type check** (`npm run typecheck`)

- [ ] **Step 3: Commit**

```bash
git add src/pages/settings/administration/components/ProviderActions.tsx
git commit -m "EPMCDME-8420: add sr-only name span and contextId to ProviderActions"
```

---

### Task 11: MCPServerActions — Self-Contained sr-only Fix

**Files:**
- Modify: `src/pages/settings/administration/components/MCPServerActions.tsx:79-81`

**Interfaces:**
- Consumes: `server.id: string`, `server.name: string`

- [ ] **Step 1: Update MCPServerActions.tsx**

```tsx
// Add const before return:
const serverNameId = `admin-mcp-name-${server.id}`

// In the return, before NavigationMore at line 81:
return (
  <div className="flex justify-end">
    <span id={serverNameId} className="sr-only">{server.name}</span>
    <NavigationMore hideOnClickInside renderInRoot items={menuActions} contextId={serverNameId} />
    <ConfirmationModal ... />  {/* unchanged */}
  </div>
)
```

- [ ] **Step 2: Type check** (`npm run typecheck`)

- [ ] **Step 3: Commit**

```bash
git add src/pages/settings/administration/components/MCPServerActions.tsx
git commit -m "EPMCDME-8420: add sr-only name span and contextId to MCPServerActions"
```

---

### Task 12: BudgetsManagementPage — Inline customRenderColumns Fix

**Files:**
- Modify: `src/pages/settings/administration/BudgetsManagementPage.tsx:44-93,191-225`

**Interfaces:**
- Consumes: `item.budget_id` (stable id), `item.name`
- Produces: `name` column becomes a custom renderer with id; actions renderer references same id pattern

Note: two separate renderer callbacks can't share a local `const`. Both use the same template literal `\`budget-mgmt-name-${item.budget_id}\`` directly — the item is the same object so it produces the same id.

- [ ] **Step 1: Change `name` column from String to Custom**

In `columnDefinitions` (around line 51), find:
```tsx
{ key: 'name', label: 'Name', type: DefinitionTypes.String, headClassNames: 'w-[18%]' },
```
Change to:
```tsx
{ key: 'name', label: 'Name', type: DefinitionTypes.Custom, headClassNames: 'w-[18%]' },
```

- [ ] **Step 2: Add name renderer + update actions renderer in customRenderColumns**

In `customRenderColumns` (around line 191), add a `name` renderer and update `actions`:

```tsx
customRenderColumns = useMemo(() => ({
  name: (item: Budget) => (
    <span id={`budget-mgmt-name-${item.budget_id}`}>{item.name}</span>
  ),
  budget_category: (item: Budget) => ( /* unchanged */ ),
  limits: (item: Budget) => ( /* unchanged */ ),
  budget_reset_at: (item: Budget) => ( /* unchanged */ ),
  updated_at: (item: Budget) => ( /* unchanged */ ),
  actions: (item: Budget) =>
    item.is_preconfigured ? null : (
      <div className="flex justify-end">
        <NavigationMore
          hideOnClickInside
          contextId={`budget-mgmt-name-${item.budget_id}`}
          items={[{ title: 'Edit', icon: <EditSvg />, onClick: () => handleEdit(item) }]}
        />
      </div>
    ),
}), [handleEdit])
```

- [ ] **Step 3: Type check** (`npm run typecheck`)

- [ ] **Step 4: Commit**

```bash
git add src/pages/settings/administration/BudgetsManagementPage.tsx
git commit -m "EPMCDME-8420: wire contextId in BudgetsManagementPage customRenderColumns"
```

---

### Task 13: Admin Table Pages — ProjectsManagementFull, CostCenters, Users, Categories

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx`
- Modify: `src/pages/settings/administration/CostCentersManagementPage.tsx`
- Modify: `src/pages/settings/administration/UsersManagementPage.tsx`
- Modify: `src/pages/settings/administration/CategoriesManagementPage.tsx`

**Interfaces:**
- Pattern: same as Task 12 (BudgetsManagementPage). Each file has inline `customRenderColumns` with a name column and an actions column containing NavigationMore directly.

For each file:

- [ ] **Step 1: Read the file** — identify: (a) what key is the stable entity id (`item.id`, `item.category_id`, etc.), (b) what key is the display name (`item.name`, `item.username`, etc.), (c) whether the name column is `DefinitionTypes.String` or already `Custom`.

- [ ] **Step 2: Apply the BudgetsManagementPage pattern**

Using the id prefix from the spec:

| File | id prefix | entity id field | name field |
|---|---|---|---|
| `ProjectsManagementFull.tsx` | `project-name` | `item.id` | `item.name` (via NameLinkCell) |
| `CostCentersManagementPage.tsx` | `cost-center-name` | `item.id` | `item.name` (via NameLinkCell) |
| `UsersManagementPage.tsx` | `user-name` | `item.id` | `item.name \|\| item.username` |
| `CategoriesManagementPage.tsx` | `category-name` | `item.id` or `item.category_id` (verify) | `item.name` |

For each: change the name column to `DefinitionTypes.Custom` if needed, add a name renderer with `id={`{prefix}-${item.{idField}}`}`, and add `contextId={`{prefix}-${item.{idField}}`}` to NavigationMore in the actions renderer.

If the page uses a shared `NameLinkCell` component (ProjectsManagementFull, CostCentersManagementPage), wrap its output: `(item) => <span id={...}><NameLinkCell item={item} /></span>` — or add `id` to the element NameLinkCell renders internally (read NameLinkCell if its internals are simpler).

- [ ] **Step 3: Type check** (`npm run typecheck`)

- [ ] **Step 4: Commit**

```bash
git add "src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx" \
        src/pages/settings/administration/CostCentersManagementPage.tsx \
        src/pages/settings/administration/UsersManagementPage.tsx \
        src/pages/settings/administration/CategoriesManagementPage.tsx
git commit -m "EPMCDME-8420: wire contextId in admin table pages (projects, cost-centers, users, categories)"
```

---

### Task 14: WorkflowExecutionsListItem + MermaidDiagram — data-tooltip-content Fallback

**Files:**
- Modify: `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutionsListItem.tsx:65-80`
- Modify: `src/components/markdown/tokens/MermaidDiagram.tsx:284-289`

**Interfaces:**
- Produces: `aria-label` via NavigationMore fallback (`data-tooltip-content || 'More options'`)

- [ ] **Step 1: Update WorkflowExecutionsListItem.tsx**

Add `data-tooltip-content="Remove execution"` to NavigationMore at line 65:

```tsx
<NavigationMore
  hideOnClickInside
  className="absolute right-1 top-1"
  buttonClassName="hover:bg-surface-base-secondary"
  data-tooltip-content="Remove execution"
  items={[...]}
/>
```

- [ ] **Step 2: Update MermaidDiagram.tsx**

Add `data-tooltip-content="Export diagram"` to NavigationMore at line 284:

```tsx
<NavigationMore
  hideOnClickInside
  items={exportMenuItems}
  buttonClassName="bg-surface-base-primary"
  className="bg-transparent"
  data-tooltip-content="Export diagram"
/>
```

- [ ] **Step 3: Type check** (`npm run typecheck`)

- [ ] **Step 4: Commit**

```bash
git add src/pages/workflows/details/WorkflowExecutions/WorkflowExecutionsListItem.tsx \
        src/components/markdown/tokens/MermaidDiagram.tsx
git commit -m "EPMCDME-8420: add data-tooltip-content to WorkflowExecutionsListItem and MermaidDiagram"
```

---

### Task 15: UserSettings + ProjectSettings — data-tooltip-content with Alias

**Files:**
- Modify: `src/pages/integrations/components/UserSettings/UserSettings.tsx:161-188`
- Modify: `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx:159-195`

**Interfaces:**
- Consumes: `item.alias: string | null | undefined`, `item.credential_type: string`
- Produces: `aria-label={alias || credential_type}` via NavigationMore fallback

Note: these use `childrenFirst` and nest `TestIntegration` as a child. The `data-tooltip-content` prop provides `aria-label` when `contextId` is absent (NavigationMore line 168: `aria-label={dataTooltipContent || 'More options'}`).

- [ ] **Step 1: Update UserSettings.tsx — actions renderer (line 161)**

```tsx
actions: (item) => (
  <NavigationMore
    childrenFirst
    hideOnClickInside
    data-tooltip-content={item.alias || item.credential_type}
    items={[
      { title: 'Edit', onClick: () => editUserSetting(item), icon: <IconEdit /> },
      { title: 'Delete', onClick: () => setSettingToDelete(item), icon: <IconDelete /> },
    ]}
  >
    {getTestableCredentialTypes().includes(item.credential_type.toLocaleLowerCase()) && (
      <TestIntegration ... />
    )}
  </NavigationMore>
),
```

- [ ] **Step 2: Update ProjectSettings.tsx — actions renderer (line 159)**

Same change — add `data-tooltip-content={item.alias || item.credential_type}` to NavigationMore.

- [ ] **Step 3: Type check** (`npm run typecheck`)

- [ ] **Step 4: Commit**

```bash
git add src/pages/integrations/components/UserSettings/UserSettings.tsx \
        src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx
git commit -m "EPMCDME-8420: add data-tooltip-content to UserSettings and ProjectSettings NavigationMore"
```
