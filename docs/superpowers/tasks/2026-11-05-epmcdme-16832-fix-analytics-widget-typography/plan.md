# EPMCDME-16832: Session Details Widget Typography Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the ad hoc/arbitrary Tailwind typography across the CLI Analytics Session Details widgets with the application's documented `text-h1`–`text-h5` scale, so widget titles, metric labels, and metric values have a consistent, readable hierarchy.

**Architecture:** Pure presentation-layer restyle. No new components, no new tokens, no structural refactor. Each of the 6 touched files gets its existing `className` strings swapped for the nearest documented Tailwind token, following one shared semantic-tier table (below) so the same visual role gets the same token everywhere in Session Details.

**Tech Stack:** React 18 / TypeScript, Tailwind CSS (`tailwind.config.ts` `fontSize.h1`–`h5`), `cn()` utility (`@/utils/utils`).

**Spec:** No `spec.md` (sdlc-light flow). Source of truth: Jira EPMCDME-16832 (quoted below) + `docs/superpowers/tasks/2026-11-05-epmcdme-16832-fix-analytics-widget-typography/technical-analysis.md` + two HITL clarifications already resolved (scope = Session Details only; token strategy = snap to nearest existing token, no new tokens; shared-component ripple to other analytics tabs is accepted).

**Ticket (verbatim, condensed):** "[CLI Analytics][UI/UX] Inconsistent typography, poor readability and visual hierarchy in analytics widgets." Session Details dashboard widget titles/labels/values/descriptions lack clear visual hierarchy; most noticeable in Cost & Time, Token Usage, Activity, and chart sections. AC: typography follows the design system; headings/labels/values have consistent font styling; text readable without zooming; spacing/alignment consistent; hierarchy holds at supported viewport sizes; no clipping/overlap/truncation.

## Global Constraints

- Scope is these 6 files only: `SessionModal.tsx`, `AnalyticsWidget.tsx`, `MetricCard.tsx`, `SessionBody.tsx`, `SessionTimeline.tsx`, `BarChartWidget.tsx`. Do not touch `usage-attribution/widgets/Tile.tsx` or other CLI Analytics tab views (`ActivityView.tsx`, `CostView.tsx`, etc.) — confirmed out of scope with the user even though they share the same ad hoc patterns.
- No arbitrary Tailwind values (`text-[11px]`, `text-[10px]`, etc.) — every size must be one of the documented tokens: `text-h1`(32px) `text-h2`(24px) `text-h3`(16px/lh21) `text-h4`(14px/lh18) `text-h5`(12px/lh16). Do not add new tokens to `tailwind.config.ts`.
- `MetricCard.tsx` and `AnalyticsWidget.tsx` are shared by ~10 other analytics views outside Session Details. Fixing their default classes will visually ripple to those views — confirmed accepted with the user as a desirable side effect, not a regression to work around.
- No functional/structural refactor: do not make `SessionBody.tsx` reuse `MetricsGrid.tsx`, and do not make `SessionTimeline.tsx` reuse `MetricCard`. Class-string changes only.
- Use `cn()` (`@/utils/utils`) for any className that merges more than one source, per styling-guide.md rule 4. `MetricCard.tsx` currently builds two classNames with raw template literals (`` `...${mutedTextClassName}` ``) — convert those to `cn()` while touching this file.
- `height.card`/`var(--card-height, 158px)` is NOT applied anywhere in these 6 files (verified: no `h-card` usage in `src/pages/analytics`) — none of these widgets have a fixed card height. The real clipping risk is `line-clamp-2`/`line-clamp-3`/`truncate` classes on labels/descriptions with a larger font — do not remove or change those clamp classes, only the font-size/weight classes around them.
- No Chart.js option changes: neither `growthChartOptions` (`SessionBody.tsx`) nor `BarChartWidget.tsx`'s `chartOptions` currently set a tick/label font size (only colors) — chart-rendered text is not part of this inconsistency and is out of scope. Only the Tailwind-classed caption under the chart (`text-[11px]` in `BarChartWidget.tsx`) is in scope.
- Verify every changed class renders correctly in both `codemieDark` and `codemieLight` themes (font-size/weight tokens are theme-independent, but check legibility/contrast still reads fine) and at the `view-details-bp` (1200px), `card-grid-2` (1300px), `card-grid-3` (1600px) breakpoints.

### Semantic tier table (apply consistently across all 6 files)

| Semantic role | Current class(es) | New class(es) | Files |
|---|---|---|---|
| Modal/popup title | `text-base font-semibold` (16px) | `text-h3 font-semibold` | SessionModal.tsx |
| Modal/popup subtitle | `text-xs` (12px) | `text-h5` | SessionModal.tsx |
| Widget card title | `text-lg font-semibold` (18px) | `text-h3 font-semibold` | AnalyticsWidget.tsx |
| Widget card description/subtitle | `text-sm` (14px) | `text-h4` | AnalyticsWidget.tsx, SessionBody.tsx (fallback text) |
| Metric label (uppercase caption) | `text-[11px] font-semibold uppercase tracking-[0.03em] leading-4` | `text-h5 font-semibold uppercase tracking-[0.03em]` (drop `leading-4`; `text-h5` already sets `lineHeight: 16px`) | MetricCard.tsx |
| Metric value (primary number) | `text-lg sm:text-xl font-semibold leading-snug tracking-tight ...` | `text-h3 font-semibold tracking-tight ...` (drop responsive `sm:text-xl` and `leading-snug`; `text-h3` already sets `lineHeight: 21px`) | MetricCard.tsx |
| Metric qualification (small suffix under value) | `text-[11px] font-normal leading-4` | `text-h5 font-normal` | MetricCard.tsx |
| Metric description (caption under card) | `text-[11px] leading-5` | `text-h5` | MetricCard.tsx |
| Chart caption ("Bars show spend...") | `text-[11px] leading-4` | `text-h5` | BarChartWidget.tsx |
| Timeline section label ("Timeline") | `text-sm font-medium` (14px) | `text-h4 font-medium` | SessionTimeline.tsx |
| Timeline hint text ("click a step...") | `text-xs` (12px) | `text-h5` | SessionTimeline.tsx |
| Timeline row label / duration | `text-xs` (12px) | `text-h5` | SessionTimeline.tsx |
| Timeline detail-panel header (dispatch label) | `font-medium text-xs` (12px) | `font-medium text-h5` | SessionTimeline.tsx |
| Timeline detail-panel stat label (uppercase) | `text-xs font-semibold uppercase tracking-wide` (12px) | `text-h5 font-semibold uppercase tracking-wide` | SessionTimeline.tsx |
| Timeline detail-panel stat **value** (Cost/Tokens/Duration/Started) | `text-sm font-semibold` (14px) | `text-h3 font-semibold` — unified with MetricCard's "metric value" tier per AC "metric values have consistent font styling"; these are the same semantic concept (a headline metric number) as MetricCard's value | SessionTimeline.tsx |
| Timeline token-breakdown rows (Input/Output/Cache read/write — finer nested detail, intentionally kept smaller than the primary 4 stats above) | `text-xs` (12px) | `text-h5` | SessionTimeline.tsx |

Every row above maps to an existing token exactly or to its nearest neighbor; no in-between gap is created.

## Review Focus

- Metric label text (`text-[11px]` → `text-h5`, same font family just +1px) combined with existing `line-clamp-2 max-sm:basis-full` — verify two-word labels ("Cache-read", "Tool calls") still wrap to exactly 2 lines without visually breaking the card at `max-sm` width.
- `MetricCard` qualification span (`-mr-3 block break-words`) at the new `text-h5` size — verify a longer qualification string (e.g. "(at least; some spend unattributed)") still breaks across lines inside the card without overflowing past the card's right edge.
- `AnalyticsWidget` header row (`max-lg:flex-wrap`) with the title bumped from `text-lg` to `text-h3` — verify the title doesn't visually collide with the expand button / actions at widths just under `lg` (1024px).
- `SessionTimeline` detail panel (`w-52 shrink-0`, 2-col grid) with its primary stat value bumped from `text-sm`(14px) to `text-h3`(16px) — verify a longer cost/duration string doesn't force an unwanted second line or overflow the fixed `w-52` panel.
- Dark vs light theme: since only font-size/weight classes change (not color tokens), verify legibility/contrast is unaffected in both `codemieDark` and `codemieLight` — a regression here would most likely show as a token typo (e.g. `text-h5` misspelled) rather than a real contrast issue.

---

### Task 1: SessionModal.tsx — modal header typography

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/views/SessionModal.tsx:55-56`

**Interfaces:** None — leaf JSX change, no prop/signature changes.

- [ ] **Step 1:** In the `headerContent` block, change the title `<span>` class from `"text-base font-semibold text-text-primary truncate"` to `"text-h3 font-semibold text-text-primary truncate"`.
- [ ] **Step 2:** Change the subtitle `<span>` class from `"text-xs text-text-secondary truncate"` to `"text-h5 text-text-secondary truncate"`.
- [ ] **Step 3 (manual check, no automated test exists / is feasible — see Global Constraints):** Run `npm run dev`, open CLI Analytics → a session → Session Details, confirm the popup title is visibly larger than the widget card titles underneath it (restores top-level hierarchy) and the subtitle line still truncates without wrapping.
- [ ] **Step 4: Commit**

```bash
git add src/pages/analytics/components/cli-analytics/views/SessionModal.tsx
git commit -m "EPMCDME-16832: Use design-system tokens for session modal header typography"
```

---

### Task 2: AnalyticsWidget.tsx — shared widget card title/description

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsWidget.tsx:134,136`

**Interfaces:** None — `AnalyticsWidgetProps` unchanged.

- [ ] **Step 1:** Change the `<h3>` title class from `"text-lg font-semibold text-text-primary"` to `"text-h3 font-semibold text-text-primary"`.
- [ ] **Step 2:** Change the description `<p>` class from `"text-sm text-text-quaternary mt-1"` to `"text-h4 text-text-quaternary mt-1"`.
- [ ] **Step 3 (manual check):** Confirm this component is also used by non-Session-Details views (e.g. `CostView.tsx`, `OverviewView.tsx` — any file importing `AnalyticsWidget`); this ripple is expected and accepted per the Global Constraints, not a regression to revert.
- [ ] **Step 4: Commit**

```bash
git add src/pages/analytics/components/AnalyticsWidget.tsx
git commit -m "EPMCDME-16832: Use design-system tokens for shared widget card title/description"
```

---

### Task 3: MetricCard.tsx — metric label/value/qualification/description

**Files:**
- Modify: `src/pages/analytics/components/widgets/MetricCard.tsx:37,46-68`

**Interfaces:** `MetricCardProps.valueClassName` default value changes (see Step 2); no prop name/type changes.

- [ ] **Step 1:** Change the label `<p>` className (line ~47) from the template literal
  `` `min-w-0 text-[11px] font-semibold uppercase tracking-[0.03em] leading-4 line-clamp-2 max-sm:basis-full ${mutedTextClassName}` ``
  to `cn('min-w-0 text-h5 font-semibold uppercase tracking-[0.03em] line-clamp-2 max-sm:basis-full', mutedTextClassName)` (drop `leading-4`; `text-h5` already carries `lineHeight: 16px`). Import `cn` is already present.
- [ ] **Step 2:** Change the `valueClassName` default prop (line 37) from
  `'text-lg sm:text-xl font-semibold leading-snug tracking-tight text-text-primary break-words [font-variant-numeric:tabular-nums]'`
  to `'text-h3 font-semibold tracking-tight text-text-primary break-words [font-variant-numeric:tabular-nums]'` (drop the responsive `sm:text-xl` step-up and `leading-snug`; `text-h3` already carries `lineHeight: 21px`).
- [ ] **Step 3:** Change the qualification `<span>` className (line ~61) from
  `"-mr-3 block break-words text-[11px] font-normal leading-4 tracking-normal text-text-quaternary"`
  to `"-mr-3 block break-words text-h5 font-normal tracking-normal text-text-quaternary"`.
- [ ] **Step 4:** Change the description `<p>` className (line ~68) from the template literal
  `` `mt-1 text-[11px] leading-5 line-clamp-3 ${mutedTextClassName}` ``
  to `cn('mt-1 text-h5 line-clamp-3', mutedTextClassName)`.
- [ ] **Step 5 (manual check):** Run `npx vitest run --project unit src/pages/analytics/components/widgets/__tests__/MetricCard.spendQualification.test.tsx` — this test asserts qualification text content/badge logic, not classNames, so it must still pass unchanged; a failure here means a prop/behavior regression, not a styling one.
- [ ] **Step 6: Commit**

```bash
git add src/pages/analytics/components/widgets/MetricCard.tsx
git commit -m "EPMCDME-16832: Use design-system tokens for metric card typography"
```

---

### Task 4: SessionBody.tsx — fallback text under the growth chart

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/views/SessionBody.tsx:249`

**Interfaces:** None.

- [ ] **Step 1:** Change the fallback `<p>` className from `"text-text-quaternary text-sm"` to `"text-text-quaternary text-h4"`.
- [ ] **Step 2 (manual check):** A session with fewer than 2 API events shows this fallback instead of the growth chart — confirm by temporarily inspecting a session with sparse events, or visually confirm the class renders the expected size via devtools; no test exists for this path.
- [ ] **Step 3: Commit**

```bash
git add src/pages/analytics/components/cli-analytics/views/SessionBody.tsx
git commit -m "EPMCDME-16832: Use design-system token for growth chart fallback text"
```

---

### Task 5: SessionTimeline.tsx — timeline list and detail panel typography

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/views/SessionTimeline.tsx:80,105,107,147,158,198,206,209,214,217,222,225,231,234,242,247-248,255-256,263-264,271-272`

**Interfaces:** None — `SessionTimelineProps` unchanged.

- [ ] **Step 1:** Empty-state text (line 80): `"text-text-secondary text-sm"` → `"text-text-secondary text-h4"`.
- [ ] **Step 2:** "Timeline" section label (line 105): `"text-sm font-medium text-text-primary"` → `"text-h4 font-medium text-text-primary"`.
- [ ] **Step 3:** "click a step for details" hint (line 107): `"text-xs text-text-secondary"` → `"text-h5 text-text-secondary"`.
- [ ] **Step 4:** Row label span (line 147): `"text-xs text-text-primary truncate"` → `"text-h5 text-text-primary truncate"`.
- [ ] **Step 5:** Row duration span (line 158): `"text-xs text-text-secondary text-right tabular-nums"` → `"text-h5 text-text-secondary text-right tabular-nums"`.
- [ ] **Step 6:** Detail-panel dispatch label (line 198): `"text-text-primary font-medium text-xs truncate"` → `"text-text-primary font-medium text-h5 truncate"`.
- [ ] **Step 7:** Detail-panel stat labels — all four occurrences at lines 206, 214, 222, 231 (`Cost` / `Tokens` / `Duration` / `Started`): `"text-xs font-semibold uppercase tracking-wide text-text-secondary"` → `"text-h5 font-semibold uppercase tracking-wide text-text-secondary"` (line 242's "Token Breakdown" header uses the same class with an added `mb-1` — apply the same token swap there too, keeping `mb-1`).
- [ ] **Step 8:** Detail-panel stat **values** — all four occurrences at lines 209, 217, 225, 234 (`costLabel` / `totalTokens` / duration / "into session"): `"text-sm font-semibold text-text-primary tabular-nums"` → `"text-h3 font-semibold text-text-primary tabular-nums"` (per the semantic-tier table: unify with `MetricCard`'s metric-value tier).
- [ ] **Step 9:** Token-breakdown rows (lines 247-248, 255-256, 263-264, 271-272 — Input/Output/Cache read/Cache write labels and values): all `"text-xs ..."` → `"text-h5 ..."` (these stay at the label tier, intentionally smaller than Step 8's primary stat values — see semantic tier table rationale).
- [ ] **Step 10 (manual check):** Open a session with sub-dispatches (non-session `kind`) so the detail panel renders; confirm the 4 primary stats (Cost/Tokens/Duration/Started) are visibly the same size as `MetricCard` values elsewhere on the page, and the nested Token Breakdown rows remain visibly smaller/secondary. Confirm the `w-52` panel does not overflow or wrap awkwardly with the larger values.
- [ ] **Step 11: Commit**

```bash
git add src/pages/analytics/components/cli-analytics/views/SessionTimeline.tsx
git commit -m "EPMCDME-16832: Use design-system tokens for session timeline typography"
```

---

### Task 6: BarChartWidget.tsx — "Most Used Tools" caption

**Files:**
- Modify: `src/pages/analytics/components/widgets/BarChartWidget.tsx:327`

**Interfaces:** None.

- [ ] **Step 1:** Change the qualification caption className from `"px-4 pb-2 text-[11px] leading-4 text-text-quaternary"` to `"px-4 pb-2 text-h5 text-text-quaternary"`.
- [ ] **Step 2 (manual check):** Run the existing `BarChartWidget` tests to confirm no regression: `npx vitest run --project unit src/pages/analytics/components/widgets/__tests__/BarChartWidget.test.tsx src/pages/analytics/components/widgets/__tests__/BarChartWidgetEmpty.test.tsx src/pages/analytics/components/widgets/__tests__/BarChartWidget.spendQualification.test.tsx` — these assert content/behavior, not classNames, so they must still pass.
- [ ] **Step 3: Commit**

```bash
git add src/pages/analytics/components/widgets/BarChartWidget.tsx
git commit -m "EPMCDME-16832: Use design-system token for most-used-tools chart caption"
```

---

## Final verification (after all 6 tasks)

- [ ] Run `npm run lint` and `npm run type-check` (exact script names per `package.json`) — confirm clean.
- [ ] Run the full existing suite for touched files: `npx vitest run --project unit src/pages/analytics` — confirm no regressions (these tests assert DOM content/behavior, which this change does not touch).
- [ ] Manual visual pass in the running app: open Session Details, toggle dark/light theme, resize across `view-details-bp` (1200px), `card-grid-2` (1300px), `card-grid-3` (1600px) — confirm no clipping/overlap/truncation per the ticket's AC, and capture screenshots per `local-verification.md` for the MR's `## Verified locally` section.
