# Project Members Actions Kebab Dropdown (EPMCDME-15005) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the standalone "View analytics" icon-link and "Unassign" button in the Project Members Actions column with a single `NavigationMore` kebab dropdown, adding divider/link support to `NavigationMore` itself.

**Architecture:** Extend `NavigationMore`'s item type with an optional-`href`/optional-`onClick` variant plus a divider variant, keeping every current plain-item call site unaffected. Then rebuild `ProjectMembersManager`'s `actions` cell as a `menuItems` array consumed by one `<NavigationMore>` per row, and rebalance the column widths that the narrower kebab column frees up.

**Tech Stack:** React 18, TypeScript 5, react-router `Link`, Vitest + React Testing Library (`unit` project for `NavigationMore.test.tsx`, `integration` project for `ProjectMembersViewAnalytics.integration.test.tsx`).

## Global Constraints

- Commit per task using the repository's existing convention (no invented format here).
- No new dependencies; no changes to `getAnalyticsMemberLink`, `isEnterpriseEdition`, budget/store logic, or any backend/API code.
- Do not add a red/error color override to the "Unassign from Project" menu item — it inherits `NavigationMore`'s standard item classes.
- Do not touch `NavigationMoreProps`, the trigger button, or any exported `NavigationMore` behavior beyond the items union/divider/href support.
- Verification commands (run individually by the executor at the end, not as plan tasks):
  `npx vitest run src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx`,
  `npx vitest run src/components/NavigationMore/__tests__/NavigationMore.test.tsx`,
  `npm run lint`, `npm run typecheck`, `npm run license-headers:check`.

## Acceptance criteria

- [ ] The Actions column renders a single kebab (`NavigationMore`) menu per row instead of a separate analytics link and Unassign button.
- [ ] "View analytics" is present and enabled (once budgets load) for every row, including the project creator's row, with tooltip exactly `View analytics for <name>` (no project suffix) and an `href` containing `tab=insights`, `projects=<project.name>`, `users=<user.id>`.
- [ ] A divider separates "View analytics" from "Unassign from Project" inside the menu (`role="separator"`).
- [ ] "Unassign from Project" is always present; disabled with tooltip `Project creator cannot be unassigned` when the row's user is the project creator; disabled with the personal-project tooltip when the project is personal; otherwise enabled and calls the existing delete flow. No red/error styling override.
- [ ] Clicking any menu action does not trigger row selection.
- [ ] `getColumnDefinitions` keeps every column-width combination summing to 100%, with the actions column at `w-[6%]` in every branch where it appears.
- [ ] `NavigationMore` renders a divider item and an `href`-backed link item correctly while every existing plain `{title, onClick}` call site in the repo keeps rendering as a `<button>` unchanged.

---

### Task 1: `NavigationMore` — add divider and href-item support

**Files:**
- Modify: `src/components/NavigationMore/NavigationMore.tsx:35-42` (item types), `:50` (`items` prop type), `:124` (visibility filter), `:141-174` (render loop)
- Test: `src/components/NavigationMore/__tests__/NavigationMore.test.tsx`

**Interfaces:**
- Produces: `NavigationItem` (onClick/href/divider now optional-per-shape), `NavigationDivider`, `NavigationMenuItem = NavigationItem | NavigationDivider`, `isNavigationDivider(item): item is NavigationDivider` — all exported from `NavigationMore.tsx`, consumed by Task 3.

Test-first: yes — two new failing tests: a divider renders `role="separator"` and no `role="menuitem"`; an `href` item renders as an `<a>` with `aria-disabled` and `pointer-events-none opacity-50` when disabled, without calling `onClick`.

- [ ] **Step 1: Write the failing tests** — append to `NavigationMore.test.tsx`:

```tsx
it('renders a divider as a separator, not a menuitem', () => {
  const items = [{ title: 'Edit', onClick: vi.fn() }, { title: 'sep', divider: true as const }]
  render(<NavigationMore items={items} />)
  openMenu()
  expect(screen.getByRole('separator')).toBeInTheDocument()
  expect(screen.getAllByRole('menuitem')).toHaveLength(1)
})

it('renders an href item as a disabled link that does not fire onClick', () => {
  const onClick = vi.fn()
  const items = [{ title: 'View', href: '/x', onClick, disabled: true }]
  render(
    <MemoryRouter>
      <NavigationMore items={items} />
    </MemoryRouter>
  )
  openMenu()
  const link = screen.getByRole('menuitem')
  expect(link.tagName).toBe('A')
  expect(link).toHaveAttribute('aria-disabled', 'true')
  fireEvent.click(link)
  expect(onClick).not.toHaveBeenCalled()
})
```
  Add `import { MemoryRouter } from 'react-router'` to the test file's imports.

- [ ] **Step 2: Run and confirm failure** — `npx vitest run src/components/NavigationMore/__tests__/NavigationMore.test.tsx`. Expected: FAIL — divider test fails because every item renders as a `<button role="menuitem">` today; href test fails on `TypeError` (missing `onClick` no longer applies) or on `link.tagName` mismatch.

- [ ] **Step 3: Implement the type union and render branches.** Replace lines 35-42 with:

```ts
export interface NavigationItem {
  title: string
  tooltip?: string
  onClick?: MouseEventHandler<HTMLButtonElement>
  href?: string
  divider?: false
  icon?: React.ReactNode
  disabled?: boolean
  hidden?: boolean
}

export interface NavigationDivider {
  title: string
  divider: true
}

export type NavigationMenuItem = NavigationItem | NavigationDivider

export const isNavigationDivider = (item: NavigationMenuItem): item is NavigationDivider =>
  (item as NavigationDivider).divider === true
```
  Change `items?: Array<NavigationItem>` (line 50) to `items?: Array<NavigationMenuItem>`. Add `import { Link } from 'react-router'` near the top.
  Change the filter (line 124) to `items?.filter((item) => isNavigationDivider(item) || !item.hidden)`.
  In the `visibleItems.map` (lines 143-172), branch per item:
  - `isNavigationDivider(item)` → `<li key={item.title} role="none"><div className="my-1 border-t border-border-structural" role="separator" /></li>`.
  - else if `item.href` → render the SAME wrapper classes the `<button>` used (line 148-153) on an `<Link to={item.href}>`, adding `aria-disabled={item.disabled}` and, when `item.disabled`, appending `'pointer-events-none opacity-50'` to the className and calling `e.preventDefault()` in `onClick` before the existing `if (!item.disabled) item.onClick?.(e)` / `hideOnClickInside` logic; keep `role="menuitem"`, `data-tooltip-id`/`data-tooltip-content`, icon/title spans identical to the button.
  - else → the existing `<button>`, only changing `item.onClick(e)` to `item.onClick?.(e)`.

- [ ] **Step 4: Run and confirm pass** — same command as Step 2. Expected: PASS, and the full suite (all prior tests) still green.

- [ ] **Step 5: Commit.**

---

### Task 2: Rework `ProjectMembersViewAnalytics.integration.test.tsx` for the dropdown

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx` (full rewrite of the `it(...)` bodies from line 122 on; keep the mocks at lines 30-61, `mockProject`, `mockBudgets`, `buildUser`, `usersResponse` as-is)

**Interfaces:**
- Consumes: the real (unmocked) `NavigationMore` from Task 1 — do not mock `@/components/NavigationMore` in this file, so the dropdown's real markup (trigger button, `role="menu"`, `role="menuitem"`, `role="separator"`) is exercised.
- Consumes from `ProjectMembersManager` (implemented in Task 3): a trigger button per row queryable by `screen.findByRole('button', { name: /more options/i })` (there is one row in every existing test fixture, so `findByRole` singular is safe; use `findAllByRole` plus row scoping if a test adds a second user).

Test-first: yes — these assertions target the not-yet-built dropdown and new tooltip text; they must fail against today's standalone link/button markup.

- [ ] **Step 1: Write the failing tests.** Replace the `describe('ProjectMembersManager — View analytics button', ...)` block with `describe('ProjectMembersManager — Actions dropdown', ...)` keeping the same `beforeEach`. Add a helper at the top of the describe block:

```tsx
const openMenu = async () => {
  const trigger = await screen.findByRole('button', { name: /more options/i })
  await userEvent.setup().click(trigger)
}
```
  Cover these cases (one `it` each, mirroring the existing render/`MemoryRouter` wrapping pattern):
  1. Opening the menu shows a "View analytics" menu item with `data-tooltip-content` exactly `'View analytics for Jane Doe'` (no `" in Alpha"` suffix) — query via `screen.findByRole('menuitem', { name: /view analytics/i })` and assert `toHaveAttribute('data-tooltip-content', 'View analytics for Jane Doe')`.
  2. That menu item is an `<a>` (`.tagName === 'A'`) whose `href` contains `tab=insights`, `projects=Alpha`, and `users=u-1`.
  3. No dropdown/menu item renders for a non-admin/non-project-admin viewer (`userStore.user = { userId: 'maintainer-1', isAdmin: false }`): open the menu and assert `queryByRole('menuitem', { name: /view analytics/i })` is null — the trigger itself may still render since Unassign will be disabled, not omitted (adjust the assertion to target the analytics menuitem specifically, not the trigger).
  4. No "View analytics" menu item when `isEnterpriseEdition` mock returns `false` (restore to `true` after, exactly as today's test does).
  5. Clicking "View analytics" does not throw and does not select the row (same stopPropagation intent as today's test, but now clicking a menu item after `openMenu()`).
  6. A `role="separator"` element exists inside the open menu, between the two `menuitem`s.
  7. "Unassign from Project" menu item is present, not styled red (assert it does NOT carry any class containing `error` or `red` — e.g. `expect(item.className).not.toMatch(/error|red/i)`), and for a creator row (build a user whose `id` equals `mockProject.created_by`, i.e. `'owner-1'`, added to the `getUsers` mock response for that test) it is disabled with `data-tooltip-content="Project creator cannot be unassigned"`, while "View analytics" is still present and becomes enabled once budgets resolve for that same creator row.
  8. Budgets-loading disable/enable: reuse the existing deferred-promise pattern (lines 219-243 today) — open the menu, assert the "View analytics" menu item has `aria-disabled="true"`, resolve `listProjectBudgets`, then `waitFor` `aria-disabled="false"`.

- [ ] **Step 2: Run and confirm failure** — `npx vitest run src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx`. Expected: FAIL — no "More options" trigger exists yet (current markup has the standalone link/button), so `findByRole('button', { name: /more options/i })` times out or the menuitem queries return nothing.

- [ ] **Step 3: Commit the test file** (implementation lands in Task 3; committing the red test here keeps the TDD record honest per this repo's convention of one change per commit).

---

### Task 3: Rebuild `ProjectMembersManager`'s actions cell and column widths

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:17` (imports), `:137-203` (`getColumnDefinitions`), `:610-661` (`customRenderColumns.actions`), `:663-677` (its `useMemo` deps)

**Interfaces:**
- Consumes: `NavigationMore`, `NavigationMenuItem` from `@/components/NavigationMore` (Task 1); `DeleteSvg` from `@/assets/icons/delete.svg?react` (confirmed to exist in the repo).
- Produces: the dropdown markup Task 2's tests query against.

Test-first: yes — makes Task 2's already-written, currently-failing tests pass; no new test file needed here.

- [ ] **Step 1: Confirm the target tests still fail** — rerun Task 2's command; expected: same FAIL as Task 2 Step 2 (nothing has changed yet in this file).

- [ ] **Step 2: Update imports.** Remove `import { Link } from 'react-router'` (line 17) — no longer used in this file once the analytics `<Link>` is replaced. Add:
  ```ts
  import NavigationMore, { NavigationMenuItem } from '@/components/NavigationMore'
  import DeleteSvg from '@/assets/icons/delete.svg?react'
  ```
  Keep `AnalyticsSvg`, `Button`, `ButtonSize`, `ButtonType`, `getAnalyticsMemberLink`, `isEnterpriseEdition`, `cn` imports — all still used elsewhere in the file (header buttons, `ConfirmationModal`, the new menu items, the disabled-link className helper).

- [ ] **Step 3: Rebalance `getColumnDefinitions` (lines 137-203).** Change the `else if (canManage)` branch of `userColumnWidth` from `'w-[42%]'` to `'w-[60%]'`, and the `else if (canManage)` branch of `roleColumnWidth` from `'w-[28%]'` to `'w-[30%]'` (the other two branches of each already sum correctly and are unchanged). Replace the `let actionsColumnWidth = 'w-[12%]'` plus the `if (showBudgets) { ...; actionsColumnWidth = 'w-[6%]' }` reassignment with a single `const actionsColumnWidth = 'w-[6%]'` declared once, used unconditionally wherever the `actions` column is pushed; keep the `budgets` column's own width logic (`canManage ? 'w-[44%]' : 'w-[48%]'`) untouched. Resulting sums: canManage&&showBudgets = 4+24+22+44+6=100; canManage&&!showBudgets = 4+60+30+6=100; !canManage&&showBudgets = 28+24+48=100; !canManage&&!showBudgets = 52+48=100.

- [ ] **Step 4: Rewrite `customRenderColumns.actions` (lines 610-661).** Replace the whole function body with:

```tsx
actions: (user: UserListItem) => {
  const isCreator = user.id === project.created_by
  const memberName = user.name || user.username

  const menuItems: NavigationMenuItem[] = []

  if (isEnterpriseEdition()) {
    menuItems.push({
      title: 'View analytics',
      icon: <AnalyticsSvg className="w-[18px] h-[18px]" />,
      href: getAnalyticsMemberLink(router, project.name, user.id, memberBudgets),
      tooltip: `View analytics for ${memberName}`,
      disabled: !budgetsLoaded,
    })
  }

  menuItems.push({ title: `divider-${user.id}`, divider: true })

  menuItems.push({
    title: 'Unassign from Project',
    icon: <DeleteSvg className="w-[18px] h-[18px]" />,
    onClick: () => handleDeleteUser(user),
    disabled: isCreator || isPersonal || !canManageProject,
    tooltip: isCreator
      ? 'Project creator cannot be unassigned'
      : isPersonal
        ? personalProjectTooltip('unassign from')
        : undefined,
  })

  return (
    <div
      role="presentation"
      className="flex items-center justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <NavigationMore
        renderInRoot
        hideOnClickInside
        items={menuItems}
        data-tooltip-content="More options"
        contextId={`user-more-${user.id}`}
      />
    </div>
  )
},
```
  Update the `useMemo` dependency array (previously lines 663-677) to: `[project, canManageProject, isPersonal, handleDeleteUser, memberBudgets, budgetsLoaded, router, currentUser?.userId, isProjectAdmin, getUserRole, handleRoleChange, budgetAllocationLookup, spendingByUserId]` — i.e. keep every dependency the `role`/`user`/`budgets` cells in the same `customRenderColumns` object already read (unchanged from before), drop none, and confirm `project` covers `project.created_by`/`project.name` reads inside `actions`.

- [ ] **Step 5: Run and confirm pass** — `npx vitest run src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersViewAnalytics.integration.test.tsx` then `npx vitest run src/components/NavigationMore/__tests__/NavigationMore.test.tsx`. Expected: both PASS.

- [ ] **Step 6: Commit.**

---

## Self-review

**Spec coverage:** Task 1 covers the `NavigationMore` union/divider/href contract; Task 2 covers every sub-item (a)-(g) of the ticket's test-rework point; Task 3 covers the column-width rebalance and the `menuItems` contract (analytics item always enabled-when-loaded incl. creator row; divider; Unassign always present, disabled+tooltipped for creator/personal). No ticket requirement lacks a task.

**Negative constraints:**
- No `href`/`divider` regression for existing plain-item call sites → Task 1 Step 3 keeps the `else` branch as the original `<button>` path, only relaxing `onClick` to optional; Task 1's own suite (unchanged prior tests) re-runs green in Step 4.
- No red/error styling on "Unassign from Project" → Task 3 Step 4 passes no `className` override on that item, and Task 2 Step 1 case 7 asserts the absence of an error/red class.
- No hiding of "View analytics" for the creator row → Task 3 Step 4 never gates the analytics `menuItems.push` on `isCreator`; Task 2 case 7 asserts it directly.
- No silent creator-row omission of "Unassign" (old `{!isCreator && ...}` behavior) → Task 3 Step 4 always pushes the Unassign item, disabling instead of omitting; Task 2 case 7 asserts presence+disabled, not absence.
- No " in {project.name}" tooltip suffix → Task 3 Step 4's `tooltip` template omits it; Task 2 case 1 asserts the exact string.
- No changes to `getAnalyticsMemberLink`, `isEnterpriseEdition`, budget/store logic, or backend code → no task touches those files.
- No whole-suite gate/browser/review/commit-format task added → none present; verification commands are listed once in the header for the executor to run outside this plan.
