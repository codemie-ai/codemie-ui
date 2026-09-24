# Technical Research

**Task**: project members actions dropdown unassign
**Generated**: 2026-09-24T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

In the Project Members page (settings/administration/projects/:id), the row actions kebab menu shows an 'Unassign from Project' item that is rendered disabled for the admin user who created the project (since that user cannot be unassigned). Instead of showing it disabled, the menu item should not be rendered at all when the current user/row cannot be unassigned.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` — owns the Project Members table. The `actions` column-cell function (around lines 612–663) builds a `NavigationMenuItem[]` per row:
  - `isCreator = user.id === project.created_by`
  - Pushes a `'View analytics'` item (Enterprise Edition only), then, only `if (menuItems.length > 0)`, pushes a `divider` item — this conditional-divider guard was added specifically to avoid an orphan separator when the analytics item is absent (see fix commit below).
  - Computes `unassignTooltip`: `'Project creator cannot be unassigned'` when `isCreator`, else the personal-project tooltip when `isPersonal`.
  - Pushes the `'Unassign from Project'` item with `disabled: isCreator || isPersonal || !canManageProject` and the tooltip above, `onClick: () => handleDeleteUser(user)`.
  - Renders `<NavigationMore renderInRoot hideOnClickInside items={menuItems} ... />` inside a `role="presentation"` wrapper that stops click/keydown propagation (so the row selection is not triggered by menu interaction).
- `src/components/NavigationMore/NavigationMore.tsx` — the shared kebab/dropdown component. `NavigationItem` already declares an optional `hidden?: boolean` field, distinct from `disabled?: boolean`. The component computes `visibleItems = items?.filter((item) => isNavigationDivider(item) || !item.hidden)` and renders only `visibleItems` — dividers are never filtered by `hidden`, only regular items are. This means hiding an item (as opposed to disabling it) is an existing, already-wired capability; no change to `NavigationMore` itself is implied by this task.
- `src/pages/dataSources/components/DataSourceActions.tsx` (lines ~154–206) — an existing per-row kebab-menu consumer that already uses the `hidden: !canX(item)` convention for several items (`Edit`, `Incremental Index`, `Full Reindex`, `Resume Indexing`, `Force Reindex`, `Delete`), each driven by a boolean helper imported from `@/utils/entity` (`canEdit`, `canDelete`). This is the closest precedent in the codebase for "hide, don't disable" per-row menu items.
- `handleDeleteUser` (line ~478) — triggers the unassign confirmation flow (`ConfirmationModal` / `UnassignFromProjectConfirmationPopup.tsx` sibling component) when the item's `onClick` fires.
- `personalProjectTooltip` (line 129) — a shared tooltip-text helper used both for the role `<Select>` (line 586) and for the unassign item's tooltip (line 636), i.e. the "cannot act in a personal project" messaging is shared across the role-change control and the unassign action.
- `canManageProject` (line 261) gates whether the `actions` table column exists at all (`getColumnDefinitions`, line 192: `if (canManage) { columns.push({ key: 'actions', ... }) }`). Consequently, inside the per-row `actions` cell function, `canManageProject` is always `true` when that closure runs — the `!canManageProject` disjunct in the current `disabled` expression is effectively unreachable/defensive at the per-row level.
- `isPersonal` (line 262, `project.project_type === ProjectType.PERSONAL`) disables the unassign item (and the role `<Select>`) for every row in a personal project, not just the creator's row.

### Architecture and Layers Affected

- **Presentation / page layer**: `ProjectMembersManager.tsx` (React component, `src/pages/settings/administration/projectsManagement/`), specifically the `actions` cell factory passed to the `Table` component (`DefinitionTypes.Custom`).
- **Shared UI component layer**: `NavigationMore` (`src/components/NavigationMore/`), which already exposes the `hidden` capability being asked for — no new prop is needed, only a different value supplied by the caller.
- No service, store, or API layer changes are implicated — `handleDeleteUser` and the unassign confirmation flow are unchanged by this task; this is purely a menu-item visibility decision made from data already present (`isCreator`, `isPersonal`, `canManageProject`) in the same closure.

### Integration Points

- `NavigationMenuItem` / `isNavigationDivider` types are exported from `NavigationMore.tsx` and imported into `ProjectMembersManager.tsx` as `NavigationMenuItem`.
- The divider item pushed before `'Unassign from Project'` is only added `if (menuItems.length > 0)` (i.e., only when the analytics item is present) — any change that also removes the unassign item under some condition must keep this divider consistent, or a divider with nothing above or below it will render (an "orphan divider"), the exact class of bug fixed once already in this file (see below).
- `src/pages/dataSources/components/DataSourceActions.tsx` shows the `hidden:` convention used elsewhere in the same kebab-menu component, giving a second reference implementation to align with.

### Patterns and Conventions

- Per-row kebab menus in this codebase build a plain array of `NavigationMenuItem` objects with `title`, `icon`, `onClick`/`href`, `disabled`, `hidden`, and `tooltip` fields, computed inline in the table's cell-render closure — no factory/registry abstraction exists for this.
- `disabled` communicates "visible but not actionable, with an explanatory tooltip"; `hidden` communicates "not applicable to this row, don't show it" — both are first-class, already-supported states on `NavigationItem`, and both patterns coexist today in `ProjectMembersManager.tsx` (analytics item is `disabled` while budgets load; several `DataSourceActions.tsx` items are `hidden` based on capability checks).
- Guarding a divider's presence on whether the item(s) around it will actually render (`if (menuItems.length > 0)`) is the established idiom in this file for avoiding orphan separators.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/component-patterns.md`, `component-organization.md`, `reusable-components.md` exist but contain no explicit guidance on kebab-menu item visibility (`hidden` vs `disabled`); no hits for "kebab", "dropdown", or "menu item" in `component-patterns.md`.
- `.ai-run/guides/patterns/accessibility-patterns.md` exists (not read in full for this task) and would govern any accessibility implications of removing vs. disabling a menu item.

### Architectural Decisions

- No ADR or inline `NOTE:`/`DECISION:` marker found specific to this menu. The relevant design history is entirely in the last four commits on the current branch (`9fa5dd8cb`, `872ff74bd`, `d9c7451fc`/`fa59085c1`), which converted the row actions from inline buttons to this `NavigationMore` kebab menu and then fixed an orphan-divider/accessible-name regression that the conversion introduced.

### Derived Conventions

- Derived from `DataSourceActions.tsx`: prefer a small boolean predicate (e.g. `canUnassign(user)` or an inline expression) fed into `hidden:` rather than reusing `disabled:` for "not applicable" cases.
- Derived from this file's own history: whenever an item's presence becomes conditional, the divider immediately adjacent to it must be re-guarded so it never renders alone.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx` — despite its filename, this is the integration test suite for the entire "Actions dropdown" (`describe('ProjectMembersManager — Actions dropdown', ...)`). Directly relevant tests:
  - `'always shows Unassign from Project without red/error styling, disabled with a tooltip for the project creator, while View analytics stays present and becomes enabled'` (line 243) — currently asserts the creator's row **does** render the `Unassign from Project` menuitem, `toBeDisabled()`, with tooltip `'Project creator cannot be unassigned'`. This test's premise is exactly the behavior the task asks to change and will need rework once the item is hidden instead of disabled.
  - `'does NOT render a View analytics menu item when enterprise edition is disabled'` (line 194) — already asserts `expect(screen.queryByRole('separator')).not.toBeInTheDocument()` when the analytics item and its divider are both absent, i.e. the orphan-divider test pattern to mirror for the creator-row case (where, if analytics is present, the divider would become the trailing/orphan element once unassign is hidden).
  - `'renders a separator between View analytics and Unassign from Project'` (line 231) — asserts a separator exists when both items are present; would need to be scoped to a non-creator/non-personal row if the creator row is used in other tests.
- No other test file references `ProjectMembersManager`'s actions column directly (`ProjectMembersSpending.test.tsx` and `ProjectDetailsPage.test.tsx` cover other concerns).
- `src/components/NavigationMore/__tests__/NavigationMore.test.tsx` covers `hidden` filtering generically (`makeItems([{}, { hidden: true }])`, `makeItems([{ hidden: true }, { hidden: true }])`) at the component level — confirms the `hidden` mechanism itself is already tested and working.

### Testing Framework and Patterns

- Vitest with React Testing Library; the relevant suite is in the `integration` project (imports `@/test-utils/integration` first, per the file's own comment on import order).
- Pattern: `render` inside `<MemoryRouter>`, mock `userStore.getUsers`/`userStore.user` and `projectBudgetsStore.listProjectBudgets`, open the menu via a `findByRole('button', { name: /more options/i })` helper (`openMenu`), then query by `role="menuitem"` / `role="separator"`.

### Coverage Gaps

- No existing test exercises a non-creator, non-personal, `canManageProject: true` row to confirm the unassign item renders normally (all current assertions either use the creator row or a personal-project context) — needed as a control case for whatever the change turns out to be.
- No test exercises the `isPersonal` disabled-tooltip path in combination with the "hide vs disable" question raised by the task's closing sentence ("when the current user/row cannot be unassigned") — the task text names only the creator case explicitly.

---

## 5. Configuration and Environment

### Environment Variables

- None specific to this feature area. `isEnterpriseEdition()` (`src/utils/enterpriseEdition.ts`) is a build/runtime flag check already used to gate the `'View analytics'` item, not something this task needs to touch.

### Configuration Files

- No feature-area-specific config files found beyond standard Vite/env layering described in `AGENTS.md`.

### Feature Flags and Deployment Concerns

- None found specific to Project Members actions.

---

## 6. Risk Indicators

- **Divider adjacency**: the divider before `'Unassign from Project'` is currently only guarded against the analytics item being absent (`if (menuItems.length > 0)`). Speculative: if the unassign item becomes conditionally hidden too, the same divider must also be re-guarded against the unassign item's presence, or a creator's row with Enterprise Edition enabled would show `View analytics` followed by an orphan trailing divider and nothing else — reproducing the exact bug class fixed in commit `fa59085c1`.
- **Scope ambiguity in the task text**: the ticket names only the project-creator case ("the admin user who created the project") but its closing sentence generalizes to "the current user/row cannot be unassigned," which today also covers `isPersonal` (personal projects disable unassign for every member) and, defensively, `!canManageProject` (unreachable at the per-row level since the whole actions column is gated on `canManageProject`). Speculative: whether personal-project rows should also hide (vs. keep disabled with the existing tooltip) is a product decision the spec/plan stage must resolve — the research found no code or doc settling it either way.
- **Test rewrite required**: the integration test at `ProjectMembersViewAnalytics.integration.test.tsx:243` explicitly asserts the creator's row currently renders the disabled item with a tooltip; this assertion is the direct target of the requested change and will fail once the item is hidden, so it is a known, named, pre-existing test that must be updated.
- **No existing "control" test** for a normal (non-creator, non-personal) row's unassign item — makes it harder to verify by contrast that only the intended row(s) lose the item.
- **Precedent exists but is in a different feature area**: `DataSourceActions.tsx` is the only other consumer using `hidden:` for capability-based item suppression; there is no shared helper (e.g., a `canUnassign` utility) to reuse from `@/utils/entity`, so any such predicate here would likely be an inline boolean rather than an imported helper, unlike the `canEdit`/`canDelete` pattern in `DataSourceActions.tsx`.

---

## 7. Summary for Complexity Assessment

This task touches a single presentation-layer file, `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx`, specifically the `actions` cell-render closure that already computes `isCreator`, `isPersonal`, and `canManageProject` and feeds them into a `disabled`/`tooltip` pair on a `NavigationMenuItem`. The shared `NavigationMore` component (`src/components/NavigationMore/NavigationMore.tsx`) already supports item-level `hidden: boolean` filtering, distinct from `disabled`, and this mechanism is already used analogously in `src/pages/dataSources/components/DataSourceActions.tsx` for several per-row kebab items — so no new UI-component capability is required, only a different boolean routed to an existing prop in the caller.

The main technical risk is not the visibility switch itself but its interaction with the divider immediately preceding the unassign item: that divider is currently guarded only against the analytics item's absence, and the file has one prior, already-fixed incident of an orphan-divider bug (`fa59085c1`) from this same menu during its conversion to `NavigationMore`. Any change here revives that same failure mode if the divider guard is not updated in lockstep with whichever item(s) become conditionally hidden. There is also a scope question the task text leaves open — whether "cannot be unassigned" should be read narrowly (creator only, as explicitly named) or broadly (also covering the personal-project case, which today shares the same `disabled` expression and tooltip helper) — that the research found no precedent settling either way.

Test coverage is concentrated in one integration suite (`ProjectMembersViewAnalytics.integration.test.tsx`) that already contains a test directly asserting the current disabled-creator behavior and a sibling test already asserting no-orphan-divider behavior for a different absent-item case — both patterns to extend rather than invent. Given the narrow, well-precedented change surface (one file, one existing mechanism, one test suite with directly analogous prior art), this reads as a small, low-novelty change whose main effort is precise conditional logic and test updates rather than new architecture.

---

## 8. External References

None named by the task.
