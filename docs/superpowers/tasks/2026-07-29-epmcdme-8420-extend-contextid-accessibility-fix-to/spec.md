# Spec: Extend contextId Accessibility Fix to Remaining NavigationMore Callers

**Task**: EPMCDME-8420 (extension)
**Date**: 2026-07-29
**Branch**: EPMCDME-8420_no-accessible-name-for-triple-dots-button

---

## Overview

`NavigationMore` already supports a `contextId` prop that wires up `aria-labelledby` for compound accessible names (implemented for `ChatListItem` and `FolderList` in the original EPMCDME-8420 fix). 21 remaining callers still use only the fallback `aria-label="More options"`. This task wires `contextId` across all remaining callers, giving each ⁝ button a compound accessible name ("More Options [item name], button") audible to screen readers.

No changes to `NavigationMore.tsx` — the component already supports all required patterns.

---

## Fix Patterns

### Pattern 1 — Inline contextId

Applies when the name element and `NavigationMore` are in the same JSX scope.

```tsx
const entityNameId = `entity-name-${entity.id}`
// ...
<span id={entityNameId}>{entity.name}</span>
<NavigationMore contextId={entityNameId} items={...} />
```

Use a local `const` to avoid duplicating the template literal — change the format once, both places update. `useId()` is only needed when there is no stable entity id from the backend; here `entity.id` is always available.

**Callers**: `ChatSidebarAssistants`, `ChatSidebarWorkflows`

---

### Pattern 2 — Prop Threading

Applies when `NavigationMore` is inside a wrapper/action component and the name lives in a parent scope.

Step 1 — Add optional prop to wrapper component:
```tsx
interface ComponentProps {
  contextId?: string
}
```

Step 2 — Thread to NavigationMore inside the wrapper:
```tsx
<NavigationMore contextId={contextId} items={...} />
```

Step 3 — Parent provides both the id on the name element and the contextId prop:
```tsx
// Parent:
const entityNameId = `entity-name-${entity.id}`
// ...
<span id={entityNameId}>{entity.name}</span>
<ActionComponent contextId={entityNameId} ... />
```

**Wrapper components needing a new `contextId` prop**: `AssistantMenu`, `KataMenu`, `WorkflowActions`, `SkillActions`, `KataActions`, `DataSourceActions`, `ProviderActions`, `MCPServerActions`

**Parent callers that must provide `id` on name element and `contextId` prop**: see Caller Enumeration below.

---

### Pattern 3 — Card-Based / Self-Contained

Applies when the name element is in the same component as `NavigationMore` (card layouts).

Same as Pattern 1, but the component owns both the name element and NavigationMore:
```tsx
const serverCardNameId = `mcp-server-card-name-${mcpServer.id}`
// ...
<h4 id={serverCardNameId}>{mcpServer.name}</h4>
<NavigationMore contextId={serverCardNameId} ... />
```

**Special case — MCPServerDetail**: server name is not rendered as a visible element. Add a visually hidden span:
```tsx
const serverDetailNameId = `mcp-server-detail-name-${server.id}`
// ...
<span id={serverDetailNameId} className="sr-only">{server.name}</span>
<NavigationMore contextId={serverDetailNameId} ... />
```

**Callers**: `MCPServerCard`, `MCPServerDetail`, `ProjectBudgetCard`

---

### Pattern 4 — `data-tooltip-content` Fallback

Applies when there is no meaningful text name (action menus on rows with only dates/status, export toolbars, or credential list rows with variable label fields).

```tsx
<NavigationMore data-tooltip-content="Descriptive label" ... />
// → aria-label="Descriptive label" via NavigationMore fallback
```

| Caller | Label |
|---|---|
| `MermaidDiagram` | `"Export diagram"` |
| `WorkflowExecutionsListItem` | `"Remove execution"` |
| `UserSettings` | `{alias \|\| credential_type}` |
| `ProjectSettings` | `{alias \|\| credential_type}` |

---

## Id Naming Convention

Format: `{entity-type}-name-{entity.id}` where `entity.id` is the stable backend id (UUID or numeric). No index-based fallback needed — all entities here have stable ids.

| Caller | Id attribute |
|---|---|
| ChatSidebarAssistants | `assistant-name-${assistant.id}` |
| ChatSidebarWorkflows | `workflow-name-${workflow.id}` |
| MCPServerCard | `mcp-server-card-name-${mcpServer.id}` |
| MCPServerDetail | `mcp-server-detail-name-${server.id}` |
| WorkflowActions parent | `workflow-name-${workflow.id}` |
| SkillActions parent | `skill-name-${skill.id}` |
| KataActions / KataMenu parent | `kata-name-${kata.id}` |
| ProjectBudgetCard | `budget-card-category-${budget.budget_id}` |
| DataSourceActions parent | `datasource-name-${dataSource.id}` |
| BudgetsManagementPage | `budget-mgmt-name-${item.budget_id}` |
| ProviderActions parent | `provider-name-${provider.id}` |
| MCPServerActions parent | `admin-mcp-name-${server.id}` |
| ProjectsManagementFull | `project-name-${item.id}` |
| CostCentersManagementPage | `cost-center-name-${item.id}` |
| UsersManagementPage | `user-name-${item.id}` |
| CategoriesManagementPage | `category-name-${item.id}` |
| AssistantMenu parent (AssistantActions) | `assistant-name-${assistant.id}` |

---

## Caller Enumeration (All Groups)

### Group A — Already Fixed (no changes)

| File | NavigationMore line | Id on name element |
|---|---|---|
| `ChatListItem.tsx` | 120 | `chat-name-${chat.id}` on `<button>` line 105 |
| `FolderList.tsx` | 147 | `folder-name-${folderKey}` (index-based) on `<p>` line 138 |

### Group B — Skip / data-tooltip-content only

| File | NavigationMore line | Action |
|---|---|---|
| `MermaidDiagram.tsx` | 284 | Add `data-tooltip-content="Export diagram"` |
| `ChatAiMessageActions.tsx` | 112 | No change (already uses `data-tooltip-content="Export message"`) |

### Group C — Inline JSX fix (Pattern 1)

| File | NavigationMore line | Name element line | Name prop |
|---|---|---|---|
| `ChatSidebarAssistants.tsx` | 121 | 115 | `assistant.name` |
| `ChatSidebarWorkflows.tsx` | 96 | 87 | `workflow.name` |

### Group D — Wrapper Components (Pattern 2)

| Wrapper file | NavigationMore line | Parent that provides contextId |
|---|---|---|
| `AssistantMenu.tsx` | 47 | `AssistantActions` (parent) |
| `KataMenu.tsx` | 49 | All KataMenu callers (audit required) |
| `WorkflowActions.tsx` | 156 | WorkflowCard / WorkflowsList parent |
| `SkillActions.tsx` | 166 | SkillCard / SkillsList parent |
| `KataActions.tsx` | 165 | Kata card parent |
| `DataSourceActions.tsx` | 224 | DataSources table (customRenderColumns) |
| `ProviderActions.tsx` | 76 | Admin providers table (customRenderColumns) |
| `MCPServerActions.tsx` | 81 | Admin MCP table (customRenderColumns) |

### Group E — Card-Based (Pattern 3)

| File | NavigationMore line | Name element | Special |
|---|---|---|---|
| `MCPServerCard.tsx` | 146 | `<h4>` line 119 | — |
| `MCPServerDetail.tsx` | 64 | sr-only span (new) | server name not rendered visibly |
| `ProjectBudgetCard.tsx` | 210 | `<div>` line 173 | label = `getBudgetCategoryLabel(budget.budget_category)` |
| `WorkflowExecutionsListItem.tsx` | 65 | none | data-tooltip-content fallback |

### Group F — Table Admin Pages (Pattern 2 via customRenderColumns)

| Page file | NavigationMore via | Name field | Id pattern |
|---|---|---|---|
| `BudgetsManagementPage.tsx` | inline (no wrapper) | `item.name` | `budget-mgmt-name-${item.budget_id}` |
| `ProjectsManagementFull.tsx` | inline (NameLinkCell) | `item.name` | `project-name-${item.id}` |
| `CostCentersManagementPage.tsx` | inline (NameLinkCell) | `item.name` | `cost-center-name-${item.id}` |
| `UsersManagementPage.tsx` | inline | `item.name \|\| item.username` | `user-name-${item.id}` |
| `CategoriesManagementPage.tsx` | inline | `item.name` | `category-name-${item.id}` (verify: `item.id` vs `item.category_id` — read file before wiring) |

### Group G — Integration Settings (Pattern 4 fallback)

| File | NavigationMore line | Label expression |
|---|---|---|
| `UserSettings.tsx` | 162 | `alias \|\| credential_type` |
| `ProjectSettings.tsx` | 160 | `alias \|\| credential_type` |

---

## Testing

Three new test files:

1. `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarAssistants.test.tsx`
   - Renders with mock assistant, asserts name span has correct `id`, asserts `NavigationMore` button has `aria-labelledby` referencing both buttonId and the span id

2. `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarWorkflows.test.tsx`
   - Same structure for workflow name span

3. `src/pages/assistants/AssistantActions/components/__tests__/AssistantMenu.test.tsx`
   - Renders `AssistantMenu` with `contextId` prop, asserts `NavigationMore` button `aria-labelledby` equals `"${buttonId} ${contextId}"` (order-sensitive `.toBe`, not `.toContain`)

No other new test files. Existing `NavigationMore.test.tsx`, `ChatListItem.test.tsx`, and `FolderList.test.tsx` require no changes.

---

## Out of Scope

- No API, store, routing, or build changes
- No accessibility guide added to `.ai-run/guides/` (tracked separately)

> **Post-completion note:** `NavigationMore.tsx` was updated after the initial review (CR fix): `aria-label` is now cleared when `contextId` is provided, so the self-reference token in `aria-labelledby` resolves via the `sr-only` span's subtree text rather than the `aria-label` value. `NavigationMore.test.tsx` was updated accordingly (new assertion: `expect(trigger).not.toHaveAttribute('aria-label')`; casing corrected: `'More options'`).
