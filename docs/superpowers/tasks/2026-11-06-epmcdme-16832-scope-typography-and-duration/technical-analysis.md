# Technical Research

**Task**: analytics cli-analytics MetricCard formatDuration
**Generated**: 2026-11-06
**Research path**: filesystem (codegraph tool not available)

---

## 1. Original Context

EPMCDME-16832 [CLI Analytics][UI/UX] Inconsistent typography, poor readability and visual hierarchy in analytics widgets. The Session Details dashboard has typography inconsistencies (widget titles, metric labels, values, descriptions) most noticeable in Cost & Time, Token Usage, Activity and chart sections.
Expected: consistent font family, sizes and weights across all analytics widgets; clear hierarchy between widget titles, metric values, labels and descriptions; readable text with appropriate contrast and spacing; consistent alignment/padding/presentation; layouts that support quick scanning.
Acceptance Criteria: typography follows the app design system; headings/labels/metric values consistent; text readable without zooming; spacing and alignment consistent across widgets; proper visual hierarchy at supported viewport sizes; no clipping/overlap/unintended truncation.

Context: MR 2248 (merged earlier for this ticket) changed font sizes in shared components AnalyticsWidget, MetricCard, BarChartWidget (+ session-only SessionBody/SessionModal/SessionTimeline) which restyled every analytics view. The work being documented now (ALREADY implemented and committed on the current branch, commits 5319ac0a7 and a0ddb449f, merge base main) is: (1) revert MR 2248's shared-component typography so other views are unchanged, set MetricCard value to a single 18px (text-lg, dropped sm:text-xl) so all metric cards across CLI Analytics match; (2) Session Details only: responsive top widget row (grid-cols-1 lg:grid-cols-3), max-sm:gap-2 on metric grids, timeline detail tiles reuse MetricCard label/value styling (new cli-analytics/sessionTypography.ts), removed duplicate 'Timeline' label, flexible timeline label column; (3) formatDuration in cli-analytics/format.ts now shows three units starting at the largest filled (h m s -> d h m -> w d h -> mo w d; month = 30 days). Research this against the CURRENT codebase (read-only; do not modify any source file).

---

## 2. Codebase Findings

Base dir `AC` = `src/pages/analytics/components`. Branch diff vs main: 8 files, +99/-70. Commit 5319ac0a7 (typography) touches AnalyticsWidget.tsx, widgets/BarChartWidget.tsx, widgets/MetricCard.tsx, cli-analytics/views/SessionBody.tsx, SessionModal.tsx, SessionTimeline.tsx and adds cli-analytics/sessionTypography.ts. Commit a0ddb449f touches cli-analytics/format.ts only. Neither commit touched tests.

### Existing Implementations
- `AC/widgets/MetricCard.tsx` - shared stat tile. Props: metric, mutedTextClassName, badge, valueClassName, valueColorClassName, valueOverride. Label `text-[11px] font-semibold uppercase tracking-[0.03em] leading-4 line-clamp-2`; default value `text-lg font-semibold leading-snug tracking-tight text-text-primary break-words` + tabular-nums; description `text-[11px] leading-5 line-clamp-3`.
- `AC/AnalyticsWidget.tsx` - shared card shell (title, description, actions, WidgetModal expand, Spinner loading/error, softReload).
- `AC/widgets/BarChartWidget.tsx` - shared bar chart built on AnalyticsWidget.
- `AC/cli-analytics/sessionTypography.ts` - exports `SESSION_STAT_LABEL_CLASS` (`text-[11px] font-semibold uppercase tracking-[0.03em] leading-4 text-text-quaternary`) and `SESSION_STAT_VALUE_CLASS` (`text-lg font-semibold leading-snug tracking-tight text-text-primary tabular-nums`). Header comment: Session Details only; other tabs must not be restyled.
- `AC/cli-analytics/views/SessionBody.tsx` - Session Details body; Chart.js Line growth chart via react-chartjs-2; metrics built as pre-formatted string `Metric` objects; responsive top row grid-cols-1 lg:grid-cols-3, max-sm:gap-2.
- `AC/cli-analytics/views/SessionModal.tsx` - Popup wrapper; title with Tooltip/useIsTruncated; data via `useCliAnalyticsSession`.
- `AC/cli-analytics/views/SessionTimeline.tsx` - dispatch timeline; detail tiles use SESSION_STAT_* and formatDuration; duplicate "Timeline" label removed; label column flexible.
- `AC/cli-analytics/format.ts` - `formatDuration` (lines ~46-66), formatToolSuccess, describeSessionCount, describeSessionToolCalls, repo-metric helpers.

formatDuration logic: units mo(30d), w(7d), d, h, m, s; `DURATION_UNITS_SHOWN = 3`. null/non-finite/<=0 -> "—"; <1000ms -> `${Math.round(ms)}ms`; otherwise find first unit with remaining >= unit seconds, slice 3 units from there (clipped at list end), floor-divide each, zero-valued inner units still printed (e.g. `1h 0m 5s`); lower units truncated not rounded. Outputs: 5s; 1m 30s (two units, window clipped at end); 1h 2m 3s; 1d 2h 3m; 1w 2d 3h; 2mo 1w 3d.

### Architecture and Layers Affected
- Page/feature: src/pages/analytics with cli-analytics sub-feature (Views).
- Shared widgets: AnalyticsWidget, MetricCard, BarChartWidget.
- Pure formatters/constants: format.ts, sessionTypography.ts.
- Hooks: cli-analytics/hooks (useCliAnalyticsSession).
- Shared utils: @/utils/analyticsFormatters, currency, helpers, chartColors, utils (cn). Types: @/types/analytics, @/types/cliAnalytics.
- No API, store, DB or backend layer touched.

### Integration Points (blast radius)
- formatDuration callers: SessionBody, SessionTimeline, OverviewView, UsersView (so Overview and Users durations also change format); schedulers pages (SchedulerRunDetailsPage, SchedulerRunHistoryPage) matched the name but were not verified as importing this function.
- MetricCard callers (9): CostView, EfficiencyView, ExtendedSessionsModal, OverviewView, SessionBody, cliInsights/CLIInsightsUserDetailsModal, widgets/MetricsGrid (-> DynamicWidget, MetricsWidget); tests liveVerification and MetricCard.spendQualification. The text-lg change (dropping sm:text-xl) affects all of them.
- AnalyticsWidget: ~33 importers (cli-analytics views, cliInsights, leaderboard, usage-attribution, widgets/*, schedulers). BarChartWidget: 13 files (incl. DynamicWidget, CLIInsightsTab, LeaderboardTab, EnrichedUserSection).
- Third-party: chart.js, react-chartjs-2, repo Popup/Tooltip wrappers.

### Patterns and Conventions
- Tailwind utility strings with semantic tokens (text-text-primary, text-text-quaternary, bg-surface-elevated).
- Session-specific typography lives in a feature-local constants file; shared components keep defaults and take overrides via props.
- Chart options hoisted outside components; session metrics pre-formatted as ColumnType.STRING.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- `.ai-run/guides/styling/styling-guide.md` (high relevance): Tailwind only, bans arbitrary values (e.g. text-[15px]), semantic colour tokens; typography scale text-h1 (32) .. text-h5 (12); mobile-first grid pattern. It does not document text-lg, text-[11px] or max-sm:.
- `.ai-run/guides/styling/theme-management.md`: use semantic tokens, no hex.
- Component and testing guides exist but were not read in detail.

### Architectural Decisions
- Prior run `docs/superpowers/tasks/2026-11-05-epmcdme-16832-fix-analytics-widget-typography/` (technical-analysis, plan, qa-report, code-review JSONs, decisions.jsonl): found Session Details widgets bypass the text-h* scale with competing small sizes (text-xs, text-[11px], text-[10px] at ActivityView.tsx:91). Review decisions: fix CR-001 (description line-clamp line-height regression), accept CR-002 (flat metric value).
- Final direction (commits 5319ac0a7/a0ddb449f): revert shared-component changes from MR 2248, scope fixes to Session Details, rather than converge on the text-h* scale. Which commit MR 2248 merged was not confirmed (original change is 9695e5461).
- Current-run dir was empty before this file.

### Derived Conventions
- Month approximated as 30 days (documented in code). No TODO/HACK/FIXME/NOTE/DECISION markers in cli-analytics; rationale lives in inline comments.

---

## 4. Testing Landscape

### Existing Coverage
- `cli-analytics/__tests__/format.test.ts`: formatDuration cases only null, 0, 500ms, 5s, 90s ('1m 30s'), 3661s ('1h 1m 1s'); also other format helpers.
- `SessionBody.activity.test.tsx` (activity values/qualifiers, duration fixture 45000ms), `SessionModal.test.tsx`, `SessionModal.truncation.test.tsx` (children and hooks mocked).
- `widgets/__tests__/MetricCard.spendQualification.test.tsx` (only MetricCard test); BarChartWidget.test/.spendQualification/Empty tests.
- Other CLI tests: Activity, CliAnalyticsTab, Cost, Efficiency, ExtendedSessionsModal, Overview(+Empty), Repositories*, SessionsView, ToolsView, UsersView, liveVerification; hooks tests.

### Testing Framework and Patterns
- Vitest 5.0.2, @testing-library/react 16.3.0, jest-dom 6.6.3, user-event 14.6.1, jsdom 24.1.3, React 19.2.8. Projects unit (`*.test.tsx`) and integration (`*.integration.test.tsx`); unit setup globally mocks useSnapshot and @/utils/api. Co-located `__tests__/`, inline vi.mock for children/hooks, AAA.

### Coverage Gaps
- formatDuration: no boundary tests (59s/60s, 3599/3600, 86399/86400, 7d, 29d/30d, 3-unit truncation, 1000-1999ms, negative/NaN/Infinity/undefined). Possible edge bug: 999.6 ms rounds to "1000ms".
- No tests for SessionTimeline, sessionTypography, AnalyticsWidget; no class/typography/responsive-class assertions; no test that restored shared typography is unchanged; no test of the new multi-unit format in SessionBody/Modal.
- Existing format tests do not fail on the new behaviour for tested inputs (they remain valid), but do not cover it.

---

## 5. Configuration and Environment

### Environment Variables
- None relevant (only import.meta.env.DEV in leaderboard/helpers.tsx:25).

### Configuration Files
- `tailwind.config.ts`: Tailwind 3.4.17 (max-sm: supported), tailwindcss-themer (dark/light), default screens (sm 640, md 768, lg 1024, xl 1280, 2xl 1536) plus custom card-grid-2/3 and view-details-bp. Custom fontSize under extend: xs-1 10px, sm-1 13px, h1-h5; default text-lg = 18px (line-height overridden by leading-snug). fontFamily geist / geist-mono. Odd custom fontWeight key 'text-2xl'.
- Global font-family not found in src/styles (main.scss referenced by Tailwind config not located).

### Feature Flags and Deployment Concerns
- None. Pure class and formatter change; no migrations, no deployment impact. Duration unit labels are hard-coded English (no i18n).

---

## 6. Risk Indicators

- Shared-component blast radius: MetricCard (9 callers incl. Overview/Cost/Efficiency/cliInsights) now renders a fixed 18px value; AnalyticsWidget (~33 importers) and BarChartWidget (13) were touched by the revert - regressions would appear across many views; no dedicated AnalyticsWidget test.
- formatDuration is shared with OverviewView and UsersView: new "0" inner units (e.g. `1d 0h 0m`) and the 3-unit cutoff change displayed values outside Session Details. Scheduler pages' formatDuration origin unverified.
- Duration truncation drops lower units without rounding (e.g. 1mo 0w 0d 5h shows `1mo 0w 0d`); short windows near the list end give 2 units (`1m 30s`), which may not be expected by "three units".
- Edge: Math.round makes 999.5-999.99 ms display as "1000ms".
- Code in format.ts has `Math.max(0, findIndex)` fallback - unreachable but would select "mo" if reached.
- Test gaps: no tests with the commits; typography and responsive behaviour unverifiable in jsdom (only toHaveClass string checks); no SessionTimeline tests.
- Styling guide conflict: arbitrary values (text-[11px]) and text-lg are used contrary to guide's ban on arbitrary values and h* scale; guide does not document them.
- Duplicated typography strings between MetricCard and sessionTypography.ts can drift (no shared source).
- Requirements are partly qualitative (AC on readability, hierarchy); needs visual verification at supported viewports (local-verification guide).
- codegraph unavailable; subagent reports did not read all of SessionBody/SessionTimeline/SessionModal, AnalyticsWidget or BarChartWidget in full.

---

## 7. Summary for Complexity Assessment

The change is front-end only and already implemented: 8 files (+99/-70) in src/pages/analytics/components. Layers touched are the shared widget layer (AnalyticsWidget, MetricCard, BarChartWidget), the CLI Analytics Session Details views (SessionBody, SessionModal, SessionTimeline), and pure helper modules (new sessionTypography.ts, format.ts). No API, store, DB, env or deployment changes.

Technically it follows established patterns (Tailwind utilities, semantic tokens, feature-local constants, prop-based overrides) and introduces nothing novel. The risk is breadth rather than depth: MetricCard is used by about 9 files, AnalyticsWidget by about 33, BarChartWidget by 13, and formatDuration also feeds Overview and Users views, so the revert and the 18px value change must be checked visually across CLI Analytics. The change is small in files but wide in affected surface.

Test posture is weak: commits added no tests, existing formatDuration tests cover only six simple inputs, and there are no tests for SessionTimeline, sessionTypography, AnalyticsWidget or class/responsive behaviour. Suggested scoring: low-to-medium complexity, driven by blast radius and missing tests, with formatDuration boundary tests being the highest-value gap.
