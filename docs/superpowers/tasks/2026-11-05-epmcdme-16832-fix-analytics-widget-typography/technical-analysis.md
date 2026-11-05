# Technical Research

**Task**: analytics session-details widgets typography cli-analytics
**Generated**: 2026-11-05
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-16832 [CLI Analytics][UI/UX] Inconsistent typography, poor readability and visual hierarchy in analytics widgets.

Description: The Session Details dashboard has UI/UX inconsistencies that affect widget readability and overall visual presentation. Widget titles, metric labels, numerical values, and supporting descriptions do not have a clear visual hierarchy. Small text, inconsistent typography, and dense layouts make the analytics hard to scan and interpret. The issue is most noticeable in the Cost & Time, Token Usage, Activity, and chart sections.

Steps to Reproduce:
1. Open CodeMie Preview → Analytics → CLI Analytics.
2. Select any session from the Sessions list.
3. Open the Session Details view.
4. Inspect typography, font sizes, spacing, alignment, and text readability across the widgets.
5. Compare the visual hierarchy of widget headings, metric labels, values, and supporting text.

Expected Result:
- Consistent font family, sizes, and weights across all analytics widgets.
- Clear typography hierarchy between titles, metric values, labels, and descriptions.
- Readable text with appropriate contrast and spacing.
- Consistent alignment, padding, and visual presentation.

Acceptance Criteria:
- Typography follows the application's design system.
- Widget headings, labels, and metric values have consistent font styling.
- Text remains readable without unnecessary zooming.
- Spacing and alignment are consistent across widgets.
- Widgets maintain proper visual hierarchy at supported viewport sizes.
- No text clipping, overlapping, or unintended truncation occurs.

---

## 2. Codebase Findings

### Existing Implementations

Session Details view and its widget stack (entry point: `AnalyticsPage.tsx` → `AnalyticsDashboard.tsx` → `CliAnalyticsTab.tsx` → session row click → `SessionModal.tsx`):

- `src/pages/analytics/components/cli-analytics/views/SessionModal.tsx` — Popup wrapper for Session Details; header title/subtitle use raw `text-base font-semibold` / `text-xs`.
- `src/pages/analytics/components/cli-analytics/views/SessionBody.tsx` — the Session Details body itself (primary file to touch). Renders Cost & Time, Token usage, Activity (as `AnalyticsWidget` + inline `MetricCard` grids), Token & cost growth (Chart.js Line chart), Timeline (`SessionTimeline`), Most Used Tools (`BarChartWidget`).
- `src/pages/analytics/components/AnalyticsWidget.tsx` — shared widget "card" shell: header `h3` = `text-lg font-semibold text-text-primary`, description `p` = `text-sm text-text-quaternary`; provides expand-to-fullscreen (`WidgetModal`), loading/error states.
- `src/pages/analytics/components/widgets/MetricCard.tsx` — metric tile used inside Cost & Time / Token usage / Activity widgets. Label: `text-[11px] font-semibold uppercase tracking-[0.03em] leading-4`; value: `text-lg sm:text-xl font-semibold leading-snug tracking-tight ... [font-variant-numeric:tabular-nums]`; qualification suffix: `text-[11px] font-normal leading-4`; description: `text-[11px] leading-5 line-clamp-3`. Uses hard-coded arbitrary `text-[11px]` sizes rather than the design-system `text-h4`/`text-h5` scale.
- `src/pages/analytics/components/widgets/MetricsGrid.tsx` — reusable grid wrapper around `MetricCard`, used by other (non-session) widgets; `SessionBody.tsx` does NOT reuse this — it inlines `grid grid-cols-2 gap-3` + `.map` three separate times (Cost & Time, Token usage, Activity), duplicating markup instead of reusing the shared pattern.
- `src/pages/analytics/components/cli-analytics/views/SessionTimeline.tsx` — Gantt-style timeline + detail panel; no test file exists; heavy mix of ad hoc sizes (`text-sm font-medium`, `text-xs`, `text-xs font-semibold uppercase tracking-wide`, `text-sm font-semibold tabular-nums`) — each stat block hand-rolled, not reusing `MetricCard`.
- `src/pages/analytics/components/widgets/BarChartWidget.tsx` — "Most Used Tools" chart; wraps `AnalyticsWidget`; chart tick/tooltip colors via `getTailwindColor`; `text-[11px] leading-4` qualification caption.
- `src/pages/analytics/components/usage-attribution/widgets/Tile.tsx` — deliberately mirrors `MetricCard`'s anatomy (per inline comment) with duplicated class strings; a second place the same arbitrary sizes are repeated.
- Sibling CLI Analytics tab views (same visual language, comparison points): `CostView.tsx`, `ActivityView.tsx`, `OverviewView.tsx`, `UsersView.tsx`, `ToolsView.tsx`, `RepositoriesView.tsx`, `EfficiencyView.tsx`.
- `src/pages/analytics/components/CLIInsightsTab.tsx` — a sibling tab that DOES use the design-system `text-h*` classes correctly in places — useful "correct usage" reference.
- `src/pages/analytics/components/widgets/WidgetModal.tsx` — fullscreen expand modal used by `AnalyticsWidget`.
- Other shared widget primitives in `src/pages/analytics/components/widgets/`: `TimePeriodBadge.tsx`, `DistributionBarWidget.tsx`, `DonutChartWidget.tsx`, `PieChartWidget.tsx`, `StackedBarChartWidget.tsx`, `TableWidget.tsx`, `DynamicWidget.tsx`, `ChartLegend.tsx` — same conventions; relevant if the fix should be applied repo-wide rather than scoped only to Session Details.
- `src/utils/analyticsFormatters.ts` (`formatMetricValue`, `formatMetricQualification`, `formatTokens`) and `src/utils/currency.ts` (`formatCliAnalyticsCost`) — feed widget value *content*, not styling; unaffected by a typography-only fix.
- `src/types/analytics.ts` (`Metric`, `ColumnType`, `WidgetSize`) and `src/types/cliAnalytics.ts` (`SessionDetail`, `DispatchRow`) — data shapes consumed by Session Details widgets; no schema changes expected.

### Architecture and Layers Affected

- **Page/route layer**: `AnalyticsPage.tsx` → `AnalyticsDashboard.tsx` → `CliAnalyticsTab.tsx` (tab navigation) → `SessionsView.tsx` row click → `SessionModal.tsx` (Popup). Not expected to change structurally.
- **Session Details composition layer**: `SessionBody.tsx` — primary edit surface.
- **Shared widget-wrapper layer**: `AnalyticsWidget.tsx` (card shell title/description/expand/loading/error), `WidgetModal.tsx`.
- **Shared primitive/metric layer**: `MetricCard.tsx`, `MetricsGrid.tsx`, `TimePeriodBadge.tsx`, and `usage-attribution/widgets/Tile.tsx` (duplicate of MetricCard's anatomy).
- **Chart wrapper layer**: `BarChartWidget.tsx` (and sibling Donut/Pie/StackedBar/DistributionBar widgets) wrapping `react-chartjs-2`/`chart.js`.
- **Bespoke/non-reused layer**: `SessionTimeline.tsx` — hand-codes its own label/value typography independent of `MetricCard`; a distinct source of inconsistency and untested.
- **Data/hooks layer**: `useCliAnalyticsSession.ts` and sibling hooks; `store/cliAnalytics.ts` and `store/analytics.ts` (valtio) — unaffected by a pure styling fix.
- **Formatting/utils layer**: `analyticsFormatters.ts`, `currency.ts`, `chartColors.ts`, `tailwindColors.ts` — unaffected.
- **Design-system/docs layer**: `.ai-run/guides/styling/styling-guide.md` + `tailwind.config.ts` tokens (`themeTokens`, `fontSize.h1–h5`) — the canonical scale the fix should converge on.

This is purely frontend/presentation layer work — no API, store, or data-model changes anticipated.

### Integration Points

- `chart.js` + `react-chartjs-2` — Line chart (Token & cost growth) in `SessionBody.tsx`; Bar chart in `BarChartWidget.tsx`. Chart tick/legend/tooltip text color driven by `getTailwindColor`/`tailwindColors.ts` — any font-size/weight change to chart text must go through Chart.js options, not Tailwind classes directly.
- `chartjs-plugin-datalabels` — registered in `BarChartWidget.tsx`, disabled per-chart in `SessionBody.tsx`'s growth chart options.
- `luxon` (`DateTime`) — date formatting in `BarChartWidget.tsx`.
- `valtio` (`useSnapshot`) — reactive store access (`analyticsStore`) in `BarChartWidget.tsx`.
- `clsx`/`cn()` wrapper (`src/utils/utils`) — class merging convention used throughout; must be used for any new conditional classes per styling guide.
- No reverse dependency found: nothing outside `src/pages/analytics` imports from `cli-analytics/` or `widgets/` — this is a leaf feature domain, so the blast radius of a typography fix is self-contained to this directory tree (plus `usage-attribution/widgets/Tile.tsx`, which independently duplicates `MetricCard`'s class strings and should be checked for consistency if the fix touches shared tokens).
- `FEATURE_FLAGS.CLI_ANALYTICS = 'features:cliAnalytics'` (`src/constants/featureFlags.ts`) gates visibility of the entire tab — not relevant to the typography fix itself, no flag exists for styling.

### Patterns and Conventions

- **No dedicated `Typography`/`Text` shared component exists** anywhere in `src/components` — typography is applied ad hoc via Tailwind classes directly on `<p>`/`<span>`/`<h3>` in each widget file.
- The design system **does** define a semantic heading scale in `tailwind.config.ts` (`fontSize`): `text-h1` (32px), `text-h2` (24px), `text-h3` (16px, lh 21px), `text-h4` (14px, lh 18px), `text-h5` (12px, lh 16px), plus `fontWeight` tokens (`font-normal/medium/semibold/bold`) and semantic color tokens (`text-text-primary/secondary/tertiary/quaternary/heading`). This scale IS used correctly elsewhere (`CLIInsightsTab.tsx`, `Pagination.tsx`, `TabsMenu.tsx`, `SelectButton.tsx`) but is **bypassed** in Session Details widgets, which instead use raw Tailwind utilities (`text-lg`, `text-sm`, `text-xs`, `text-base`) or arbitrary bracket values (`text-[11px]`, `text-[10px]`) — this is the core styling-guide violation the "typography follows the design system" acceptance criterion targets.
- Fragmentation example: widget title = `text-lg`(18px, not mapped to `text-h3`=16px); `MetricCard`/`Tile` label = arbitrary `text-[11px]`; `ActivityView.tsx` axis labels = arbitrary `text-[10px]`; `SessionTimeline.tsx` stat labels = `text-xs`(12px Tailwind default) — at least three distinct "small text" sizes (12px default, 11px arbitrary, 10px arbitrary) competing for the same semantic role, none of which map to the guide's own `text-h5` (12px) token.
- Metric value typography also diverges: `MetricCard` value = `text-lg sm:text-xl font-semibold ... tabular-nums`; `SessionTimeline` detail-panel value = `text-sm font-semibold ... tabular-nums` — same concept, two different sizes/weights.
- Color/semantic tokens (`text-text-primary`, `text-text-secondary`, `text-text-quaternary`) ARE used consistently per the styling guide — contrast/token usage is not the main problem; font-size/weight scale consistency is.
- `cn()` utility used throughout for conditional classes, per styling guide convention — must be preserved.
- Responsive pattern: `max-sm:`/`max-lg:`/`sm:` prefixes used for mobile-first adjustments (e.g. `MetricCard`'s `max-sm:flex-wrap`, `AnalyticsWidget`'s `max-lg:flex-wrap`); no project-custom breakpoints (`card-grid-2:`, `card-grid-3:`, `view-details-bp:`) currently used inside Session Details, though `view-details-bp: 1200px` is the most likely candidate breakpoint name for the "supported viewport sizes" acceptance criterion on a details dashboard.
- `expandable={false}` used consistently for the three metric-card widgets in Session Details (documented in `AnalyticsWidgetProps`: "Set to false for summary cards... where fullscreen provides no benefit").
- Documented, deliberate deviations from the "no arbitrary values" rule exist with inline rationale comments (functioning as informal ADRs):
  - `SessionBody.tsx:217` — `h-[240px]` justified as "explicit design-specified container height for the growth chart".
  - `MetricCard.tsx:35-36, 56-59` — comments justifying `break-words` vs `break-all` and `-mr-3`/`break-words` combo to prevent text bleed across cards.
  - `usage-attribution/widgets/Tile.tsx:36` — comment noting `Tile` intentionally mirrors `MetricCard`'s anatomy.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/styling/styling-guide.md` — HIGH relevance. Mandates Tailwind-only styling (no custom CSS, no inline styles), bans arbitrary values (`text-[15px]`, `p-[18px]`), requires semantic color tokens over raw palette classes, and defines the canonical typography scale `text-h1`…`text-h5` plus font weights. This is the primary rulebook the fix must reconcile the codebase against.
- `.ai-run/guides/styling/theme-management.md` — explains the theme-token architecture (dark `codemieDark` / light `codemieLight` generated via `generateThemes()` in `src/utils/themeHelpers.ts`) and repeats the custom breakpoints. Relevant since both themes must be checked if reusing existing tokens.
- `.ai-run/guides/components/component-patterns.md` — MEDIUM relevance. Component structure, 300-line file budget, `cn()` convention; applies if widget components need refactoring but has no typography-specific content.
- `.ai-run/guides/architecture/architecture.md` — LOW/background relevance. Confirms `src/pages/analytics/components/cli-analytics/` is the correct feature-folder location; no typography content.
- `.ai-run/guides/testing/testing-patterns.md` (and sibling `qa-strategy.md`, `local-verification.md`) — test conventions (see Section 4).

### Architectural Decisions

- No formal ADR exists for this ticket. A prior task-state file (`docs/superpowers/tasks/2026-11-05-epmcdme-16832-fix-analytics-widget-typography/.state.json`) shows this exact ticket was already registered (slug `epmcdme-16832-fix-analytics-widget-typography`, branch `EPMCDME-16832_fix-analytics-widget-typography`, flow `sdlc-light`, phase `main`) but no `spec.md`/`plan.md` exists yet — no prior decisions recorded for this specific effort.
- Inline rationale comments (see Patterns section above) function as informal, localized architectural decisions but are not using `ADR:`/`DECISION:` markers.

### Derived Conventions

- Widget section title: `text-lg font-semibold text-text-primary` (does not map to the guide's `text-h3`=16px token; uses raw `text-lg`=18px) — a convention mismatch worth reconciling against the documented scale.
- Widget description/subtitle: `text-sm text-text-quaternary mt-1`.
- Metric card label (uppercase caption): `text-[11px] font-semibold uppercase tracking-[0.03em] leading-4 line-clamp-2` (mirrored in `Tile.tsx:83`) — arbitrary value repeated across two components, no `text-h5` equivalent used.
- Metric card primary value: `text-lg sm:text-xl font-semibold leading-snug tracking-tight text-text-primary break-words [font-variant-numeric:tabular-nums]` — duplicated verbatim between `MetricCard` and `Tile`.
- Metric qualification/description caption: `text-[11px] font-normal leading-4` / `text-[11px] leading-5 line-clamp-3`.
- Chart axis labels (`ActivityView.tsx:91`): `text-[10px] text-text-secondary` — yet another arbitrary micro-size, fragmenting the "small text" tier further (10px vs 11px).
- Empty/fallback state text (`SessionBody.tsx:249`): `text-text-quaternary text-sm`.
- Loading captions (`AnalyticsWidget.tsx:105`): `text-xs text-text-quaternary`.
- Error message styling (`AnalyticsWidget.tsx:86-88`): `text-failed-secondary font-semibold` for the message, `text-sm text-text-quaternary` for help text.

Net observation: the ad hoc fragmentation across at least three competing "small text" sizes (`text-xs`=12px default, `text-[11px]`, `text-[10px]`), none of which map to the guide's own `text-h5` token, combined with a widget-title size (`text-lg`) that also bypasses `text-h3`/`text-h4`, is almost certainly the root cause the ticket targets. The styling guide's existing `text-h1`…`text-h5` scale is the canonical target to converge on.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/analytics/components/cli-analytics/__tests__/SessionModal.test.tsx` — tests the `SessionModal` wrapper (header, loading/error states via `useCliAnalyticsSession`). `SessionBody` is explicitly mocked out (`vi.mock('../views/SessionBody', ...)`), so none of `SessionBody`'s rendering — including the exact Cost & Time / Token Usage / Activity widgets and growth chart this ticket targets — is exercised.
- `src/pages/analytics/components/cli-analytics/hooks/__tests__/useCliAnalyticsSession.test.ts` — tests the data-fetching hook, not rendered widgets.
- `src/pages/analytics/components/cli-analytics/__tests__/CliAnalyticsTab.test.tsx` — tests tab shell/routing, not widget internals.
- `__tests__/ActivityView.test.tsx`, `CostView.test.tsx`, `EfficiencyView.test.tsx`, `OverviewView.test.tsx`, `ToolsView.test.tsx`, `UsersView.test.tsx`, `RepositoriesView.test.tsx`, `SessionsView.test.tsx` — cover tab-level aggregate views, NOT the per-session detail widgets in `SessionBody.tsx` (naming is similar but different layer — do not confuse tab "ActivityView" with the "Activity" `AnalyticsWidget` card inside `SessionBody`).
- `src/pages/analytics/components/widgets/__tests__/MetricCard.spendQualification.test.tsx` — only test touching `MetricCard`, scoped narrowly to "spend qualification" badge logic, not typography/layout.
- `BarChartWidget.test.tsx`, `BarChartWidgetEmpty.test.tsx`, `BarChartWidget.spendQualification.test.tsx` — cover `BarChartWidget` at the generic widget level, not in session-details context.
- **No test file exists for `SessionTimeline.tsx`** (Timeline widget).
- **No test file exists for `AnalyticsWidget.tsx`** itself — the shared card/header/title component most directly affected by a typography fix.

### Testing Framework and Patterns

- Vitest 5 + React Testing Library, two Vitest "projects": `unit` (`*.test.tsx`, mocks `useSnapshot` and `@/utils/api` via `setupTests.unit.ts`) and `integration` (`*.integration.test.tsx`, real Valtio + stubbed global fetch via `setupTests.tsx`). Config in `vite.config.ts` (`test.projects`).
- Co-located `__tests__/` folders next to source files; AAA style with mandatory `afterEach(cleanup)`.
- Child-component mocking via `vi.mock('../views/ChildComponent', ...)` at module scope to isolate a parent.
- Hook-level mocking via `vi.mock('../hooks/useX', ...)`.
- **No visual regression / snapshot / pixel-diff testing anywhere in this area** — all assertions are DOM text/role/testid based via RTL (`getByText`, `getByRole`, `getByTestId`), which cannot detect typography/CSS changes (font-size, weight, spacing classes).
- Metric-building test fixtures are inline literal objects (e.g. `MOCK_SESSION: SessionDetail`) — no shared factory/builder module found.

### Coverage Gaps

- `SessionBody.tsx` — the exact component rendering the Cost & Time / Token Usage / Activity widgets, the growth chart, Timeline, and Most Used Tools — has zero dedicated unit tests; it is stubbed out wherever referenced.
- `AnalyticsWidget.tsx` (shared title/description header markup) has no test file.
- `SessionTimeline.tsx` has no test file.
- No test anywhere in the codebase asserts on Tailwind class names, font sizing, heading levels, or visual hierarchy — RTL/DOM-based tests are structurally blind to this ticket's class of change. This is consistent with a purely visual fix having no meaningful automated regression coverage available; manual/visual QA is the only verification path given current tooling.

---

## 5. Configuration and Environment

### Environment Variables

None found relevant. No `VITE_*` env vars tied to analytics or typography.

### Configuration Files

- `tailwind.config.ts` (repo root) — governs all typography/spacing/color tokens via `theme.extend` + `tailwindcss-themer` plugin (`codemieDark`/`codemieLight` themes generated from `themeTokens` via `generateThemes()` in `src/utils/themeHelpers.ts`). This is the file to edit for any new/adjusted font-size, font-weight, or spacing token.
- `.ai-run/guides/styling/styling-guide.md` — mandatory Tailwind-only styling rules; dedicated Typography section listing `text-h1`…`text-h5` and font weights.
- `.ai-run/guides/styling/theme-management.md` — theme token architecture/flow and breakpoint list.
- `src/a2ui/theme.css` — the one global/custom CSS file in the repo, scoped to A2UI catalog components (different family, not relevant to Session Details widgets, but shows the project's sole accepted exception to "Tailwind only").
- No `src/index.css` or `src/styles/global.css` exists — no other global typography base CSS found.

### Feature Flags and Deployment Concerns

- `FEATURE_FLAGS.CLI_ANALYTICS = 'features:cliAnalytics'` (`src/constants/featureFlags.ts`) gates the entire CLI Analytics tab/page — controls visibility only, not relevant to the typography fix itself. No styling-specific flag exists or is needed.
- No deployment/Docker/CI concerns — this is a pure frontend Tailwind/markup change with no build or deploy impact.

**Relevant typography tokens already defined** (`tailwind.config.ts` → `theme.extend`):
- `fontFamily`: `geist: ['Geist','Arial','Helvetica','sans-serif']`, `geist-mono: ['GeistMono','monospace']`
- `fontSize`: `xs-1: .625rem`, `sm-1: .813rem`, `h1: [32px, lh 32px]`, `h2: [24px, lh 24px]`, `h3: [16px, lh 21px]`, `h4: [14px, lh 18px]`, `h5: [12px, lh 16px]` (full default Tailwind scale also still available)
- `fontWeight`: custom `text-2xl: 600` plus default weights (`font-normal/medium/semibold/bold`)
- `height.card`: `var(--card-height, 158px)` — driven by a CSS var set elsewhere; worth checking if widget card heights interact with this var when adjusting spacing.
- Semantic text-color tokens: `text-text-primary/secondary/tertiary/quaternary/heading/accent/error` — must be used instead of raw palette classes per the styling guide.

**Relevant breakpoints** (`tailwind.config.ts` → `theme.extend.screens`, beyond standard `sm`/`md`/`lg`):
- `card-grid-2: 1300px`, `card-grid-3: 1600px` — card-grid column counts.
- `view-details-bp: 1200px` — name strongly suggests this is the intended breakpoint for Session Details widget layout at the "supported viewport sizes" acceptance criterion.

**Constraint for implementation**: the styling guide explicitly forbids arbitrary values (`text-[15px]`, `p-[18px]`). Any typography fix must either reuse the existing `text-h1`…`text-h5`/`text-xs-1`/`text-sm-1` tokens or add a new named token to `tailwind.config.ts`, not introduce new inline arbitrary values. Both `codemieDark` and `codemieLight` themes should be checked since color tokens are theme-pair driven (font-size/weight tokens are theme-independent).

---

## 6. Risk Indicators

- No automated test coverage exists for the exact components this ticket touches (`SessionBody.tsx`, `AnalyticsWidget.tsx`, `SessionTimeline.tsx`) — `SessionBody` is explicitly mocked out in the one test that imports its parent. Regression risk must be covered by manual/visual QA since RTL-based tests cannot detect typography/CSS changes.
- Typography fragmentation is broader than the three named widgets: `ActivityView.tsx` (chart axis labels), `usage-attribution/widgets/Tile.tsx` (duplicates `MetricCard`'s class strings), and other sibling CLI Analytics tab views share the same ad hoc patterns — scope decision needed on whether to fix only Session Details or the whole analytics widget family, since `MetricCard`/`AnalyticsWidget` are shared components used outside the session-details context too.
- `SessionBody.tsx` inlines its own metric grids three times instead of reusing `MetricsGrid.tsx` — a refactor-while-fixing temptation that would increase the change surface and testing burden beyond pure typography.
- The styling guide bans arbitrary Tailwind values, but the current code is full of them (`text-[11px]`, `text-[10px]`, `h-[240px]`) — the fix must decide whether to add new named tokens to `tailwind.config.ts` (safer, design-system-aligned) or continue the arbitrary-value pattern (faster but perpetuates the violation the ticket is meant to fix).
- No dedicated `Typography`/`Text` shared component exists in the codebase — introducing one would reduce future drift but expands this ticket's scope; reusing the existing `text-h1`–`h5` classes directly is the lower-risk path.
- Chart text (axis/tick/tooltip labels in `BarChartWidget.tsx`/`SessionBody.tsx`'s Line chart) is rendered via Chart.js options (`getTailwindColor`/`tailwindColors.ts`), not Tailwind classes — font-size changes there require touching chart config objects, not just JSX classNames, and must be checked against both light/dark themes.
- `height.card: var(--card-height, 158px)` is a CSS-variable-driven height — adjusting vertical spacing/line-height inside cards could interact with this fixed-height constraint and cause clipping/overflow, directly relevant to the "no text clipping, overlapping, or unintended truncation" acceptance criterion.
- A task-state file already exists for this ticket (`docs/superpowers/tasks/2026-11-05-epmcdme-16832-fix-analytics-widget-typography/.state.json`, flow `sdlc-light`) but no prior spec/plan — confirms this is the correct, already-initialized run directory with no conflicting prior decisions to reconcile.

---

## 7. Summary for Complexity Assessment

This is a presentation-layer-only fix confined to a single leaf feature domain (`src/pages/analytics/components/`), with no API, store, data-model, or build/deploy impact. The primary edit surface is `SessionBody.tsx` plus the shared components it composes: `AnalyticsWidget.tsx` (card shell), `MetricCard.tsx` (metric tiles used by Cost & Time, Token Usage, and Activity), and `SessionTimeline.tsx` (bespoke, non-reused Gantt widget). A secondary consideration is `BarChartWidget.tsx` and Chart.js-driven text in the growth chart, which requires editing chart option objects rather than JSX classNames. Because `MetricCard.tsx` and `AnalyticsWidget.tsx` are shared across the broader CLI Analytics tab family (not just Session Details), and `usage-attribution/widgets/Tile.tsx` independently duplicates `MetricCard`'s class strings, the realistic file-change surface is roughly 5-10 files if scoped strictly to Session Details, or larger if the team decides to normalize typography repo-wide across all analytics widgets to avoid reintroducing the same inconsistency elsewhere.

Technical novelty is low: the design system already defines the exact scale needed (`text-h1`–`text-h5`, semantic weight/color tokens in `tailwind.config.ts`), and correct usage examples already exist in sibling code (`CLIInsightsTab.tsx`, `Pagination.tsx`). The work is fundamentally a migration from ad hoc/arbitrary Tailwind values (`text-[11px]`, `text-[10px]`, raw `text-lg`/`text-sm`/`text-xs`) onto the documented token scale, constrained by the styling guide's explicit ban on arbitrary values. The main judgment calls are: (1) whether to introduce new named tokens for sizes not currently in the `h1`–`h5` scale versus reusing the nearest existing token, and (2) whether `SessionTimeline.tsx` should be refactored to reuse `MetricCard`/`MetricsGrid` rather than just restyled in place, which would increase scope beyond pure typography.

Test coverage posture is a significant risk factor for complexity scoring: zero unit tests exist for any of the components this ticket touches (`SessionBody.tsx`, `AnalyticsWidget.tsx`, `SessionTimeline.tsx` all lack test files, and the one test importing `SessionBody`'s parent explicitly mocks it out). The codebase has no visual regression or snapshot tooling, so RTL/DOM-based assertions cannot verify typography or CSS changes at all — meaning this ticket's "done" state cannot be automatically regression-tested with existing tools, and verification must rely on manual/visual QA against the acceptance criteria (hierarchy, readability, no clipping/truncation, viewport behavior at the `view-details-bp: 1200px` and `card-grid-2/3` breakpoints). This elevates review/QA complexity even though the code-change complexity itself is low.
