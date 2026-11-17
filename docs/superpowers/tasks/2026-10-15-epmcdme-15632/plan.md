# Cost Center Project-Count Badge Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the `project_count` cell on `CostCentersManagementPage`'s list a clickable
`ResourceCounterBadge` that navigates to Project Management pre-filtered by that cost center.

**Architecture:** One column's `DefinitionTypes.String` cell becomes `DefinitionTypes.Custom`,
rendering the existing, unmodified `ResourceCounterBadge` (imported cross-folder from
`projectsManagement/`). The badge's `to` is built with the same `router.resolve({ name, query })`
+ `searchParamsString` concatenation `ProjectResourceCounters.tsx` already uses, targeting route
`'projects-management'` with `query: { cost_center_ids: costCenter.id }`. The destination
(`ProjectsManagementFull` + `useProjectsFilters` + `CostCenterFilter`, built by EPMCDME-15631) is
consumed read-only — no changes there.

**Tech Stack:** React, TypeScript, react-router (`useVueRouter` wrapper), Vitest + React Testing
Library + `MemoryRouter`.

**Requirements:** EPMCDME-15632 (inline requirements text, no spec.md — see Acceptance criteria
below) + Stage 1 technical analysis at
`docs/superpowers/tasks/2026-10-15-epmcdme-15632/technical-analysis.md`.

## Acceptance criteria

- [ ] Cost Centers list's `project_count` cell renders `ResourceCounterBadge` (not plain text).
- [ ] Clicking the badge navigates to Project Management with `cost_center_ids=<id>` in the URL,
      no manual filter selection required.
- [ ] A cost center with `project_count: 0` renders a badge showing `0` that is still a clickable
      link to the same filtered destination.
- [ ] On the destination, `CostCenterFilter` shows the pre-applied cost center as a selected
      chip/value (existing EPMCDME-15631 behavior, exercised not modified).
- [ ] Nothing added special-cases a badge-originated filter vs. a UI-set one — none of this
      plan's changes touch `useProjectsFilters.ts` or `utils/filters.ts`.

## Global Constraints

- Reuse `ResourceCounterBadge` from `src/pages/settings/administration/projectsManagement/ResourceCounterBadge.tsx`
  unmodified — do not relocate or edit it.
- Do not touch `CostCenterDetailsPage.tsx`, `useProjectsFilters.ts`, `utils/filters.ts`,
  `CostCenterFilter.tsx`, or `ProjectsManagementFull.tsx` — the destination filter contract is
  EPMCDME-15631's work and must be consumed as-is.
- Do not add any role/access-control check to `CostCentersManagementPage` or its route.
- Do not change how `project_count` is calculated, stored, or typed.
- Commit per task using the repository's existing convention (ticket-prefixed subject); no
  separate commit task is listed below.

## Review Focus

- Zero-count cost center: badge must render `0` and remain a real `<Link>` (not disabled) —
  covered by Task 1's zero-count test.
- `project_count` is a non-optional `number` on `CostCenterListItem`, but `ResourceCounterBadge`'s
  `count` prop is `number | undefined` — passing it directly is a widening assignment, not a type
  error; no coercion needed, but the test should assert the exact rendered digit, not just
  "truthy".
- The `to` string must be built via `router.resolve` + `searchParamsString`, never a hand-built
  template string, so the query-encoding stays consistent with `ProjectResourceCounters.tsx` —
  covered by Task 1's `to`-attribute assertion.
- `customRenderColumns`'s `useMemo` dependency array must include whatever the new cell closure
  reads (just `costCenter`/`router`, no new reactive dependency) — reviewed in Task 1, no state
  added so the existing deps array is unaffected beyond adding `router` if used inside, confirmed
  while implementing.
- The cross-folder import (`administration/` importing from `administration/projectsManagement/`)
  must not become a round-trip import (`projectsManagement/` importing back from
  `administration/`) — Task 1 only adds an import, never changes `projectsManagement/`.

**negative-constraints: covered above (no relocation/edit of `ResourceCounterBadge`; no changes to
EPMCDME-15631's filter files; no new role gate; no change to count calculation) — all honored by
confining Task 1 to `CostCentersManagementPage.tsx` and its new test file only.**

---

### Task 1: Clickable project-count badge on Cost Centers list

**Files:**
- Modify: `src/pages/settings/administration/CostCentersManagementPage.tsx:49-54` (column type),
  `:148-198` (customRenderColumns)
- Test: `src/pages/settings/administration/__tests__/CostCentersManagementPage.test.tsx` (new)

**Interfaces:**
- Consumes: `ResourceCounterBadge` from
  `@/pages/settings/administration/projectsManagement/ResourceCounterBadge` — props
  `{ icon, count: number | undefined, tooltip: string, to: string }` (unchanged).
  `useVueRouter().resolve({ name, query })` → `{ path, searchParamsString }` (already imported as
  `router` in this file, line 76).
- Produces: nothing new consumed elsewhere — this is the leaf change for the ticket.

Test-first: yes — no test file exists for this page yet; write it before changing the column.

- [ ] **Step 1: Write the failing test file**

Create `CostCentersManagementPage.test.tsx` mocking `@/store/costCenters` (`getCostCenters`
resolving a `PaginatedResponse<CostCenterListItem>` with two rows: one `project_count: 3`, one
`project_count: 0`), rendered inside `MemoryRouter`. Assert:
  - the row with `project_count: 3` renders a link showing `3`, with `href` containing
    `/settings/administration/projects` and `cost_center_ids=<that row's id>`;
  - the row with `project_count: 0` renders a link showing `0` with the same `href` shape for its
    own id (not disabled, still a real link).

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run --project unit src/pages/settings/administration/__tests__/CostCentersManagementPage.test.tsx`
Expected: FAIL — cell currently renders plain text, no `link` role exists for `project_count`.

- [ ] **Step 3: Implement the badge cell**

In `CostCentersManagementPage.tsx`:
- Change the `project_count` entry (lines 49-54) from `type: DefinitionTypes.String` to
  `type: DefinitionTypes.Custom`.
- Import `ResourceCounterBadge` from
  `@/pages/settings/administration/projectsManagement/ResourceCounterBadge` and an existing icon
  (`ProjectManagementSvg` from `@/assets/icons/project_management.svg?react`).
- Add a `project_count` entry to the `customRenderColumns` useMemo (alongside `name`,
  `description`, `actions`), building `to` the same way `ProjectResourceCounters.buildTo` does:

```tsx
project_count: (costCenter: CostCenterListItem) => {
  const { path, searchParamsString } = router.resolve({
    name: 'projects-management',
    query: { cost_center_ids: costCenter.id },
  })
  return (
    <ResourceCounterBadge
      icon={ProjectManagementSvg}
      count={costCenter.project_count}
      tooltip="Projects"
      to={searchParamsString ? `${path}?${searchParamsString}` : path}
    />
  )
},
```

Add `router` to the `useMemo`'s dependency array alongside `handleCostCenterOpen`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run --project unit src/pages/settings/administration/__tests__/CostCentersManagementPage.test.tsx`
Expected: PASS

- [ ] **Step 5: Commit**

Commit the modified page and the new test file together, following the repository's existing
ticket-prefixed commit convention.

## Addendum (2026-11-13): role-gated link

After rebasing on main, EPMCDME-15637 introduced a non-link mode for `ResourceCounterBadge` and a
permission-gated Users badge. The user chose to apply the earlier review finding CR-001 (see
`decisions.jsonl`, 2026-11-12). This supersedes the Global Constraints that forbade a role check and
edits to `ProjectsManagementFull.tsx`:

- The badge links only when `canFilterProjectsByCostCenter(user)` (admin or maintainer) passes;
  otherwise it renders the plain, non-link badge with the same count and tooltip.
- `canFilterProjectsByCostCenter` lives in `src/utils/permissions.ts` (tests in
  `src/utils/__tests__/permissions.test.ts`), and `ProjectsManagementFull.tsx` uses it for its own
  `canFilterByCostCenter` (one-line change), so the badge and the destination filter share one rule.
- The gate is defensive: the backend serves `GET /v1/admin/cost-centers` to admins and maintainers
  only (verified 403 for an auditor), and the Settings tab is not built for other roles.
- The feature flag needs no extra check on the badge: the Cost Centers route is wrapped in
  `FeatureGuard` for `FEATURE_FLAGS.COST_CENTERS`, so with the flag off the page and badge never render.

Acceptance criteria above still hold for admins and maintainers. Added: a viewer who is neither sees
the count without a link.
