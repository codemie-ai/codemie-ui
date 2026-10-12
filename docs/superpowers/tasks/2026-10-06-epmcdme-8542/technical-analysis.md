# Technical Research

**Task**: integrations table accessibility aria-label
**Generated**: 2026-10-06
**Research path**: filesystem

---

## 1. Original Context

Ticket EPMCDME-8542 — [4.1.2] Table does not have an accessible name.

Pre-condition: at least one integration is created; screen reader is turned on.

Steps to Reproduce:
1. Open the Integrations page (tab=integrations) as an authorised user.
2. Navigate to the table and listen to the screen reader announcement.

Actual result: Screen reader announces only numbers of rows and columns.
Expected result: Screen reader should announce the table's name (the name may be visible or hidden for screen-reader-only).

Notes: Also reproducible for the Data Source table and the Workflow Details table.

No separate acceptance criteria section was provided; the expected result above is the acceptance criterion. This is an accessibility (a11y) fix — likely needs an accessible name (e.g. aria-label, aria-labelledby, or a visually-hidden caption/heading) applied to the table(s) on the Integrations page, Data Source page, and Workflow Details page.

---

## 2. Codebase Findings

### Existing Implementations

All three tables named in the ticket render through one shared component, `src/components/Table/Table.tsx`, which renders a plain `<table>` element (line ~220) with no `aria-label`, `aria-labelledby`, or `<caption>` of any kind. This is the single root cause for all three reported instances, not three separate bugs:

- **Integrations page** (`src/pages/integrations/IntegrationsPage.tsx`) renders `IntegrationsTab.tsx`, which in turn renders either:
  - `src/pages/integrations/components/UserSettings/UserSettings.tsx` (line 225, `<Table ... />`)
  - `src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` (line 249, `<Table ... />`)
- **Data Source page**: `src/pages/dataSources/DataSourcesPage.tsx` (line 182, `<Table<DataSource> ... />`)
- **Workflow Details page**: `src/pages/workflows/components/WorkflowExecutionsTable.tsx` (line 139, `<Table ... />`), rendered from `src/pages/workflows/components/ViewWorkflow.tsx` as one tab of the Workflow Details view.

None of these four call sites pass any prop resembling an accessible name today — `grep` for `ariaLabel`/`aria-label` across `src/components/Table/` and all four call sites returns nothing on the `<table>`/`<Table>` itself (icon buttons elsewhere, e.g. `BulkActions.tsx`, `TableCell.tsx`'s expand/collapse button, already carry `aria-label`, showing the pattern is known and used elsewhere in the same component family — just not applied to the table element).

### Architecture and Layers Affected

- **Shared UI component layer**: `src/components/Table/Table.tsx` (the table markup itself), and its sibling `TableCardList.tsx` (used for the mobile card layout fallback — renders `role`/`aria-labelledby` per-card already at line 169, via `titleId`, so no table semantics apply there and it is out of scope).
- **Page/feature layer**: the four call sites listed above supply `columnDefinitions`, `items`, etc. to `<Table>`; a page/feature-level change (plumbing a label through) is required in addition to the shared component change.

### Integration Points

No external services are involved — this is a presentation-layer, local-DOM-only change. `Table` has no dependency on backend data for naming; the label is static text decided by each page.

### Patterns and Conventions

- `TableCardList.tsx` already demonstrates the `aria-labelledby` pattern tying a card's semantic grouping to a visible title element's `id` (`titleId`) — the same `aria-labelledby`-to-an-existing-heading approach could be reused for the `<table>` if a visible heading sits immediately above it; otherwise a plain `aria-label` string prop is the simpler fit, matching the existing icon-button convention (`aria-label='Delete item'` style) documented in `.ai-run/guides/patterns/accessibility-patterns.md`.
- Each page already has a human-readable name available with no new copy to invent:
  - `IntegrationsPage.tsx` renders `<Sidebar title="Integrations" ...>`; the User/Project settings tables inside it would need a more specific name per sub-table (e.g. "User integrations" / "Project integrations").
  - `DataSourcesPage.tsx` renders `<Sidebar title="Data Sources" ...>`.
  - `WorkflowExecutionsTable.tsx` has no visible heading of its own currently (it is one tab inside `ViewWorkflow.tsx`); "Workflow executions" is the natural name.
- `Table` is a generically typed, memoized component (`memo(Table, propsAreEqual)`) consumed by many other pages beyond these three (settings/administration tables, scheduler tables, analytics tables, etc. — see Step 2 glob results), so a new prop must be optional and default to not breaking any existing caller.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/patterns/accessibility-patterns.md` is the relevant guide. It gives a pre-delivery checklist and an ARIA quick-reference table (`aria-label` for "no visible text label", `aria-labelledby` for "region labeled by another element") and a worked example of cross-component id-sharing for `aria-labelledby` (the `NavigationMore`/heading pattern), including an explicit decision tree for where to generate a shared id depending on component ownership. It does not mention tables specifically, but its decision tree is directly applicable if `aria-labelledby` is chosen over `aria-label`.

### Architectural Decisions

No ADR or inline comment addresses table naming. No HACK/TODO markers were found near `Table.tsx`.

### Derived Conventions

- Prefer the simplest working ARIA attribute: for a decorative-free, always-rendered static name with no existing visible heading tied to the table, `aria-label` on the `<table>` is the convention already used for icon buttons in this codebase, and avoids the id-sharing hazard the guide warns about for `aria-labelledby` across files.
- Component props follow a plain-named-prop style in `Table.tsx` (`className`, `tableClassName`, `footer`, etc.) — a new `ariaLabel?: string` prop fits this existing shape.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/dataSources/__tests__/DataSourcesPage.accessibility.test.tsx` exists but only covers an unrelated `aria-live` announcement region (it mocks `@/components/Table` out entirely with `vi.mock('@/components/Table', () => ({ default: () => null }))`), so it provides no coverage of table naming today and would not catch a regression here.
- `src/pages/integrations/components/UserSettings/__tests__/UserSettings.accessibility.test.tsx` and `src/pages/integrations/components/ProjectSettings/__tests__/ProjectSettingActionsCell.accessibility.test.tsx` exist but (by name) target action-cell/icon-button accessibility, not the table element's name.
- `src/pages/dataSources/components/__tests__/DataSourceActions.accessibility.test.tsx` similarly targets row actions, not the table itself.
- No test anywhere was found asserting an accessible name (`aria-label`/`aria-labelledby`) on the `<table>` element rendered by `Table.tsx`.

### Testing Framework and Patterns

Vitest + React Testing Library, with a dedicated `*.accessibility.test.tsx` naming convention already established per-feature (one such file sits next to several of the affected components), suggesting the fix's test should follow the same naming convention, likely added for `Table.tsx` directly plus one per affected page if page-level labels need per-page assertions.

### Coverage Gaps

No existing test render-queries `document.querySelector('table')` or checks `getByRole('table', { name: ... })`. This is a clean gap: implementing the fix with no accompanying test would leave accessible-name regressions silently reintroducible.

---

## 5. Configuration and Environment

### Environment Variables

None relevant — this is a static UI/markup change with no runtime or build-time configuration involved.

### Configuration Files

None relevant.

### Feature Flags and Deployment Concerns

None found. No flag gates the Table component or any of the three affected pages.

---

## 6. Risk Indicators

- `Table.tsx` is a shared, heavily reused component (dozens of call sites found via the `<table` glob across `settings/administration`, `schedulers`, `analytics`, `katas`, etc.). Speculative: adding an optional `ariaLabel` prop with no default should be safe for existing callers, but every one of the three named call sites (and ideally all other callers, for consistency) will need an explicit label passed, which is a multi-file but mechanically repetitive change.
- Speculative: the Integrations page has two distinct tables behind one tab (User settings vs Project settings) — a single generic "Integrations table" label for both would be technically compliant but less useful than two distinct names; this is a product/UX call, not a research finding.
- No test today exercises table semantics, so the fix is not caught by any existing gate — a regression test is advisable but is a design/plan decision, not stated here as a requirement.
- `TableCardList.tsx` (the mobile-card fallback rendered instead of `<table>` on narrow screens, see `Table.tsx` lines ~180–218) does not use `<table>` markup at all, so a screen-reader table-name fix on `<table>` will not apply when the mobile card layout is active; whether that is in scope for this ticket depends on the device/viewport the pre-condition was reproduced on, which the ticket does not state.

---

## 7. Summary for Complexity Assessment

This is a presentation-layer-only accessibility fix touching one shared component (`src/components/Table/Table.tsx`) and the four page/feature call sites that render the three tables named in the ticket (`UserSettings.tsx`, `ProjectSettings.tsx` for Integrations; `DataSourcesPage.tsx` for Data Sources; `WorkflowExecutionsTable.tsx` for Workflow Details). All three reported symptoms share one root cause — the shared `<table>` markup has no `aria-label`/`aria-labelledby`/`<caption>` — so the fix is naturally a single shared-component change (an optional prop) plus one line of label text supplied at each of the three to four call sites, not three independent fixes.

There is no technical novelty: the ARIA pattern (`aria-label` on a static element) is already used elsewhere in this same component family (icon buttons in `BulkActions.tsx`, `TableCell.tsx`) and documented in `.ai-run/guides/patterns/accessibility-patterns.md`. No backend, config, or integration-point changes are involved.

The main risk is coverage, not complexity: no existing test asserts an accessible name on any table, and the one `*.accessibility.test.tsx` file that touches the Data Sources page mocks the `Table` component out entirely, so it would not catch a regression. A secondary open question (not a blocker) is whether the mobile card-list fallback, which renders no `<table>` element at all, is in scope for the same fix.

---

## 8. External References

None named by the task.
