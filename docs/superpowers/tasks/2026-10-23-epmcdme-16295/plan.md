# EPMCDME-16295 — Default Project Chip Label Wrapping Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop the "Default" label in the Users management Projects-cell chip from wrapping mid-word, by isolating it onto its own non-breaking line above the project-name/role value line.

**Architecture:** Single-file, presentation-only fix inside the shared `DetailsBadge` component: when an `icon` is supplied, stack `icon` above `value` in a `flex-col` wrapper and give the icon line an explicit non-wrapping class so it cannot inherit `break-all`/`whitespace-normal` from the caller's container classes. When no `icon` is supplied (the only other consumer), rendering is unchanged.

**Tech Stack:** React, TypeScript, Tailwind CSS, Vitest + React Testing Library (unit project).

**Requirements:** inline ticket text (EPMCDME-16295), no spec.md for this task. Technical analysis: `docs/superpowers/tasks/2026-10-23-epmcdme-16295/technical-analysis.md`.

## Global Constraints

- Do not remove or weaken `break-all`/`whitespace-normal` on the value line (project name + role) — only the "Default" label line must stop wrapping.
- Do not change `src/components/details/BudgetOverrideIndicator.tsx`'s rendering — it never passes `icon`, so its layout must stay single-line, unchanged.
- Preserve `data-testid="default-project-marker"` and the `.closest('a, div')` traversal relied on by `src/pages/settings/administration/__tests__/UsersManagementDefaultProject.integration.test.tsx`.
- Commit per task using the repository's existing convention.

## Review Focus

- Long project name + role value must still wrap/break onto multiple lines (not accidentally frozen to `nowrap` by the new layout).
- A user with only one project (no overflow "+N" chip) must still render the chip correctly.
- The `BudgetOverrideIndicator` chip (`icon` absent) must render identically to today — no stray `flex-col` wrapper appears when there's no icon.
- The existing `UsersManagementDefaultProject.integration.test.tsx` assertions (`default-project-marker` testid presence/absence, `closest('a, div')`, exact-text lookups like `'project-a (user)'`) must keep passing unmodified.
- Chip alignment: label line and value line must sit in the same chip, not drift apart or double the chip's padding/border.

---

## Acceptance criteria

- [ ] The "Default" label renders as one intact word (no mid-word break) in every row of the Projects cell, including with the narrowest realistic column width.
- [ ] The label line and the value line (project name + role) are visually part of the same chip, consistently aligned across rows.
- [ ] The Projects cell renders correctly for users with exactly one project and for users with several projects (including the ">MAX_DISPLAYED_PROJECTS" overflow case).
- [ ] No other column or action in the Users management table changes behavior (in particular `BudgetOverrideIndicator`, the only other `DetailsBadge` consumer).

---

### Task 1: Isolate the "Default" label onto its own non-wrapping line in `DetailsBadge`

**Files:**
- Create: `src/components/details/__tests__/DetailsBadge.test.tsx`
- Modify: `src/components/details/DetailsBadge.tsx:36-40` (the `content` fragment)

**Interfaces:**
- Consumes: existing `DetailsBadgeProps` (`value`, `icon?`, `filled?`, `className?`, `href?`) — unchanged signature.
- Produces: no new exports; same default export `DetailsBadge`. Later work (if any) can keep passing `icon`/`value` exactly as `UsersManagementPage.tsx:307-311` already does — no change needed there.

- [ ] **Step 1: Write the failing test**

In the new file, using plain `render`/`screen` from `@testing-library/react` (see `src/components/form/Select/__tests__/Select.test.tsx` for the house style):

```tsx
it('keeps the icon/label on its own non-wrapping line, separate from the wrapping value', () => {
  render(
    <DetailsBadge
      icon={<span data-testid="marker">Default</span>}
      value="a-very-long-project-name (admin)"
      className="whitespace-normal break-all"
    />
  )
  const marker = screen.getByTestId('marker')
  const labelLine = marker.parentElement
  expect(labelLine?.className).toMatch(/whitespace-nowrap/)
  expect(labelLine?.textContent).toBe('Default')
  expect(screen.getByText('a-very-long-project-name (admin)')).toBeInTheDocument()
})

it('falls back to the original single-line layout when no icon is passed', () => {
  render(<DetailsBadge value="Overridden" className="text-xs" />)
  expect(screen.queryByText('Default')).toBeNull()
  expect(screen.getByText('Overridden')).toBeInTheDocument()
})
```

- [ ] **Step 2: Run test to verify the first case fails**

Run: `npx vitest run --project unit src/components/details/__tests__/DetailsBadge.test.tsx`
Expected: FAIL on the first test — today `labelLine` is the single flex-row container itself (whose `className` carries `break-all`, not `whitespace-nowrap`), and `labelLine.textContent` is `"Default a-very-long-project-name (admin)"`, not `"Default"`.

- [ ] **Step 3: Implement the stacked layout in `src/components/details/DetailsBadge.tsx`**

Replace the `content` fragment (lines 36-40) so that when `icon` is truthy, it renders:

```tsx
const content = icon ? (
  <div className="flex flex-col gap-0.5">
    <div className="whitespace-nowrap break-normal">{icon}</div>
    <div>{String(value)}</div>
  </div>
) : (
  String(value)
)
```

The value line keeps inheriting whatever `whitespace-normal`/`break-all` the caller's `className`/`badgeClassName` sets on the badge container (unchanged behavior); only the icon line gets the explicit override so it can't inherit it. No change is needed to `UsersManagementPage.tsx` — its `badgeClassName` continues to apply to the container and therefore only to the value line.

- [ ] **Step 4: Run the new test file to verify both cases pass**

Run: `npx vitest run --project unit src/components/details/__tests__/DetailsBadge.test.tsx`
Expected: PASS (2/2).

- [ ] **Step 5: Run the existing integration test to confirm no regression**

Run: `npx vitest run --project integration src/pages/settings/administration/__tests__/UsersManagementDefaultProject.integration.test.tsx`
Expected: PASS (both existing tests) — `default-project-marker` presence/absence and the exact-text lookups (`'project-a (user)'`, `'delta (user)'`) must be unaffected by the new nested `<div>`s, since `getByText` matches the leaf element whose own text equals the string.

- [ ] **Step 6: Commit**

Commit the new test file and the `DetailsBadge.tsx` change together, following the repository's existing commit convention.
