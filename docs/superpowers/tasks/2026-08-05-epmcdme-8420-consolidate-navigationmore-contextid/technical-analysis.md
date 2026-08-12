# Technical Research

**Task**: NavigationMore accessibility aria-labelledby contextId
**Generated**: 2026-08-05T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

EPMCDME-8420 follow-up: complete the extended-scope accessibility work and consolidate the NavigationMore contextId pattern. Re-apply contextId to five reverted callers (WorkflowActions, WorkflowsList, AssistantActions, KataActions, WorkflowExecutionsListItem). Migrate data-tooltip-content callers with a named entity to contextId (ProviderActions, DataSourceActions, SkillDetailsActions, MCPServerDetail, ProjectSettings.ProjectSettingActionsCell). Update integration test queries that use literal { name: 'More options' } to regex. Add regression test for data-tooltip-content aria-label branch. Add JSDoc to NavigationMore.

---

## 2. Codebase Findings

### Existing Implementations

**NavigationMore core component:**
- `src/components/NavigationMore/NavigationMore.tsx` — Dual aria mode on the trigger button:
  - `contextId` present → `aria-labelledby={buttonId + ' ' + contextId}` + sr-only "More options" span inside the button
  - `contextId` absent → `aria-label={dataTooltipContent || 'More options'}`
  - `data-tooltip-content` prop is orthogonal (drives react-tooltip tooltip, preserved in both modes)
  - `aria-controls={show ? menuId : undefined}` — only set while menu mounted
  - `aria-haspopup="menu"`, `aria-expanded={show}` always present

**Reverted callers (no contextId, no data-tooltip-content):**
- `src/pages/workflows/components/WorkflowActions.tsx:156` — `<NavigationMore hideOnClickInside renderInRoot items={actions} />`
- `src/pages/workflows/components/WorkflowsList.tsx:295` — `<NavigationMore hideOnClickInside renderInRoot items={navigationActions(workflow)} />` (navigationSlot)
- `src/pages/assistants/AssistantActions/AssistantActions.tsx:150` — `<AssistantMenu actions={assistantActions} />` (contextId not forwarded)
- `src/pages/katas/components/KataActions.tsx:165` — `<NavigationMore hideOnClickInside items={kataActions} />`
- `src/pages/workflows/details/WorkflowExecutions/WorkflowExecutionsListItem.tsx:65` — `<NavigationMore hideOnClickInside ... items={[{title:'Remove', ...}]} />` **No entity name element in DOM**

**Wrapper components (already forward contextId):**
- `src/pages/assistants/AssistantActions/components/AssistantMenu.tsx` — accepts `contextId` prop and wires it; AssistantActions just doesn't pass it through
- `src/pages/katas/components/KataMenu.tsx` — accepts and wires `contextId`; KataActions bypasses KataMenu and renders NavigationMore directly

**data-tooltip-content callers with named entity (migration targets):**
- `src/pages/settings/administration/components/ProviderActions.tsx:80` — `data-tooltip-content={`More options for ${provider.name}`}`
- `src/pages/dataSources/components/DataSourceActions.tsx:227` — `data-tooltip-content={`More options for ${item.repo_name || item.full_name || 'Data source'}`}`
- `src/pages/skills/components/SkillDetailsActions.tsx:149` — `data-tooltip-content={`More options for ${skill.name}`}`
- `src/pages/assistants/.../MCPToolkit/MCPServerDetail.tsx:68` — `data-tooltip-content={`More options for ${server.name || 'MCP Server'}`}`
- `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` (`ProjectSettingActionsCell:88`) — `data-tooltip-content={`More options for ${accessibleName}`}`

**Test utilities:**
- `src/test-utils/component-interactions/menu.ts` — `clickMenuOption(buttonName: string, ...)` — accepts `string` only; uses `getByRole('button', { name: buttonName })`; **must be widened to `string | RegExp`** before regex queries work

**Integration tests using literal 'More options':**
- `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` — 11 calls via `clickMenuOption('More options', ...)` (lines 508, 531, 552, 584, 595, 615, 1621, 1656, 1692, 1727, 1775) + 1 direct `screen.getByRole('button', { name: 'More options' })` at line 1802

### Architecture and Layers Affected

- **UI primitive layer**: `NavigationMore` component (no change to logic, JSDoc addition only)
- **Wrapper component layer**: `AssistantMenu` (prop forwarding already in place)
- **Page action component layer**: `WorkflowActions`, `KataActions`, `WorkflowExecutionsListItem`, `ProviderActions`, `DataSourceActions`, `SkillDetailsActions`, `MCPServerDetail`, `ProjectSettingActionsCell` — all modify NavigationMore props or add id to an entity element
- **Page/list component layer**: `WorkflowsList` (navigationSlot), `AssistantActions` (contextId prop chain extension)
- **Test utility layer**: `src/test-utils/component-interactions/menu.ts` — signature widening
- **Integration test layer**: `WorkflowsListPage.integration.test.tsx` — 12 sites updated

### Integration Points

- `NavigationMore` is used in 10+ files; prop-signature is additive (optional props) — all existing callers unaffected by JSDoc addition
- `react-tooltip` is driven by `data-tooltip-content` — this prop is preserved in all callers regardless of contextId migration
- `@floating-ui/react` — not affected by any change in this task
- `useId()` — already used inside NavigationMore for button/menu IDs; not affected

### Patterns and Conventions

- **contextId pattern**: caller renders `<EntityName id={someId}>...</EntityName>`, passes `contextId={someId}` to NavigationMore. NavigationMore sets `aria-labelledby={buttonId + ' ' + contextId}` and renders sr-only "More options" span.
- **data-tooltip-content pattern**: caller passes `data-tooltip-content="More options for X"` without contextId. NavigationMore sets `aria-label={dataTooltipContent}`.
- **Synthetic sr-only span pattern** (for callers with no entity name in DOM): caller renders `<span id={id} className="sr-only">{entityName}</span>` in-component, passes `contextId={id}`.
- Wrapper components (`AssistantMenu`, `KataMenu`) already forward `contextId` — caller changes are one prop addition.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/accessibility-patterns.md` — WCAG 2.1 AA target; icon button pattern (aria-label on button, aria-hidden on icon); sr-only pattern (`className='sr-only'`); confirms aria-labelledby usage for region labeling.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest patterns; `clickMenuOption` usage documented; `getByRole` priority rule; warning about NavigationMore async behavior.

### Architectural Decisions

- EPMCDME-8420 extended scope spec at `docs/superpowers/tasks/2026-07-29-epmcdme-8420-extend-contextid-accessibility-fix-to/spec.md` — defines the two-pattern rule (contextId for named entity, data-tooltip-content for action-only menus).
- Reverts in commits `ec58b991c`, `0c6e38727`, `3d3ac0630`, `0b35e050` were driven by test-findability, not accessibility intent; the original spec's intent must be restored.

### Derived Conventions

- Pattern selection rule: if an entity name is rendered in the DOM at or near the button → contextId; if the button is a pure action (export, remove) with no entity context → data-tooltip-content.
- `WorkflowExecutionsListItem` has no entity name in its current template — synthetic sr-only pattern is the appropriate solution.

---

## 4. Testing Landscape

### Existing Coverage

- `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` — unit tests; covers: contextId compound labelledby, aria-label fallback, aria-controls linkage, sr-only span presence, aria-label absence when contextId present.
- `src/pages/workflows/__tests__/WorkflowsListPage.integration.test.tsx` — integration tests; currently query `'More options'` as literal string.
- `src/pages/workflows/components/__tests__/WorkflowActions.test.tsx` — unit tests; mocks NavigationMore entirely, unaffected by contextId addition.
- `src/pages/chat/components/ChatSidebar/ChatList/__tests__/ChatListItem.test.tsx` — accessibility tests for chat contextId pattern (reference implementation).
- `src/pages/chat/components/ChatSidebar/FolderList/__tests__/FolderList.test.tsx` — accessibility tests for folder contextId pattern (reference implementation).

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library
- Unit tests: `*.test.tsx`; Integration tests: `*.integration.test.tsx`
- `getByRole('button', { name: ... })` preferred over `getByTestId`
- `afterEach(cleanup)` convention
- `clickMenuOption(buttonName, itemTitle, options?)` utility — uses exact `buttonName` match

### Coverage Gaps

- **NavigationMore.test.tsx**: missing test that `data-tooltip-content="X"` without contextId produces `aria-label="X"` on the trigger.
- **WorkflowActions contextId re-application**: no integration test covers the WorkflowActions navigationSlot button's accessible name in the integration test suite — the only integration tests that test this menu are in WorkflowsListPage.
- **ProviderActions, DataSourceActions, SkillDetailsActions, MCPServerDetail, ProjectSettingActionsCell**: no integration tests exist for these components' NavigationMore button accessible names.

---

## 5. Configuration and Environment

### Environment Variables

None relevant to NavigationMore or accessibility attributes.

### Configuration Files

- `vitest.config.ts` / `vitest.workspace.ts` — defines `unit` and `integration` workspace projects; tests must pass in both.

### Feature Flags and Deployment Concerns

None relevant to this task.

---

## 6. Risk Indicators

- **WorkflowExecutionsListItem has no entity name in DOM** — must introduce a synthetic sr-only span with a stable id. There is no obvious stable entity id in the component's existing props; the task description says to re-apply contextId here but the spec offers no entity name to reference. Likely resolution: `data-tooltip-content="Remove execution"` (action-only pattern) rather than contextId; needs clarification or a decision.
- **AssistantActions contextId prop chain** — AssistantActions does not currently receive a contextId prop; to pass one to AssistantMenu, it must be threaded from AssistantCard or AssistantDetailsPage callers. If those parent callers are out of scope, AssistantActions may need a self-contained sr-only span approach instead.
- **clickMenuOption type signature is `string`** — widening to `string | RegExp` in `src/test-utils/component-interactions/menu.ts` is a prerequisite for regex-based test queries; all integration tests that call `clickMenuOption` with a string still work, but any new regex call needs the type widened first.
- **WorkflowsListPage.integration.test.tsx: 12 sites** — all must be updated to regex `{ name: /^More options( |$)/ }` or scoped within a row; high change count but mechanical. The direct `screen.getByRole` at line 1802 must be updated separately from the clickMenuOption callsites.
- **Blast radius of NavigationMore changes** — JSDoc addition is safe; any accidental prop-signature change would affect 10+ call sites; review carefully.
- **No integration test coverage for 5 migration targets** — correctness of contextId wiring in ProviderActions/DataSourceActions/SkillDetailsActions/MCPServerDetail/ProjectSettingActionsCell cannot be verified by integration tests; unit test coverage (like UserSettings.accessibility.test.tsx) should be added or confirmed.

---

## 7. Summary for Complexity Assessment

This task touches three distinct layers: (1) the NavigationMore primitive (JSDoc only), (2) ten page-level action components (5 re-applications of contextId to reverted callers, 5 migrations from data-tooltip-content), and (3) the test utility and integration test layer (type widening in menu.ts plus 12 sites in WorkflowsListPage.integration.test.tsx). The change surface is broad but the per-file changes are mechanical: adding an `id` attribute to an existing element and passing a `contextId` prop to NavigationMore, or changing a string literal to a regex in a test query.

Two genuine decision points require clarification before implementation: (a) `WorkflowExecutionsListItem` has no entity name element in its current template, and the task description claims it can take contextId — this needs a resolution (synthetic sr-only span, or reclassify as data-tooltip-content action-only); (b) `AssistantActions` has no `contextId` prop of its own, so restoring the accessible entity name requires either threading the prop from parent callers (scope extension) or adding a sr-only span self-contained in the component. Both are solvable within this branch but the approach affects the change surface.

Test risk is concentrated in `WorkflowsListPage.integration.test.tsx` (12 sites) and the `clickMenuOption` utility. The unit test addition in `NavigationMore.test.tsx` is a single new `it` block. The remaining migration targets have no integration test coverage, so the contextId correctness must be verified either through new unit tests or manual inspection; the existing `UserSettings.accessibility.test.tsx` is the reference pattern to follow.
