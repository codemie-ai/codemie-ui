# Technical Research

**Task**: project members table scroll layout
**Generated**: 2026-10-19
**Research path**: codegraph

---

## 1. Original Context

Ticket EPMCDME-15890 (Bug): "Members tab (Project Management details page): scrolling the Users table scrolls the whole page instead of only the table".

Expected Result (verbatim): "Only the Users table (member list) should scroll internally. The page header, project title, and tabs should remain fixed in place while scrolling through members."

Acceptance Criteria (verbatim):
1. On the Members tab, the Users table has its own independently scrollable container.
2. Scrolling inside the Users table does not move the page header, project title, or tabs.
3. Pagination (if present) stays correctly positioned and works independently of the table scroll area.
4. Verified on the reproduction project ("2024-06-ai-challenge-hackaton") and at least one other project with multiple members.

Current state of the branch (EPMCDME-15890_fix-members-table-sticky-overlap): a prior fix only added `isolate` to the table wrapper in src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx (~line 915) so the sticky thead no longer paints over the sticky tab bar. Measured in browser: the scrolling element is PageLayout's content scroller (src/components/Layouts/Layout/PageLayout.tsx ~line 136, `flex-grow overflow-y-auto show-scroll h-full w-full px-6`), which contains the "Project members" heading, filters and the table; the table container at ProjectMembersManager.tsx:908 (`overflow-y-auto show-scroll min-h-0 mb-5 relative`, with a `hasScroll` → `pr-4` callback ref) never scrolls because nothing bounds its height. The thead (`sticky top-0 z-20` in src/components/Table/Table.tsx:233) never sticks because the wrapper `rounded-lg overflow-hidden relative isolate` is overflow-hidden.

Selected approach (user-approved): make only the Users table scroll.
- ProjectDetailsPage.tsx: when activeTab === 'members', wrap tab content in a `flex h-full flex-col` column; members wrapper becomes `flex min-h-0 flex-1 flex-col pt-5 pb-8`. Other tabs keep current behavior. ProjectDetailsNavigation `<nav>` gets `shrink-0`.
- ProjectMembersManager.tsx: `<section>` becomes `flex min-h-0 flex-1 flex-col`; heading row, filters, bulk actions and Pagination get `shrink-0`; table container gets `flex-1` plus a minimum height safety net (e.g. `min-h-[240px]`) so short viewports fall back to the outer page scroller; table wrapper `overflow-hidden` → `overflow-clip` so the sticky thead sticks to the table container.
- Keep `isolate` (harmless).
Also: the old planning artifacts in docs/superpowers/tasks/2026-10-13-epmcdme-15890-fix-members-table-sticky-overlap/ (plan.md, actual-complexity.json, code-review-final.json) describe the isolate-only fix and will be deleted and replaced by this run's artifacts.

Research focus: confirm the height chain (Layout → PageLayout → ProjectDetailsPage content → ProjectMembersManager), any other consumers of PageLayout/SettingsLayout affected, existing tests covering ProjectDetailsPage / ProjectMembersManager (unit + integration) and whether layout classes are asserted, test-harness/Playwright locators that depend on page scroll, the ProjectOverviewSection bounded flex-column precedent, mobile/responsive behavior, and Pagination component's per-page dropdown placement.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/settings/administration/ProjectDetailsPage.tsx:246-321` — renders `SettingsLayout content={<>…</>}`; content is a fragment: `ProjectDetailsNavigation` then one tab branch. Members branch at L285-298: `<div className="pt-5 pb-8"><ProjectMembersManager … /></div>`. Budgets branch (L299-311) uses the same `pt-5 pb-8` wrapper. Loading (L222-234) and not-found (L236-244) states render separate `SettingsLayout`s.
- `src/pages/settings/administration/projectsManagement/ProjectDetailsNavigation.tsx:58-61` — `<nav className="sticky top-0 z-20 -mx-6 border-b … bg-surface-base-primary px-6">`, tablist `overflow-x-auto`.
- `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx:867-956` — `<section>` (no classes) → heading row `flex justify-between items-center mb-5` (L870) → filters `mb-5` (L880) → bulk actions `mb-4 flex justify-end` only when `canManageProject` (L888) → table container `ref={tableContainerRef}` `overflow-y-auto show-scroll min-h-0 mb-5 relative` (L908) → loading spinner `min-h-[220px]` (L910) or `hasScroll ? 'pr-4' : ''` (L914) → `rounded-lg overflow-hidden relative isolate` (L915) → `Table embedded` → select-all overlay `absolute inset-0 … z-50` (L933). `Pagination` rendered outside the container when `users.length > 0` (L946-955), className `w-full !bg-transparent !border-t-0 !p-0 !mb-4 !bg-none`.
- `tableContainerRef` (L292-299): callback ref with deps `[users]`, sets `hasScroll = scrollHeight > clientHeight` only when the callback identity changes; no ResizeObserver.
- `src/components/Table/Table.tsx:197-207` — root `w-full relative flex flex-col`; inner div adds `overflow-auto min-h-[300px] show-scroll` only when `!embedded` (members passes `embedded`, so no inner scroller). thead `sticky top-0 z-20` (L233). Built-in fixed Pagination only when `!embedded` (L319).
- `src/components/Layouts/Layout/PageLayout.tsx:68-152` — `main.flex h-full` → `div.flex flex-col flex-1 min-w-0` → header (`h-layout-header`, `max-lg:h-auto max-lg:flex-wrap`) → scroller `flex-grow overflow-y-auto show-scroll h-full w-full px-6` (L136, no vertical padding) → `div.h-full` (block, L144) → children.
- `src/components/Layouts/Layout/Layout.tsx:76` — `div.flex min-h-full h-full` wrapping Sidebar + PageLayout. `SettingsLayout.tsx:33-58` passes `content` through unchanged.

### Architecture and Layers Affected
- Page layer: `ProjectDetailsPage` (members tab branch) and `ProjectDetailsNavigation`.
- Feature component layer: `ProjectMembersManager` render tree.
- Shared layout layer (`PageLayout`, `Layout`, `SettingsLayout`) is the height source but is not in the selected edit set.

### Integration Points
- Height chain: `Layout div.h-full` → `PageLayout main.h-full` → flex column → scroller (`flex-grow h-full`) → `div.h-full` → [ProjectDetailsPage fragment children]. The fragment's children are direct block children of the `h-full` div, so no flex context reaches `ProjectMembersManager` today.
- Blast radius: `PageLayout` has 47 callers, `SettingsLayout` 24 callers, `Table` 22 callers, `Pagination` many callers — none change if edits stay inside ProjectDetailsPage / ProjectDetailsNavigation / ProjectMembersManager. `ProjectDetailsNavigation` has 1 caller (ProjectDetailsPage); `ProjectMembersManager` has 1 caller.
- `NavigationMore` row menu (ProjectMembersManager L810) uses `renderInRoot` → floating-ui `strategy: 'fixed'` and `useDismiss({ ancestorScroll: true })` (`NavigationMore.tsx:128-131`).
- `Pagination` per-page `Select` (`Pagination.tsx:215-224`) passes no `appendTo`; `Select.tsx` forwards `appendTo` to PrimeReact `Dropdown` (prop is `undefined` here, so PrimeReact's default portal target applies).

### Patterns and Conventions
- Precedent for bounded flex columns: `ProjectOverviewSection.tsx:377,379,433,444` — `section.flex min-h-0 flex-col` with child `min-h-0 flex-1`. These are equal-height grid cells in the overview, not a viewport-bounded scroller.
- Class merging via `cn()`; mobile behaviour via `max-lg:` variants and `useIsMobileLayout` (`< lg`).

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/styling/styling-guide.md` — "Tailwind CSS only… No arbitrary values"; "Only predefined spacing scale — never `p-[18px]`".
- `.ai-run/guides/testing/local-verification.md` — harness via `npm run test-harness` / `uvx codemie-test-harness run sanity-ui -n 2`; screenshots per scenario required in MR `## Verified locally`.

### Architectural Decisions
- None specific to scroll containment. The tab-bar stacking fix (`isolate`, L915) is the only recorded prior decision (commit f6c027f21).

### Derived Conventions
- Arbitrary min-heights already exist in this file and in Table (`min-h-[220px]` L910, `min-h-[300px]` Table.tsx L205) despite the guide rule.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/settings/administration/__tests__/ProjectDetailsPage.test.tsx` — mocks `SettingsLayout` (renders `content` in a plain div) and `ProjectMembersManager` (testid `project-members-manager`); asserts tab `aria-selected`, props, budgets access. `ProjectDetailsNavigation` is not mocked. No `className`/layout assertions.
- `src/pages/settings/administration/projectsManagement/__tests__/ProjectMembersSpending.test.tsx` (unit) and `ProjectMembersViewAnalytics.integration.test.tsx` (integration) render the real `ProjectMembersManager` with real `Table`/`Pagination`; reviewed portions query by role/text, no layout-class assertions seen (files not read in full).
- `src/components/Table/__tests__/TableExpansion.test.tsx` and others cover Table.

### Testing Framework and Patterns
- Vitest + React Testing Library; `unit` and `integration` projects; integration tests import `@/test-utils/integration` first. jsdom does not compute layout, so scroll/stickiness is unverifiable in unit tests.

### Coverage Gaps
- No test covers `ProjectDetailsNavigation` in isolation, the `hasScroll` callback ref, or any scroll/sticky behaviour.
- Test harness is external (`uvx codemie-test-harness`); no in-repo Playwright locators. Old run's ad-hoc Playwright scripts live in `docs/superpowers/tasks/2026-10-13-…/dynamic-tests.local/` (1440×900 viewport, local creds).

---

## 5. Configuration and Environment

### Environment Variables
- None relevant.

### Configuration Files
- `tailwind.config.ts` governs utility availability (`overflow-clip`, `min-h-*` scale); version in `package.json`.

### Feature Flags and Deployment Concerns
- Members tab visibility via `getVisibleTabs` / `canOpenActiveTab`; budgets column via `isMaintainer || isProjectAdmin`; `isModelsConfigEnabled` hard-wired `false` for members. No flag gates layout.

---

## 6. Risk Indicators

- Height chain passes through a block `div.h-full` (PageLayout L144); Speculative: the new `flex h-full flex-col` wrapper must be the direct child of it for `flex-1/min-h-0` to bound the table.
- `ProjectDetailsNavigation` `-mx-6` + `sticky top-0` inside the scroller; Speculative: as a flex item it keeps sticking only if the outer scroller still scrolls (short-viewport fallback).
- `hasScroll` callback ref (L292-299) measures only when `users` changes, possibly while the spinner is shown (`setLoading(false)` runs after `setUsers`); no resize handling — Speculative: `pr-4` gutter may be wrong once the container actually scrolls.
- `overflow-clip`: no scroll container is created, so thead sticks to the nearest scrolling ancestor; Safari < 16 lacks `overflow: clip`.
- Mobile (`< lg`): Table renders `TableCardList` (no thead); PageLayout header wraps (`max-lg:h-auto`), leaving less height — safety-net min-height drives fallback to page scroll.
- `min-h-[240px]` conflicts with styling-guide "no arbitrary values" (precedent exists at L910).
- `Pagination` per-page `Select` and row role `Select`/`NavigationMore` — placement relative to the new inner scroller and `overflow-clip` wrapper needs browser check; `NavigationMore` dismisses on ancestor scroll, which now includes the table container.
- Select-all overlay (`absolute inset-0`, L933) sits inside the scroll container; covers only visible scroll area.
- Old run dir contains many `.local` artifacts beyond the three named files (state, events, evidence, scripts).

---

## 7. Summary for Complexity Assessment

The change is confined to the presentation layer: two page-level files (`ProjectDetailsPage.tsx` members branch, `ProjectDetailsNavigation.tsx` nav class) and one feature component (`ProjectMembersManager.tsx` render tree around L867-956). Shared layout (`PageLayout`, `Layout`, `SettingsLayout`, `Table`, `Pagination`) stays untouched, so the 47/24/22-caller blast radius of those components is not engaged. The height chain is confirmed: Layout `h-full` → PageLayout flex column → scroller (`flex-grow h-full overflow-y-auto`) → block `div.h-full` → ProjectDetailsPage fragment, which currently gives the members table no bounded height.

Technical novelty is low-to-moderate: the bounded `flex min-h-0 flex-1` column already appears in `ProjectOverviewSection`, but here it must be bound to the viewport and interact with a sticky nav, a sticky thead, a callback-ref scroll detector, mobile card layout and portaled dropdowns — behaviours jsdom cannot test.

Test posture: `ProjectDetailsPage.test.tsx` mocks both SettingsLayout and ProjectMembersManager and asserts no classes; two ProjectMembersManager suites render the real tree but query by role/text. Class edits are unlikely to break tests; correctness must be shown by browser verification (reproduction project, a second project, short viewport, mobile width). Key risks: `hasScroll` timing, Safari `overflow: clip`, dropdown/menu placement inside the new scroller, and the styling-guide arbitrary-value rule.

---

## 8. External References

None named by the task. (Old run dir `docs/superpowers/tasks/2026-10-13-epmcdme-15890-fix-members-table-sticky-overlap/` resolved: contains `plan.md`, `actual-complexity.json`, `code-review-final.json` plus `.local` evidence, scripts and state files.)
