# Technical Research

**Task**: accessibility aria NavigationMore contextId
**Generated**: 2026-07-29T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-8420: extend contextId accessibility fix to remaining NavigationMore callers outside the chat sidebar. The NavigationMore component already has a contextId prop that wires up aria-labelledby for compound accessible names. This was implemented for ChatListItem and FolderList in the chat sidebar. All other callers (~26) still lack contextId and thus have only the fallback aria-label='More options'. The goal is to identify each remaining caller, determine the correct context element (the element whose text provides the accessible name for the ⁝ button), add an id to that element, and pass contextId to NavigationMore. The existing implementation in NavigationMore.tsx, ChatListItem.tsx, and FolderList.tsx should serve as the reference pattern.

---

## 2. Codebase Findings

### Existing Implementations

**NavigationMore component (hub)**
- `src/components/NavigationMore/NavigationMore.tsx` — accepts optional `contextId?: string`; when set, renders `aria-labelledby="{buttonId} {contextId}"` and a visually-hidden `<span className="sr-only">More Options</span>` inside the trigger button. Without it, falls back to `aria-label={dataTooltipContent || 'More options'}`. 23 callers total at last blast-radius count.

**Reference implementations (already fixed)**
- `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx` — id `chat-name-${chat.id}` on `<button>` at line 105; `contextId` passed to `<NavigationMore>` at line 120.
- `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx` — id `folder-name-${folderKey}` (index-based) on `<p>` at line 138; `contextId` passed to `<NavigationMore>` at line 147. Index-based key avoids duplicate-id collision when folder names repeat.

### Architecture and Layers Affected

- **UI Component layer**: `NavigationMore` itself (no change needed)
- **Feature component layer**: 21 caller components across chat, assistants, workflows, skills, katas, data sources, integrations, and admin settings
- **Shared wrapper components**: `AssistantMenu`, `KataMenu` — need `contextId?: string` prop added and threaded
- **Standalone action components**: `WorkflowActions`, `SkillActions`, `KataActions`, `DataSourceActions`, `ProviderActions`, `MCPServerActions` — need `contextId?: string` prop added and threaded from their parent callers
- **Table admin pages** (8 files): `customRenderColumns` pattern where name cell and actions cell are separate renderer callbacks receiving the same row data object

### Integration Points

**Internal module dependencies:**
- All 21 caller files → `NavigationMore` (import and render)
- `AssistantMenu` ← `AssistantActions` (parent must add contextId)
- `KataMenu` ← callers of KataMenu (audit required)
- `WorkflowActions` ← `WorkflowCard` or equivalent (parent must add contextId)
- `SkillActions` ← `SkillCard` or equivalent
- `KataActions` ← kata card parent
- `DataSourceActions`, `ProviderActions`, `MCPServerActions` ← parent admin pages via `customRenderColumns`

**No external service or backend changes** — purely frontend DOM/ARIA attribute work.

### Patterns and Conventions

**The `contextId` pattern** (from reference implementations):
```tsx
// 1. On the visible name element — add id:
<span id={`entity-name-${entity.id}`}>{entity.name}</span>

// 2. On NavigationMore in the same or connected scope:
<NavigationMore
  contextId={`entity-name-${entity.id}`}
  items={menuItems}
/>
```

**Wrapper component threading pattern** (for AssistantMenu, KataMenu, action components):
```tsx
// Add to props interface:
interface ComponentProps {
  contextId?: string   // new
}
// Thread through:
<NavigationMore ... contextId={contextId} />
// Parent provides both id on name element and contextId prop
```

**Table `customRenderColumns` pattern** (for admin pages):
```tsx
customRenderColumns: {
  name: (item) => <span id={`entity-name-${item.id}`}>{item.name}</span>,
  actions: (item) => <NavigationMore contextId={`entity-name-${item.id}`} items={...} />
}
// Both renderers receive same item; item.id is available in both scopes
```

**Fallback pattern** (for items with no text name, e.g. WorkflowExecutionsListItem, MermaidDiagram):
```tsx
<NavigationMore data-tooltip-content="Remove execution" ... />
// → aria-label="Remove execution" via NavigationMore line 168 fallback
```

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/` exists in the project but no specific accessibility or aria guide was identified. General project guides cover layered architecture, testing patterns, and quality gates — none are specific to ARIA/accessibility conventions.

### Architectural Decisions

- The `contextId` prop was introduced as the chosen mechanism for compound accessible names (aria-labelledby combining the button's own id with the context element's id). This decision is encoded in `NavigationMore.tsx` lines 54, 169, 176. The pattern uses `useId()` for stable button id generation.
- Index-based id keys (`folder-name-${folderKey}` where folderKey is the map index) are the established pattern when names may not be unique, established by the FolderList fix.

### Derived Conventions

- Id naming: `{entity-type}-name-{entity.id}` (e.g. `chat-name-42`, `assistant-name-abc`)
- For index-based fallback: `{entity-type}-name-{index}`
- All ids must be unique within the document; use stable entity ids (UUID or numeric) when available
- `contextId` is optional in `NavigationMoreProps` — no breaking change to add it

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` — unit tests for NavigationMore component (contextId/aria-labelledby behavior should be verified here; confirm test covers `contextId` prop)
- `src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx` — tests for ChatListItem reference implementation (verifies contextId wiring)
- `src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderList.test.tsx` — tests for FolderList reference implementation
- Two untracked duplicate test files with spaces in names (`ChatListItem.test 2.tsx`, `FolderList.test 2.tsx`) — likely agent artifacts, do not commit

### Testing Framework and Patterns

- Vitest + React Testing Library (per project quality-gates guide)
- Tests for the reference implementation exist and can serve as templates for new caller tests
- Pattern: render component, query button by role, assert `aria-labelledby` attribute and referenced element id

### Coverage Gaps

- **21 callers have no existing accessibility tests** for the contextId wiring
- No tests for `AssistantMenu`, `KataMenu` contextId threading
- No tests for the `customRenderColumns` table pattern (admin pages)
- `WorkflowExecutionsListItem` — no test for `data-tooltip-content` fallback approach
- `MermaidDiagram` — no accessibility test for the NavigationMore it renders

---

## 5. Configuration and Environment

### Environment Variables

None relevant — this is a pure UI/ARIA change with no environment-variable dependencies.

### Configuration Files

No config changes required.

### Feature Flags and Deployment Concerns

No feature flags involved. Change is additive (adding `id` attributes and `contextId` props) — no risk of breaking existing functionality. `contextId` is optional throughout.

---

## 6. Risk Indicators

- **No accessibility tests for 21 callers** — the fix must be manually verified or new tests added; regression risk if contextId values are mismatched between name element and NavigationMore prop
- **Wrapper component prop-threading required** for 5 action components (`AssistantMenu`, `KataMenu`, `WorkflowActions`, `SkillActions`, `KataActions`) and 3 admin action components (`DataSourceActions`, `ProviderActions`, `MCPServerActions`) — each requires a 2-file change (wrapper + parent), increasing the blast radius
- **KataMenu caller audit incomplete** — KataMenu is used in at least one detail view and potentially multiple places; all callers must be audited to pass the new `contextId` prop
- **`customRenderColumns` id coordination** — for the 8 table admin pages, the id set on the name column renderer and the contextId passed in the actions column renderer must use the same entity id field; if the entity id field differs across pages (`.id` vs `.budget_id` vs `.category_id`) the pattern must be applied per-page
- **`MCPServerDetail.tsx`** — server name is NOT rendered inside this component; requires either adding a `contextId?: string` prop threaded from the parent (`MCPServerCard`) or adding a visually-hidden `<span>` with the server name — the cleaner solution depends on how the parent renders both the name and the detail panel
- **`ProjectBudgetCard.tsx` `AssignedCard`** — uses `budget.budget_id` as the unique identifier; must verify `budget_id` is always non-null to avoid id collisions with `undefined`
- **`WorkflowExecutionsListItem`** — no text name for the execution; must use `data-tooltip-content` fallback rather than contextId; must confirm only one menu item exists ("Remove") to ensure the label is accurate
- **`UserSettings.tsx` and `ProjectSettings.tsx`** — use `childrenFirst` to nest `TestIntegration` as a child inside NavigationMore; no single stable name field; best fix is `data-tooltip-content={alias || credential_type}` on NavigationMore, but the displayed label field must be confirmed by reading the table column definitions
- **`MermaidDiagram.tsx`** — NavigationMore provides diagram-level export options, not a per-item context menu; no item name exists; add `data-tooltip-content="Export diagram"` (or equivalent) to provide a meaningful `aria-label` via the fallback
- **Duplicate id risk** — all id values must be unique per page; entity.id (UUID or numeric) is sufficient for list/table items; index-based fallback needed only when entity lacks a stable id (established FolderList precedent)
- **23 callers per blast-radius count vs ~26 mentioned in ticket** — final count after this research is 25 mapped callers (2 fixed + 2 skip + 21 to fix); discrepancy with ticket estimate is within normal range

---

## 7. Summary for Complexity Assessment

This task is a systematic accessibility wiring pass across 21 remaining callers of `NavigationMore`, each needing one of four fix patterns: inline contextId (2 sidebar cards), prop threading (8 action/wrapper components), `customRenderColumns` id coordination (8 table admin pages), or `data-tooltip-content` fallback (3 special cases). The component-layer change is zero — `NavigationMore.tsx` already supports `contextId`. Every change is additive (new `id` attrs + new optional prop) with no behavior modification to existing code.

The file change surface is large: approximately 30–35 files touched (21 caller files, 8 action/wrapper components needing a new prop, and their parent callers). The pattern is highly mechanical once established — the same 2-line fix (id on name element + contextId on NavigationMore) repeats per caller — but the 8 action components that require prop threading each span 2 files, and the 8 table admin pages each require careful coordination of the entity id field across two separate column renderer functions. The KataMenu component needs a caller audit to ensure all its usage sites also thread contextId.

Test coverage for this change is a gap: no existing tests cover contextId wiring in any of the 21 callers. The reference test files for ChatListItem and FolderList exist and can be used as templates. Whether new tests are required per caller or a single integration-level accessibility audit suffices is a scoping decision. The risk profile is low-to-medium: no logic changes, no state changes, no API changes — but the number of files and the coordination requirement for table pages and wrapper components means the overall effort is larger than the mechanical simplicity of each individual fix suggests.

---

## Caller Enumeration (Complete)

### Group A — Already Fixed (reference; no changes needed)

| # | File | NavigationMore line | Context element | Context element line | Has id? | Name prop |
|---|------|--------------------|-----------------|--------------------|---------|-----------|
| 1 | `src/pages/chat/components/ChatSidebar/ChatList/ChatListItem.tsx` | 120 | `<button>` | 105 | YES — `chat-name-${chat.id}` | `chat.name` |
| 2 | `src/pages/chat/components/ChatSidebar/FolderList/FolderList.tsx` | 147 | `<p>` | 138 | YES — `folder-name-${folderKey}` (index) | folder name string |

### Group B — Skip / Use data-tooltip-content Fallback

| # | File | NavigationMore line | Reason | Recommended fix |
|---|------|--------------------|---------|----|
| 3 | `src/components/markdown/tokens/MermaidDiagram.tsx` | 284 | Diagram-level export toolbar; no per-item name | Add `data-tooltip-content="Export diagram"` |
| 4 | `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessageActions.tsx` | 112 | Export action, not per-item context menu; already uses `customIcon` and `data-tooltip-content="Export message"` | No change needed |

### Group C — Inline JSX Fix (name element and NavigationMore in same scope)

| # | File | NavigationMore line | Context element | Context line | Name prop | Fix |
|---|------|--------------------|-----------------|--------------|-----------|----|
| 5 | `src/pages/chat/components/ChatSidebar/ChatSidebarAssistants.tsx` | 121 | `<span>` with `truncateName(assistant)` | 115 | `assistant.name` | Add `id={`assistant-name-${assistant.id}`}` to span; `contextId` to NavigationMore |
| 6 | `src/pages/chat/components/ChatSidebar/ChatSidebarWorkflows.tsx` | 96 | `<span>` with `truncateName(workflow.name)` | 87 | `workflow.name` | Add `id={`workflow-name-${workflow.id}`}` to span; `contextId` to NavigationMore |

### Group D — Wrapper Components (add `contextId?: string` prop, thread from parent)

| # | File | NavigationMore line | Name prop location | Parent |
|---|------|--------------------|--------------------|--------|
| 7 | `src/pages/assistants/AssistantActions/components/AssistantMenu.tsx` | 47 | `assistant.name` in parent AssistantActions | `AssistantActions` |
| 8 | `src/pages/katas/components/KataMenu.tsx` | 49 | `kata.title` in callers | audit all KataMenu callers |

### Group E — Card-Based Pages (name in same or parent component)

| # | File | NavigationMore line | Context element | Name prop | Special |
|---|------|--------------------|-----------------|-----------|----|
| 9 | `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerCard.tsx` | 146 | `<h4>` at line 119 | `mcpServer.name` | id: `mcp-server-card-name-${mcpServer.id}` |
| 10 | `src/pages/assistants/components/AssistantForm/components/Toolkits/MCPToolkit/MCPServerDetail.tsx` | 64 | Name not rendered inside component | `mcpServer.name` | Add sr-only span or thread `contextId` from parent MCPServerCard |
| 11 | `src/pages/workflows/components/WorkflowActions.tsx` | 156 | Name in parent WorkflowCard | `workflow.name` | Add `contextId?: string` prop; id on name in WorkflowCard |
| 12 | `src/pages/skills/components/SkillActions.tsx` | 166 | Name in parent SkillCard | `skill.name` | Add `contextId?: string` prop; id on name in SkillCard |
| 13 | `src/pages/katas/components/KataActions.tsx` | 165 | Name in kata card parent | `kata.title` | Add `contextId?: string` prop; id on title in parent card |
| 14 | `src/pages/settings/administration/projectsManagement/components/ProjectBudgetCard.tsx` (AssignedCard) | 210 | `<div>` at line 173 with `getBudgetCategoryLabel(budget.budget_category)` | `budget.budget_category` | id: `budget-card-category-${budget.budget_id}`; verify budget_id non-null |
| 15 | `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutionsListItem.tsx` | 65 | No text name (shows status + timestamps only) | N/A | Use `data-tooltip-content="Remove execution"` fallback |

### Group F — Table Admin Pages (customRenderColumns pattern)

| # | File | NavigationMore line | Name field | id pattern | Notes |
|---|------|--------------------|-----------|-----------|----|
| 16 | `src/pages/dataSources/components/DataSourceActions.tsx` | 224 | `dataSource.repo_name` or `full_name` | `datasource-name-${dataSource.id}` | Add `contextId?: string` prop; parent adds id in name column renderer |
| 17 | `src/pages/settings/administration/BudgetsManagementPage.tsx` | 217 | `item.name` | `budget-mgmt-name-${item.budget_id}` | Inline in customRenderColumns; id in name renderer, contextId in actions renderer |
| 18 | `src/pages/settings/administration/components/ProviderActions.tsx` | 76 | `provider.name` | `provider-name-${provider.id}` | Add `contextId?: string` prop; parent adds id in name column renderer |
| 19 | `src/pages/settings/administration/components/MCPServerActions.tsx` | 81 | `server.name` | `admin-mcp-name-${server.id}` | Add `contextId?: string` prop; parent adds id in name column renderer |
| 20 | `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx` | 502 | `item.name` via NameLinkCell | `project-name-${item.id}` | Add id to NameLinkCell's text node or wrap in `<span id=...>`; contextId in actions renderer |
| 21 | `src/pages/settings/administration/CostCentersManagementPage.tsx` | 186 | `costCenter.name` via NameLinkCell | `cost-center-name-${item.id}` | Same as ProjectsManagementFull — NameLinkCell pattern |
| 22 | `src/pages/settings/administration/UsersManagementPage.tsx` | 292 | `item.name \|\| item.username` | `user-name-${item.id}` | Name div at line 224 in name column renderer |
| 23 | `src/pages/settings/administration/CategoriesManagementPage.tsx` | 219 | `item.name` | `category-name-${item.id}` | Confirm id field: `item.id` vs `item.category_id` |

### Group G — Integration Settings (childrenFirst + no single name field)

| # | File | NavigationMore line | Visible label | Fix |
|---|------|--------------------|--------------|----|
| 24 | `src/pages/integrations/components/UserSettings/UserSettings.tsx` | 162 | `alias \|\| credential_type` | `data-tooltip-content={alias \|\| credential_type}` on NavigationMore; or contextId referencing alias cell if stable id available |
| 25 | `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` | 160 | `alias \|\| credential_type` | Same as UserSettings — identical structure |
