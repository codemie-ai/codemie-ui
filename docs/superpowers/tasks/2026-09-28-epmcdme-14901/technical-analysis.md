# Technical Research

**Task**: new badge datasource xwiki
**Generated**: 2026-09-28T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Jira ticket EPMCDME-14901 (Story, Ready for dev):

Title: CodeMie UI: remove NEW badges from all features except xWiki datasource

Description: The CodeMie UI currently displays NEW badges for multiple features. To reduce visual noise and keep the UI focused, the NEW badge should be removed from all features except the xWiki datasource. The xWiki datasource must remain marked with the NEW badge so users can still identify it as the newly introduced datasource option.

Preconditions:
- User has access to the CodeMie UI.
- CodeMie UI contains features or datasource options where NEW badges are displayed.
- xWiki datasource is available in the CodeMie UI.

Scenarios of Use:
1. User opens CodeMie UI areas where feature entries, datasource options, or feature cards are displayed.
2. User reviews available features and datasource options.
3. The UI no longer shows NEW badges on features other than the xWiki datasource.
4. User opens the datasource-related UI where xWiki datasource is displayed.
5. xWiki datasource is still marked with the NEW badge.

Affected Areas:
- CodeMie UI badge rendering logic
- Feature list/card/menu areas where NEW badges are currently displayed
- Data Sources UI
- xWiki datasource display

Acceptance Criteria:
1. NEW badges are removed from all CodeMie UI features except the xWiki datasource.
2. The xWiki datasource continues to display the NEW badge.
3. No other datasource or feature displays the NEW badge after the change.
4. The change does not affect feature availability or datasource functionality.
5. The UI remains visually consistent after the badges are removed.
6. No regressions are introduced in the Data Sources UI.

---

## 2. Codebase Findings

### Existing Implementations

Every current `badge: 'NEW'` assignment in the codebase was located by grepping for the literal
string `'NEW'` / `"NEW"` across `src/**/*.ts(x)`. There are exactly three source locations that
assign the badge, all string-literal, no i18n/config indirection:

- `src/components/Navigation/Navigation.tsx`
  - Line 92 — `Skills` nav item (`upperItems`), gated by `isSkillsEnabled` feature flag.
  - Line 129 — `AI Katas` nav item (`upperSecondaryItems`), unconditional.
  - Line 146 — `Analytics` nav item (`upperSecondaryItems`), gated by `isEnterpriseEdition()`.
  - These items are typed as `NavigationLinkItem` (`badge?: string`, defined in
    `src/components/Navigation/NavigationSection/NavigationLink.tsx:59`) and rendered generically
    at `NavigationLink.tsx:116-126` — any item with a truthy `badge` renders the pill span.
- `src/pages/dataSources/components/DataSourceTypeSelector.tsx` (lines 46-77)
  - Builds `indexTypeOptions` for the "Datasource Type" Autocomplete on the create/edit form.
  - Assigns `badge: 'NEW'` to five `INDEX_TYPES` keys: `XRAY`, `AZURE_DEVOPS_WORK_ITEM`,
    `SHAREPOINT`, `SVN`, `XWIKI`.
  - The badge is rendered by the local `itemTemplate` function (lines 109-120), a purple pill
    (`bg-purple-600 text-white`) shown next to the option label inside the Autocomplete dropdown.
- `src/pages/dataSources/components/DataSourceFilters.tsx` (lines 98-125)
  - Builds `indexTypeOptions` for the "Type" checkbox-list filter on the Data Sources list page.
  - Assigns `badge: 'NEW'` to four `INDEX_TYPES` keys: `XRAY`, `AZURE_DEVOPS_WORK_ITEM`,
    `SHAREPOINT`, `XWIKI` (note: `SVN` is **not** included here, unlike the type selector).
  - Rendering of `option.badge` for this filter list happens inside the shared `Filters`
    component (`src/components/Filters/Filters.tsx`), which also matches on `badge` (found via the
    broader `badge` grep, not read in full for this pass).

`INDEX_TYPES` values referenced above are defined in `src/constants/dataSources.ts`: `SVN: 'svn'`,
`XWIKI: 'xwiki'`, `XRAY: 'xray'`, `AZURE_DEVOPS_WORK_ITEM: 'azure_devops_work_item'`,
`SHAREPOINT: 'sharepoint'`.

`src/components/SidebarNavigation/SidebarNavigation.tsx` and its `types.ts` (`badge?: string`,
line 24) also render an `item.badge` span (lines 151-153), but no page-level nav config that feeds
it (`AssistantsNavigation.tsx`, `FavoritesNavigation.tsx`, `WorkflowsNavigation.tsx`,
`KatasNavigation.tsx`, `SkillsNavigation.tsx`) currently sets a `badge` value — this component is
a generic capability with no live "NEW" usage today.

No other `'NEW'`/`"NEW"` badge literals were found outside these three files. Hits for the word
"badge" in files such as `StatusBadge`, `PremiumModelBadge`, `IntegrationStateBadge`,
`SeverityBadge`, `ActionBadge`, `ResourceCounterBadge`, `TimePeriodBadge`, `SkillCategoryBadge`,
`RecordItemBadge`, `BlockedImageBadge`, `DataSourceStatus` (status pill), etc. are unrelated badge
components (status, severity, premium-model, resource-counter) — none of them render the "NEW"
label and are out of scope.

### Architecture and Layers Affected

- **Presentation / navigation layer**: `Navigation.tsx` (primary sidebar) builds the nav item
  arrays; `NavigationLink.tsx` renders the badge pill generically for any item with a `badge`
  field.
- **Presentation / feature layer (Data Sources)**: `DataSourceTypeSelector.tsx` (create/edit form
  dropdown) and `DataSourceFilters.tsx` (list-page filter) each independently build their own
  `indexTypeOptions` array and independently decide which `INDEX_TYPES` get a badge. There is no
  shared "which types are new" helper — the badge-eligible-type lists are duplicated and already
  inconsistent between the two files (the filter list omits `SVN`, the selector list includes it).

### Integration Points

- Both Data Sources files import `INDEX_TYPES` from `src/constants/dataSources.ts` and `humanize`
  from `src/utils/helpers.ts`; `DataSourceTypeSelector.tsx` also merges in dynamic
  `indexProviderSchemas` from `dataSourceStore` (`src/store/dataSources.ts`) as additional non-badged
  options.
- `Navigation.tsx` items with badges are all conditionally rendered by feature flags/environment
  (`isSkillsEnabled` from `useFeatureFlag('skills')`, `isEnterpriseEdition()` for Analytics); `AI
  Katas` has no gating flag.
- The badge rendering itself (`item.badge && <span>...</span>`) is shared, generic markup in both
  `NavigationLink.tsx` and the `itemTemplate`/`Filters` rendering paths — removing a badge is a
  pure data change (removing the `badge: 'NEW'` field assignment), not a markup change.

### Patterns and Conventions

- Badge eligibility is expressed inline as an `if` condition checking `INDEX_TYPES[key] ===
  INDEX_TYPES.X` chains inside a `.map()`, duplicated verbatim (with drift) across
  `DataSourceTypeSelector.tsx` and `DataSourceFilters.tsx`. There is no shared constant/list (e.g.
  no `NEW_DATASOURCE_TYPES` array) that both files consume.
- Nav badges are inlined directly on each `NavigationLinkItem` object literal in `Navigation.tsx`
  rather than derived from a shared "new features" list.
- Both existing badge-comment lines document (in code comments) which types the badge currently
  covers — these comments will go stale once badge scope changes and are a natural place to update.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide under `.ai-run/guides/` documents "NEW badge" semantics or a policy for when a feature is
marked new. `styling/styling-guide.md` and `styling/theme-management.md` contain the word "badge"
only in the context of styling conventions/tokens generally (badge-related Tailwind classes such
as `bg-surface-specific-navigation-badge`), not feature-flagging semantics.

### Architectural Decisions

None found. No ADRs or inline `NOTE:`/`DECISION:` markers reference the NEW badge or its removal
criteria.

### Derived Conventions

- The NEW badge is a plain UI-only marker (a `badge?: string` field rendered conditionally); it
  carries no functional behavior, so removing it does not touch feature availability, gating, or
  data flow — confirmed by the fact that in `Navigation.tsx` the badge assignment is independent of
  (and additional to) the feature-flag/enterprise-edition gating that already controls whether the
  item renders at all.
- Git history (`3f38e6402 EPMCDME-13142: Add xWiki datasource type to the UI`) is the commit that
  introduced the xWiki datasource type; `91dd4e957 EPMCDME-12261: Add SVN datasource UI support`
  and other feature-introduction commits show the same pattern of adding a new `INDEX_TYPES` entry
  without a dedicated "new badge" commit — the badge assignments were added/extended in the two
  Data Sources files as an ad hoc list, not as part of type introduction.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/dataSources/__tests__/DataSourceCreatePage.integration.test.tsx` — line 421-431, test
  `'marks the xWiki option with a NEW badge in the type selector'`: opens the Datasource Type
  Autocomplete on the create page and asserts `option.parentElement` (the xWiki option) has text
  content `'NEW'`. This test exercises `DataSourceTypeSelector.tsx` and will continue to pass
  unchanged if xWiki keeps its badge.
- No test in the repository asserts the *presence* of the NEW badge for `XRAY`,
  `AZURE_DEVOPS_WORK_ITEM`, `SHAREPOINT`, or `SVN` in either `DataSourceTypeSelector.tsx` or
  `DataSourceFilters.tsx`.
- No test in the repository asserts the presence (or absence) of the `'NEW'` badge for the
  `Skills`, `AI Katas`, or `Analytics` nav items in `Navigation.tsx` — `Navigation.test.tsx` (in
  `src/components/Navigation/__tests__/`) has no matches for "badge" or "NEW".
- `NavigationLink.test.tsx` covers icon rendering, label display, tooltip attributes, active-route
  styling, and edge cases, but does not construct an `item` with a `badge` field and does not assert
  on the badge span at all — the generic badge-rendering branch (`item.badge && <span>...`) itself
  is untested.

### Testing Framework and Patterns

Vitest + React Testing Library, two projects (`unit`, `integration`) per `vitest.workspace.ts`.
Navigation tests mock `react-router`, `valtio`, `@/store/appInfo`, and SVG icon imports via
`vi.mock`. Data Sources integration tests use `renderPage`, `mockAPI`, `getAutocomplete`,
`openAutocompleteDropdown` helpers and assert via `screen.findByText` / `toHaveTextContent`.

### Coverage Gaps

- No test currently pins the removal target: nothing fails today if `Skills`/`AI
  Katas`/`Analytics` badges were removed, and nothing fails if `XRAY`/`AZURE_DEVOPS_WORK_ITEM`/
  `SHAREPOINT`/`SVN` badges were removed from either Data Sources file. This means the change
  itself will not be verified by existing suites — new assertions (in `Navigation.test.tsx`,
  `DataSourceCreatePage.integration.test.tsx`, and/or a `DataSourceFilters` test if one exists)
  would be the only way to lock in "badge removed everywhere except xWiki" as a regression guard.
- `NavigationLink.tsx`'s generic badge-rendering branch has no direct unit test exercising
  `item.badge`.

---

## 5. Configuration and Environment

### Environment Variables

None found relevant to NEW badges. The nav items that carry badges are gated by feature-flag hooks
(`useFeatureFlag('skills')` for Skills) and by `isEnterpriseEdition()` (from
`src/utils/enterpriseEdition.ts`) for Analytics, not by env vars directly — those flags/checks
control whether the *item* renders, independent of the `badge` field.

### Configuration Files

`src/constants/dataSources.ts` centralizes `INDEX_TYPES` values consumed by both
`DataSourceTypeSelector.tsx` and `DataSourceFilters.tsx`. No separate config file drives "which
types are new" — that list is hardcoded inline in each component as described in Section 2.

### Feature Flags and Deployment Concerns

- `isSkillsEnabled` (`useFeatureFlag('skills')`) gates whether the Skills nav item (and its badge)
  renders at all.
- `isSchedulersViewEnabled` / `isEnterpriseEdition()` gate other nav items but do not currently
  carry badges (Schedulers has no badge; Analytics does).
- Removing the badge field does not interact with any deployment manifest, Dockerfile, or CI
  config — no matches for "badge" in those files were found.

---

## 6. Risk Indicators

- Speculative: The badge-eligible-type lists in `DataSourceTypeSelector.tsx` and
  `DataSourceFilters.tsx` are already inconsistent (the selector includes `SVN`, the filter does
  not) — a change should account for both, and any future encapsulation (e.g. one shared "new
  types" list) is a design choice, not something already in place.
- Zero existing tests would fail if the non-xWiki badges were simply left in place — the risk of an
  incomplete change going unnoticed is real without new/updated test assertions covering
  `Navigation.tsx` (Skills, AI Katas, Analytics) and both Data Sources files.
- The `Analytics` nav badge is gated by `isEnterpriseEdition()` and the `Skills` badge by a feature
  flag — verifying badge removal for these two items requires exercising those conditional code
  paths (enterprise-edition mode, skills flag on) in tests, not just the default render.
- `SidebarNavigation.tsx` / `SidebarNavigation/types.ts` support a generic `badge` field with no
  current "NEW" consumer; this is not a removal target but confirms the badge concept exists in two
  separate navigation components (`Navigation`/`NavigationLink` and `SidebarNavigation`) — a
  reviewer should confirm no other in-progress code path is about to introduce a NEW badge there.
- No shared constant or helper currently expresses "the xWiki datasource is the one datasource type
  that should show NEW" — encoding that as a single source of truth versus trimming the existing
  inline conditionals in each of the two Data Sources files is a design decision for the spec/plan
  stage, not a discovered constraint.

---

## 7. Summary for Complexity Assessment

This task touches three existing files in the presentation layer only: `Navigation.tsx` (three
`badge: 'NEW'` literal assignments — Skills, AI Katas, Analytics nav items, rendered generically by
`NavigationLink.tsx`), `DataSourceTypeSelector.tsx` (five badge-eligible `INDEX_TYPES`, need to
narrow to one), and `DataSourceFilters.tsx` (four badge-eligible `INDEX_TYPES`, need to narrow to
one). Every occurrence is a plain string-literal object-field assignment with no i18n, no config,
and no backend dependency — the change is a data-only removal (deleting or narrowing an `if`
condition / deleting a `badge:` line), not a markup or architecture change. No shared
"NEW-badge-eligible" abstraction exists across the three files, so each site is edited
independently; the two Data Sources files already disagree on which types get a badge (selector
includes SVN, filter does not), which is a small pre-existing inconsistency to note but not fix
unless asked.

Test coverage is thin on the removal side: one integration test
(`DataSourceCreatePage.integration.test.tsx`) already asserts xWiki keeps its badge and will
continue to pass unmodified; no test asserts presence of the badge on any of the other four
datasource types or the three nav items, meaning the change itself is currently unverified by any
existing suite. `NavigationLink.test.tsx` does not exercise the `item.badge` render branch at all.
Overall technical risk is low (three small, well-isolated files, no cross-cutting or backend
impact, no external references named by the task), with the main risk being under-verification
rather than implementation complexity — a change here could be made incorrectly (e.g. leaving one
of the five sites) without any test catching it.

---

## 8. External References

None named by the task. The ticket describes UI/UX behavior directly and does not point to any
external spec, sibling repository, or design document as a source of truth.
