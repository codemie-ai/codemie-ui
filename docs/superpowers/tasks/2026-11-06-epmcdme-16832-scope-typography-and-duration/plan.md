# EPMCDME-16832 Consistent CLI Analytics Typography and Duration Format — Implementation Plan

> **Retrospective plan.** The work below is already implemented and committed on
> `EPMCDME-16832_scope-typography-to-session-details` (commits `5319ac0a7`, `a0ddb449f`). It was
> reconstructed from the diff so that review, QA gates and the complexity assessment run against a
> recorded plan. No step here is to be executed again.

**Goal:** Make metric typography consistent across CLI Analytics without restyling other views, and show long durations in days, weeks and months.

**Architecture:** Undo the shared-component font-size changes MR 2248 made so every analytics view looks as before; give all `MetricCard` values one size (18px). Session-Details-only fixes live in the Session views and a feature-local constants file. Duration formatting changes in the single `formatDuration` helper used by CLI Analytics.

**Tech Stack:** React 18, TypeScript 5, Tailwind 3, Chart.js (`react-chartjs-2`).

**Spec:** none (sdlc-light). Requirements: Jira EPMCDME-16832 acceptance criteria plus the user's clarifications — see `technical-analysis.md` §1.

## Global Constraints

- Shared components (`AnalyticsWidget`, `MetricCard`, `BarChartWidget`) must render as before MR 2248, except the one agreed change: `MetricCard` value is `text-lg` (18px), no `sm:text-xl`.
- Session-only styling must not leak into shared components (no opt-in props left unused).
- Month = 30 days. Duration shows three units starting at the largest filled; zero inner units are shown.
- Commit subjects: `EPMCDME-16832: Capital sentence`. No `--no-verify`.

## Review Focus

- `formatDuration` boundaries: `24h-1ms`, `7d-1ms`, `30d-1ms` stay in the lower format; exact `1d`, `1w`, `1mo` switch.
- `formatDuration` of `999.5–999.99 ms` prints `1000ms` (pre-existing rounding).
- `formatDuration(null | 0 | NaN | negative)` prints `—`.
- Overview and Users views also change their duration text, not only Session Details.
- Narrow viewports: top widget row stacks below `lg`; timeline label column shrinks; nothing clips.

---

### Task 1: Restore shared widget typography

**Files:**
- Modify: `src/pages/analytics/components/AnalyticsWidget.tsx`
- Modify: `src/pages/analytics/components/widgets/BarChartWidget.tsx`
- Modify: `src/pages/analytics/components/widgets/MetricCard.tsx`

**Interfaces:**
- Produces: `MetricCard` value default `text-lg font-semibold leading-snug tracking-tight text-text-primary break-words [font-variant-numeric:tabular-nums]`; all other classes as before MR 2248.

**Test-first:** no — visual/class-only revert; the user asked for no tests. A class assertion on `MetricCard` value (`toHaveClass('text-lg')`, `not.toHaveClass('sm:text-xl')`) would pin it.

- [x] **Step 1:** Reverse the MR 2248 hunks in the three files (title `text-lg`, description `text-sm`, metric label/qualification/description `text-[11px]`, chart caption `text-[11px] leading-4`).
- [x] **Step 2:** Drop `sm:text-xl` from the `MetricCard` value default.
- [x] **Step 3:** `npx tsc --noEmit` passes.
- [x] **Step 4:** Commit `5319ac0a7`.

### Task 2: Session Details layout and timeline tiles

**Files:**
- Create: `src/pages/analytics/components/cli-analytics/sessionTypography.ts`
- Modify: `src/pages/analytics/components/cli-analytics/views/SessionBody.tsx`
- Modify: `src/pages/analytics/components/cli-analytics/views/SessionTimeline.tsx`
- Modify: `src/pages/analytics/components/cli-analytics/views/SessionModal.tsx`

**Interfaces:**
- Produces: `SESSION_STAT_LABEL_CLASS`, `SESSION_STAT_VALUE_CLASS` (strings) mirroring the `MetricCard` label and value.
- Consumes: `MetricCard` value/label classes from Task 1.

**Test-first:** no — layout/class changes; jsdom cannot verify responsive behaviour. Browser check required instead (local-verification guide).

- [x] **Step 1:** `SessionBody` top row `grid-cols-1 lg:grid-cols-3 gap-4`; metric grids `gap-3 max-sm:gap-2`.
- [x] **Step 2:** `SessionTimeline`: detail tiles use the two constants; remove the duplicate "Timeline" label (keep the hint); label column `minmax(120px,180px)`.
- [x] **Step 3:** `SessionModal`: revert the MR 2248 header classes to `text-base` / `text-xs`.
- [x] **Step 4:** `npx tsc --noEmit` and eslint pass. Commit `5319ac0a7`.

### Task 3: Duration format

**Files:**
- Modify: `src/pages/analytics/components/cli-analytics/format.ts`

**Interfaces:**
- Produces: `formatDuration(ms: number | null | undefined): string` — `—` for null/0/negative/non-finite; `<n>ms` below 1 s; else three units from the largest filled of `mo`(30d) `w` `d` `h` `m` `s`, within the list.

**Test-first:** no — user declined tests. Failing tests would be: `formatDuration(86_400_000) === '1d 0h 0m'`, `formatDuration(604_800_000) === '1w 0d 0h'`, `formatDuration(2_592_000_000) === '1mo 0w 0d'`, `formatDuration(86_399_999) === '23h 59m 59s'`.

- [x] **Step 1:** Replace the h/m/s logic with the unit table and a three-unit window.
- [x] **Step 2:** Sample values checked with a standalone script (`1d 2h 3m`, `1w 2d 3h`, `2mo 1w 3d`, `5d 7h 50m` for 127h50m3s).
- [x] **Step 3:** `npx tsc --noEmit` and eslint pass. Commit `a0ddb449f`.

---

## Self-review

- Coverage: ACs 1–3 → Tasks 1–2; viewport/clipping AC → Task 2 (browser check pending); duration request → Task 3.
- Gap noted: no automated tests were added (user's choice); `formatDuration` boundaries are the highest-value test to add.
