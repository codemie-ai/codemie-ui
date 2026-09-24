# Hide (not disable) "Unassign from Project" Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the Project Members actions kebab menu, omit "Unassign from Project" entirely for a row that cannot be unassigned, instead of rendering it disabled with a tooltip; and stop underlining "View analytics" on hover.

**Architecture:** Task 1 moves one boolean already computed in `ProjectMembersManager.tsx`'s `actions` cell closure (`isCreator || isPersonal || !canManageProject`) from the item's `disabled` prop to its `hidden` prop — a mechanism `NavigationMore` already supports and `DataSourceActions.tsx` already uses. The divider immediately preceding the item is re-guarded to also require the item's presence, so it can never render alone. Task 2 is an unrelated, independent styling fix in the same shared `NavigationMore` component: href-based menu items inherit a global `a:hover { text-decoration: underline }` base style, so the fix adds a `hover:no-underline` override to the shared menu-item class rather than touching the global anchor style.

**Tech Stack:** React 18 + TypeScript, Vitest + React Testing Library (integration and unit projects).

**Requirements:** inline (no spec.md); see Acceptance criteria below.

## Global Constraints

- Task 1's change is confined to `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx` (implementation) and its integration test file. No other component or page changes behavior.
- Task 1's hide condition reuses the existing disabled expression verbatim — creator OR personal project OR lacking manage rights — never narrowed to creator-only.
- Task 1 introduces no new shared/exported predicate helper (e.g. no `canUnassign` in `@/utils/entity`); an inline boolean is required.
- Task 2's fix targets only the hover-underline; it must not change focus, active, or disabled visual states of any menu item, and must not touch the global `a` style in `src/assets/stylesheets/main.scss`.
- Commit per task using the repository's existing convention.

## Review Focus

- A creator's row with Enterprise Edition enabled must show "View analytics" alone, with no trailing/orphan separator once "Unassign from Project" is hidden.
- A personal-project row (non-creator) must also hide the item, not just disable it — the personal-project case is explicitly in scope, not creator-only.
- A normal row (non-creator, non-personal, has manage rights) must keep showing the item, enabled and clickable — regression check that the hide condition didn't over-fire.
- `!canManageProject` is unreachable per-row (the whole `actions` column is gated on `canManageProject` in `getColumnDefinitions`) — no new per-row test is possible for it; the existing column-level test already covers that state.
- The item's `onClick`/`icon` wiring to `handleDeleteUser` must survive the `disabled`→`hidden` prop swap unchanged for the still-visible case.
- The hover-underline fix must not regress the existing disabled-link test (`NavigationMore.test.tsx` — "renders an href item as a disabled link that does not fire onClick") or the focus-ring test in the same file.

---

## Acceptance criteria

- [ ] "Unassign from Project" is not rendered (no `menuitem` in the DOM) for the project creator's row.
- [ ] "Unassign from Project" is not rendered for any row in a personal project.
- [ ] "Unassign from Project" is still rendered, enabled, and clickable for a normal row (non-creator, non-personal, has manage rights).
- [ ] No `disabled`/tooltip styling is used for the hidden cases — the item is absent, not present-and-disabled.
- [ ] No orphan/dangling separator renders in any row's menu, whether or not "View analytics" and/or "Unassign from Project" are present.
- [ ] The "View analytics" menu item (and, by the same shared-component fix, every other `NavigationMore` menu item rendered as a link) no longer shows an underline on hover.

---

### Task 1: Route the unassign item through `hidden` instead of `disabled`, and re-guard its divider

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:628-645`
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx`

**Interfaces:**
- Consumes: `isCreator` (line 613), `isPersonal`/`canManageProject` (component-scope, already in the closure's dependency list at lines 667-668), `NavigationMenuItem`'s existing `hidden?: boolean` field (`src/components/NavigationMore/NavigationMore.tsx`).
- Produces: no new symbols — `unassignHidden` is a local `const` inside the closure, not exported.

Test-first: yes — the creator-row test at test file line 243 currently asserts `toBeDisabled()` + tooltip; it must instead assert `queryByRole('menuitem', { name: /unassign from project/i })` is `null`. Write that assertion (and the two new ones below) before touching the component so all three fail against current behavior.

- [ ] **Step 1: Update the four target tests to assert on `hidden` semantics (write first, expect failures)**
  - Rewrite the test at line 243 (`'always shows Unassign from Project without red/error styling, disabled...'`): rename it to describe hiding, drop the `toBeDisabled()`/tooltip/className assertions, and instead `await waitFor(() => expect(screen.queryByRole('menuitem', { name: /unassign from project/i })).not.toBeInTheDocument())` for the creator row (`buildUser('owner-1', ...)`, matching `mockProject.created_by`). Keep the existing "View analytics stays present and becomes enabled" assertion in the same test — it is unaffected by this change.
  - Add a new test `'hides the Unassign from Project menu item for a member of a personal project'`: build a project fixture that spreads `mockProject` with `project_type: ProjectType.PERSONAL` (import `ProjectType` from `@/types/entity/project`) and `created_by` set to a different id than the rendered user, render with the default non-creator user (`u-1`/`Jane Doe`), open the menu, and assert the unassign `menuitem` is absent.
  - Add a new control test `'keeps Unassign from Project enabled and clickable for a normal member row'`: render with the default `mockProject` (shared, non-personal) and default `u-1` non-creator user, open the menu, `findByRole('menuitem', { name: /unassign from project/i })`, assert it is present, not disabled (`expect(item).not.toBeDisabled()` or absence of `aria-disabled="true"`), and that clicking it does not throw (mirroring the existing "View analytics" click test's pattern at line 214).
  - Extend the no-orphan-divider coverage: add an assertion in the rewritten creator test (or a new adjacent test) that, with Enterprise Edition enabled and only "View analytics" left visible on the creator row, `screen.queryByRole('separator')` is `not.toBeInTheDocument()` — mirroring the existing pattern at test file lines 206-208.
  - Leave the `!canManageProject` case uncovered at the per-row level — it is unreachable inside this closure (see Global Constraints); the existing test `'does NOT render a View analytics menu item for a non-admin/non-project-admin viewer'` (line 181) already covers that state at the column level.

- [ ] **Step 2: Run the test file to confirm the four assertions fail**

  Run: `npm run test -- src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx`
  Expected: the rewritten/new tests FAIL (creator's item still renders disabled instead of being absent; personal-project item still renders; divider assertion not yet guarded for this case).

- [ ] **Step 3: Implement the hide condition and divider guard**

  In `ProjectMembersManager.tsx`:
  - At line 632-637, delete the `unassignTooltip` computation (`let unassignTooltip...else if (isPersonal)...`) — no longer needed once the item is hidden rather than disabled.
  - At line 639-645, replace `disabled: isCreator || isPersonal || !canManageProject` and `tooltip: unassignTooltip` with a single `hidden: isCreator || isPersonal || !canManageProject` (same expression, no helper extracted, no narrowing).
  - At line 628-630, change the divider guard from `if (menuItems.length > 0)` to also require the unassign item will render: `if (menuItems.length > 0 && !(isCreator || isPersonal || !canManageProject))`. (Compute this hide condition once, e.g. as `const unassignHidden = isCreator || isPersonal || !canManageProject`, declared before the divider push at line 628, and reuse it both at the divider guard and at line 643's `hidden:` field, so the two sites can never drift apart.)

- [ ] **Step 4: Run the test file again to confirm all tests pass**

  Run: `npm run test -- src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx`
  Expected: all tests in the file PASS, including the rewritten creator test, the two new tests, and the pre-existing divider/analytics tests (lines 181-241) unaffected by this change.

- [ ] **Step 5: Commit**

  Commit the component and test file changes together, following the repository's existing commit convention.

---

### Task 2: Remove the hover underline on "View analytics" (and every other link-style menu item)

**Files:**
- Modify: `src/components/NavigationMore/NavigationMore.tsx:165-170`
- Test: `src/components/NavigationMore/__tests__/NavigationMore.test.tsx`

**Interfaces:**
- Consumes: nothing new — `itemClassName` (the `cn(...)` call at lines 165-170) is the single class string shared by both the `<Link>` branch (line 190) and the `<button>` branch (line 212) of a menu item.
- Produces: no new symbols; `itemClassName` gains one more Tailwind utility in its existing `cn(...)` argument list.

**Root cause (found by inspection, not the requirements text):** `src/assets/stylesheets/main.scss:148-154` sets a global base style — `a { @apply no-underline text-inherit; &:hover { @apply underline; } }` — applied to every anchor in the app. `NavigationMore.tsx`'s href-based items render as a react-router `<Link>` (i.e. an `<a>`), so "View analytics" (the only href-based item in the Project Members menu, and any other `NavigationMore` consumer's href items) inherits that hover underline with no local override. The correct fix is a targeted override on the shared menu-item class, not editing the global `a` rule — the global rule is deliberately app-wide default link styling and other, non-menu links likely rely on it.

Test-first: yes — assert the rendered menu item carries a `hover:no-underline` class; this class does not exist on `itemClassName` today, so the assertion fails until Step 3.

- [ ] **Step 1: Write the failing test**

  In `NavigationMore.test.tsx`, add a test alongside the existing href-item test (near line 134): render an item with `href: '/x'` (reuse the existing `MemoryRouter` wrapper pattern from that test), open the menu, `screen.getByRole('menuitem')`, and assert `expect(link).toHaveClass('hover:no-underline')`. Also add a companion assertion (or extend the same test) that a plain `<button>`-rendered item (no `href`) likewise has `hover:no-underline` on its class list, since the fix lives in the single shared `itemClassName` used by both branches.

- [ ] **Step 2: Run the test file to confirm it fails**

  Run: `npm run test -- src/components/NavigationMore/__tests__/NavigationMore.test.tsx`
  Expected: FAIL — neither the link nor the button item currently has `hover:no-underline` in its class list.

- [ ] **Step 3: Add the override class**

  At `NavigationMore.tsx:165-170`, add `'hover:no-underline'` as an additional argument to the existing `cn(...)` call that builds `itemClassName` (alongside the current `'flex items-center gap-3 ...'` base string). Keep every other class and conditional in that call unchanged — this only stops the inherited global underline on hover; it does not touch `focus:`, `disabled:`, or the `pointer-events-none opacity-50` disabled-link styling already present.

- [ ] **Step 4: Run the test file to confirm it passes**

  Run: `npm run test -- src/components/NavigationMore/__tests__/NavigationMore.test.tsx`
  Expected: all tests in the file PASS, including the new hover-underline assertions and the pre-existing disabled-link and focus-ring tests (lines 134-160), which exercise adjacent classes on the same elements and must remain green.

- [ ] **Step 5: Commit**

  Commit the component and test file changes together, following the repository's existing commit convention.

---

## Self-review

- **Coverage:** creator-hidden (rewritten test, line 243 origin), personal-project-hidden (new test), normal-row-still-visible (new control test), orphan-divider (extended assertion), hover-underline-removed (new Task 2 test) — all six acceptance criteria have an owning assertion.
- **Negative constraints:** (1) "must not render, not merely disable" — honored: `disabled`/`tooltip` are removed, replaced by `hidden`, and tests assert absence via `queryByRole`, not `toBeDisabled()`. (2) "must not narrow to creator-only" — honored: the hide expression keeps `isPersonal` and `!canManageProject`, and a dedicated personal-project test exists. (3) "no new shared helper" — honored: `unassignHidden` is a local `const` inside the closure, not exported or moved to `@/utils/entity`. (4) Task 2 must not edit the global `a` style or affect other item states — honored: the fix is a single added utility class on the existing shared `itemClassName`, and Step 4 re-runs the pre-existing focus/disabled tests to confirm no regression. negative-constraints: all four addressed above; none left unstated.
- **Placeholder scan:** no TBD/TODO; every step names the exact file, line range, and expression.
