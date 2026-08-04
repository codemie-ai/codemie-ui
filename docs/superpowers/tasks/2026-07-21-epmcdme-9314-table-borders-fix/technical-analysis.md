# Technical Research

**Task**: table borders integrations datasources
**Generated**: 2026-07-21T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-9314 — Table borders (sliders) are displayed incorrectly on Integrations and Data Sources pages. This is a UI bug where table borders/sliders appear misaligned, incorrectly styled, or rendered where they shouldn't be on the Integrations page and Data Sources page of a React + TypeScript front-end application.

---

## 2. Codebase Findings

### Existing Implementations

**Shared Table component (used on both affected pages):**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/Table/Table.tsx` — outer shell: scroll container (`overflow-auto`), `<table>` with `border-separate border-spacing-0`, sticky `<thead>`, fixed `<Pagination>` bar, loading overlay. No `embedded` prop is passed on either affected page, so `overflow-auto min-h-[300px]` is always active.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/Table/TableColHeader.tsx` — renders `<th>` with `border-t border-b border-border-structural`; adds `border-l` only on the first column and `border-r` only on the last column; rounded top corners on first/last.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/Table/TableCell.tsx` — renders `<td>` with `border-b border-border-structural`; adds `border-l` on column index 0 and `border-r` on the last column; rounded bottom corners on the last row.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/Table/EmptyList.tsx` — empty-state `<td>` with `border-b border-l border-r border-border-structural rounded-bl-lg rounded-br-lg`.

**Page files:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/integrations/IntegrationsPage.tsx` — top-level page; wraps content in `<PageLayout>` and `<IntegrationsTabComponent>`. No direct `<Table>` usage here.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/integrations/IntegrationsTab.tsx` — routes to `<UserSettings>` or `<ProjectSettings>` based on `integrationType`.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/integrations/components/UserSettings/UserSettings.tsx` — renders `<Table>` with pagination; imports `DECIMAL_PAGINATION_OPTIONS`.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/integrations/components/ProjectSettings/ProjectSettings.tsx` — renders `<Table>` with pagination; same pattern as `UserSettings`.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/pages/dataSources/DataSourcesPage.tsx` — renders `<Table<DataSource>>` with pagination directly; uses `DECIMAL_PAGINATION_OPTIONS`.

**Supporting components:**
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/Layouts/Layout/PageLayout.tsx` — wraps page content; the content area has `flex-grow overflow-y-auto show-scroll h-full w-full px-6`. The `show-scroll` class enables visible styled scrollbars for the vertical page scroll. The Table's inner `overflow-auto` div is nested inside this container.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/Pagination/Pagination.tsx` — rendered `fixed bottom-0 right-0` inside `Table.tsx`; left offset is driven by `useSidebarOffsetClass`.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/hooks/useSidebarOffsetClass.ts` — dynamically computes the `left-*` Tailwind class for the pagination bar based on `appInfoStore.sidebarExpanded` and `appInfoStore.navigationExpanded`; starts with `null` (no offset class) until the first `update()` call completes.

### Architecture and Layers Affected

| Layer | Component |
|---|---|
| Page / Route | `IntegrationsPage`, `IntegrationsTab`, `DataSourcesPage` |
| Shared UI Component | `Table`, `TableColHeader`, `TableCell`, `EmptyList`, `Pagination` |
| Layout | `PageLayout` (scroll container, `show-scroll`) |
| Hook | `useSidebarOffsetClass` |
| Global Styles | `src/assets/stylesheets/main.scss` (scrollbar rules) |
| Design Tokens | `tailwind.config.ts` (`border.structural`, `surface.base.*`) |

### Integration Points

- Both `UserSettings` and `ProjectSettings` (Integrations page) and `DataSourcesPage` all import `Table` from `@/components/Table`.
- `Table` internally uses `useSidebarOffsetClass`, which reads `appInfoStore` (Valtio store) to compute the left offset for the fixed `Pagination` bar.
- `PageLayout` is the scroll container for both pages; its `show-scroll` class is on the outer vertical scroll div, but the Table's own `overflow-auto` div for horizontal scroll does **not** carry `show-scroll`.
- The `border-border-structural` color token is defined in `tailwind.config.ts` as a two-value array (dark/light). If the custom appearance engine incorrectly resets any CSS variable that this token resolves to, all borders on both pages would be affected simultaneously.

### Patterns and Conventions

- **`border-separate border-spacing-0`** on `<table>`: this is the intentional pattern for per-cell border control and rounded corners. It requires every cell to explicitly declare its own border sides; any missing side class on a cell creates a visible gap.
- **First/last column asymmetry**: only columns at index `0` and `columnsLength - 1` receive `border-l`/`border-r`. Interior columns rely entirely on adjacent cells' borders — with `border-separate` there are no shared borders, so interior cell sides are genuinely unbounded (no left/right border on inner columns).
- **`sticky top-0 z-20` on `<thead>`**: the header sticks inside the scroll container. The `<tr>` wrapping headers also carries `font-semibold border-y` (a `border-top` and `border-bottom` on the `<tr>` itself) in addition to the `border-t border-b` on each `<th>`. This is redundant and could produce a double-border effect when `border-separate` is in play.
- **Fixed pagination bar**: `Pagination` is rendered at `fixed bottom-0 right-0` with a dynamic `left-*` class. On initial render `useSidebarOffsetClass` returns `null`, so for one React render cycle no `left-*` class is applied — the bar is full-width but without the correct offset, which can appear as misalignment.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/components/component-patterns.md` — available; covers component conventions generally.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/.ai-run/guides/components/reusable-components.md` — available; covers reusable component contracts.
- No guide file specifically dedicated to the `Table` component or its border/scroll model was found.

### Architectural Decisions

- The `border-separate border-spacing-0` pattern was adopted (inferred from code) to enable rounded corners on the table while keeping per-cell border control. This is documented only in code — there is no ADR file for it.
- The choice to hide all non-`show-scroll` scrollbars globally in `main.scss` is a project-wide decision. The Table's horizontal scroll container intentionally (or accidentally) does not opt into `show-scroll`, meaning its scrollbar is hidden in WebKit.

### Derived Conventions

- Table borders are expressed entirely as Tailwind utility classes on `<th>` and `<td>` elements — no separate CSS/SCSS file for the Table.
- Design tokens (colors, spacing) flow through `tailwind.config.ts` CSS variables; never hardcoded hex/rgb values in component files.
- Fixed positioned overlays (Pagination, loading spinner) use `z-40` and rely on the sidebar store for left offset.

---

## 4. Testing Landscape

### Existing Coverage

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/store/__tests__/dataSources.test.ts` — tests the `dataSourceStore` (pagination race condition fix, EPMCDME-12889); no UI/render assertions for the `Table` component itself.
- No test file found directly for `Table.tsx`, `TableColHeader.tsx`, `TableCell.tsx`, or `EmptyList.tsx`.
- No test file found for `useSidebarOffsetClass.ts`.
- No test file found for `IntegrationsPage.tsx`, `UserSettings.tsx`, or `ProjectSettings.tsx`.
- No test file found for `DataSourcesPage.tsx`.

### Testing Framework and Patterns

- The project uses **Vitest** (inferred from `vite.config.ts` presence and standard project setup); test files are co-located under `__tests__/` directories.
- Store-level tests mock API calls and assert on store state; no snapshot or DOM rendering tests observed for table components.

### Coverage Gaps

- The `Table` component has zero test coverage. All border logic, the scroll container behavior, the sticky header, and the fixed pagination offset are untested.
- `useSidebarOffsetClass` has zero test coverage — the `null` initial state and the Valtio subscription are untested.
- `EmptyList`, `TableColHeader`, and `TableCell` have zero test coverage.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables directly govern table rendering, borders, or scrollbar visibility. The appearance system (EPMCDME-12541) reads from `localStorage` (key pattern for custom appearance) and applies CSS variable overrides on app boot — this is runtime configuration, not environment variables.

### Configuration Files

- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/tailwind.config.ts` — defines all design tokens including `border.structural` (the token used for all table borders), `surface.base.secondary` (table cell backgrounds), `surface.base.tertiary` (header background), and `surface.specific.table.header`. Any change here affects every table on every page simultaneously.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/assets/stylesheets/main.scss` — global scrollbar suppression rule at the `html/body/#app` level. The `.show-scroll` class definition appears twice (inside and outside the `html/body/#app` block), with the inner one (inside the block) providing the full styled scrollbar and the outer one providing a partial override.
- `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/assets/stylesheets/_codemie-custom.scss` — introduced by EPMCDME-12541; not inspected in full but feeds into `main.scss` via `@use`.

### Feature Flags and Deployment Concerns

- The custom appearance feature (EPMCDME-12541) stores user preferences in `localStorage`. If a user had custom appearance active before the fix, their stored values persist across sessions. The `apply.ts` utility resets CSS vars from `localStorage` on every app boot, which could interfere with Tailwind-generated CSS variable values for border tokens.
- No feature flags gating the table component itself were found.

---

## 6. Risk Indicators

- **`border-separate` model requires exhaustive per-cell border declarations**: with `border-separate border-spacing-0` on the `<table>`, there are no shared borders between adjacent cells. The current implementation only adds `border-l`/`border-r` on the first and last columns. Interior columns have no left or right border class — this is correct only if interior vertical lines are intentionally absent. If the design requires vertical lines between all columns, this is a structural gap.
- **Redundant `border-y` on the `<tr>` wrapping header cells**: `Table.tsx` line 149 applies `border-y` on the `<tr>`, but each `<th>` inside it independently applies `border-t border-b border-border-structural`. Under `border-separate`, `<tr>` borders are typically ignored (only cell borders render). This redundancy is harmless but potentially confusing; if a CSS reset or PrimeReact base style changes this behavior, the header row could render a double border.
- **`useSidebarOffsetClass` returns `null` on first render**: the fixed `Pagination` bar receives `className={cn('fixed bottom-0 right-0 ...', null)}` on the first render, meaning it briefly renders without any `left-*` class (full-width, flush to the left edge of the viewport). This is a flash/misalignment that could be reported as "pagination slider displayed incorrectly."
- **Table scroll container lacks `show-scroll`**: the `overflow-auto` div inside `Table.tsx` (line 137) has no `show-scroll` class. The global WebKit rule in `main.scss` hides all scrollbars on `html/body/#app` children unless they carry `.show-scroll`. The table's horizontal scrollbar is therefore invisible in Chrome/Safari but may render as a visible but unthemed native scrollbar in Firefox or certain OS configurations. This is the most likely candidate for "sliders displayed incorrectly" — the horizontal scroll indicator is either invisible or rendered as an unstyled native bar depending on browser.
- **Custom appearance engine writes to `--colors-surface-specific-table-header`**: `EPMCDME-12541` introduced `rules.ts` which maps the `dropdownHoverBackground` custom appearance rule to `--colors-surface-specific-table-header` (among others). The Tailwind token `surface.specific.table.header` resolves to a neutral color that the `<thead>` does not currently use directly (it uses `bg-surface-base-tertiary`), but if any other component references this CSS var and the appearance engine overrides it, visual inconsistency can spread.
- **No tests for the Table component, its border logic, or `useSidebarOffsetClass`**: any fix to border classes or scroll behavior cannot be verified by the test suite. Regression risk for the fix itself is elevated.
- **`main.scss` defines `.show-scroll` twice** (lines 70–89 inside `html/body/#app`, and lines 92–112 at root scope). The outer block has slightly different properties (missing `height` on `::-webkit-scrollbar`, no `border`). Depending on specificity and cascade order, the actual scrollbar appearance may differ from what either definition intends.
- **No dedicated CSS file for the Table component**: all border and layout logic is inline Tailwind in `.tsx` files, making it harder to find and audit all affected rules in a single place.

---

## 7. Summary for Complexity Assessment

The bug affects both the Integrations page and the Data Sources page because they share a single `Table` component at `/Users/Aliaksei_Hurynovich/Developer/_codemie/codemie-ui/src/components/Table/Table.tsx`. The rendering model uses Tailwind utility classes exclusively — `border-separate border-spacing-0` on the `<table>` with per-cell `border-*` classes on `<th>` (in `TableColHeader.tsx`) and `<td>` (in `TableCell.tsx`). There are no co-located CSS/SCSS files for the Table; all changes would touch `.tsx` files. The most likely root causes are: (1) the `overflow-auto` scroll container inside `Table.tsx` lacks the `show-scroll` class, causing the horizontal scrollbar ("slider") to be invisible in WebKit browsers or to render as an unstyled native element in Firefox; and (2) the fixed `Pagination` bar uses `useSidebarOffsetClass` which returns `null` on the first render cycle, causing a brief misalignment flash. The fix surface is small: primarily `Table.tsx` (add `show-scroll` to the scroll container div) and optionally `useSidebarOffsetClass.ts` (initialize to a sensible default rather than `null`). The `tailwind.config.ts` and `main.scss` should be audited for the duplicate `.show-scroll` definition but likely do not need to change.

The task follows established patterns — there is no novel architecture to introduce. The border model (`border-separate` with per-cell classes) is already set up correctly for the design intent; no structural refactor is needed. The Pagination offset issue is a minor initial-render flash rather than a persistent misalignment. The change surface is 1–3 files with surgical, low-risk edits. The one complexity factor is the absence of any tests for the `Table` component: there is no existing test harness to run against the fix, so correctness must be verified visually in the browser.

Key risk factors for the assessor: (a) the fix is simple but the test coverage gap means no automated regression guard; (b) adding `show-scroll` to the Table's scroll container is the primary code change but needs cross-browser verification (Chrome, Firefox, Safari) to confirm the scrollbar renders correctly under both light and dark themes and under the custom appearance feature; (c) the `useSidebarOffsetClass` `null` initial state affects every page that uses `Table` with pagination, so the scope of any fix there is broader than just Integrations and Data Sources.
