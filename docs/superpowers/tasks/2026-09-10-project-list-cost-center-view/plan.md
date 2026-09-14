# Project Management List — Two-Line Name Cell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development
> (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Change the `name` column of the Project Management admin list to show the project's
display name as a bold, clickable primary line and the project code as a de-emphasized secondary
line beneath it, matching the pattern already used for cost centers' linked-projects table.

**Architecture:** Single-file change. `ProjectNameCell` in `ProjectsManagementFull.tsx` swaps its
call to `formatProjectLabel` (one-line "code (display name)") for `getProjectDisplayName` (display
name only) plus a conditional secondary `<span>` carrying the project code, both passed as children
into the existing `NameLinkCell` button so the current click/navigation behavior is untouched.

**Tech Stack:** React 18, TypeScript, Tailwind, Vitest + React Testing Library.

**Spec:** No spec.md — requirements arrived as inline text, reproduced in the Acceptance criteria
below. Technical analysis:
`docs/superpowers/tasks/2026-09-10-project-list-cost-center-view/technical-analysis.md`.

**Commit per task using the repository's existing convention.**

## Global Constraints

- Do not modify `formatProjectLabel` or its other call sites (`ProjectSelector.tsx`,
  `useProjectOptions.ts`, `useResolvedProjectOptions.ts`) — single-line labels there are correct.
- Do not modify `CostCenterProjectsManager.tsx` or `UserProjectsTable.tsx`.
- Do not change `NameLinkCell.tsx`'s styling (bold + underline stays the primary-line affordance).
- Preserve existing click/navigation behavior of the name cell.

---

## Acceptance criteria

- [ ] The `name` column's primary line shows the project's display name (via
      `getProjectDisplayName`), styled with the existing bold/underline `NameLinkCell` affordance.
- [ ] When `project.display_name` is set, a secondary line below it shows the plain project code
      (`project.name`), visually de-emphasized (quaternary text color, smaller size).
- [ ] When `project.display_name` is not set, only the single primary line renders (no empty
      secondary line) — `getProjectDisplayName` already falls back to `project.name` for that line.
- [ ] Clicking the primary line still calls `onOpenDetails(item.name)` exactly as before.
- [ ] `formatProjectLabel` and its three other call sites are unchanged.
- [ ] `CostCenterProjectsManager.tsx` and `UserProjectsTable.tsx` are unchanged.
- [ ] A test asserts the name column renders both the display name and the project code for a
      project fixture with `display_name` set.

---

### Task 1: Two-line name cell in ProjectsManagementFull.tsx

**Files:**
- Modify: `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:50`
  (import) and `:133-143` (`ProjectNameCell`)
- Test: `src/pages/settings/administration/projectsManagement/__tests__/ProjectsManagementFull.test.tsx`

**Interfaces:**
- Consumes: `getProjectDisplayName(project: { name: string; display_name?: string | null }): string`
  from `@/utils/projectDisplayName` (already exported, used unchanged from its current signature).
- Produces: no new exports; `ProjectNameCell` and `renderProjectNameColumn` keep their existing
  names and signatures so `customRenderColumns.name` at line 438 needs no change.

**Test-first: yes — the name column must render both the display name and the project code when
`display_name` is set, which no existing test asserts.**

- [ ] Step 1: Extend the `@/components/Table` mock (around line 58-68 of the test file) so it also
  invokes `customRenderColumns?.name?.(item)` alongside the existing `assignments` call, rendered
  into the same per-row `data-testid={`row-${item.name}`}` div. Add a second fixture,
  `mockProjectWithDisplayName = { ...mockProject, name: 'my-project', display_name: 'My Project' }`,
  and a new test:

```tsx
it('renders the project display name and code as a two-line name cell', () => {
  vi.mocked(useSnapshot).mockImplementation((store) => {
    if (store === projectsStore) {
      return {
        projects: [mockProjectWithDisplayName],
        pagination: { page: 1, perPage: 10, total: 1, totalPages: 1 },
        loading: false,
      }
    }
    if (store === userStore) return { user: { platform_role: 'admin', isAdmin: true } }
    return {}
  })
  render(
    <MemoryRouter>
      <ProjectsManagementFull />
    </MemoryRouter>
  )
  const row = screen.getByTestId('row-my-project')
  expect(row).toHaveTextContent('My Project')
  expect(row).toHaveTextContent('my-project')
})
```

  Run `npm run test -- ProjectsManagementFull.test.tsx` and confirm this new test fails (the current
  renderer produces `my-project (My Project)` on one line via `formatProjectLabel`, which already
  contains both substrings as text — so instead assert the secondary line's element/class directly:
  replace the last two `expect` lines with
  `expect(row.querySelector('.text-text-quaternary')?.textContent).toBe('my-project')` and
  `expect(row).toHaveTextContent('My Project')`). Confirm this fails because no
  `.text-text-quaternary` element exists yet.

- [ ] Step 2: In `ProjectsManagementFull.tsx`, replace the `formatProjectLabel` import on line 50
  with `getProjectDisplayName` (same module, `@/utils/projectDisplayName`), and rewrite
  `ProjectNameCell` (lines 133-143) to:

```tsx
const ProjectNameCell = ({
  item,
  onOpenDetails,
}: {
  item: Project
  onOpenDetails: (name: string) => void
}) => (
  <span id={`project-name-${item.id}`}>
    <NameLinkCell onClick={() => onOpenDetails(item.name)}>
      {getProjectDisplayName(item)}
      {item.display_name && (
        <span className="block text-xs text-text-quaternary">{item.name}</span>
      )}
    </NameLinkCell>
  </span>
)
```

  `renderProjectNameColumn` (line 145-146) is unchanged — it already just forwards `item` and
  `onOpenDetails` to `ProjectNameCell`.

- [ ] Step 3: Run `npm run test -- ProjectsManagementFull.test.tsx` and confirm all tests pass,
  including the new one and the pre-existing tests that use `mockProject` (no `display_name`,
  so no secondary line renders and the row still shows only `my-project`).

- [ ] Step 4: Commit per the repository's existing convention.

---

## Negative constraints checked

- **Do not touch `formatProjectLabel` or its other call sites** — Task 1 removes the import of
  `formatProjectLabel` from `ProjectsManagementFull.tsx` only; the function itself and its
  consumers in `ProjectSelector.tsx`, `useProjectOptions.ts`, `useResolvedProjectOptions.ts` are
  not opened or edited by any task.
- **Do not adopt `CostCenterProjectsManager`'s accent-color button style** — Task 1 keeps
  `NameLinkCell` (bold + underline) as the primary-line wrapper; no button markup or class from
  `CostCenterProjectsManager.tsx` is introduced.
- **Do not refactor `CostCenterProjectsManager.tsx` or `UserProjectsTable.tsx`** — no task lists
  either file under Files: Modify; both stay untouched.
- **Do not remove click/navigation behavior** — `onOpenDetails(item.name)` remains the `onClick`
  passed to `NameLinkCell` in Task 1's rewritten `ProjectNameCell`; the acceptance criteria and
  Step 3's regression run over the existing tests confirm this.
- **Do not break `table-fixed` row layout** — the secondary `<span className="block ...">` adds
  height, not width; `table-fixed` only fixes column widths (per the technical analysis), so no
  column-width or table-primitive change is needed or made by this plan.
