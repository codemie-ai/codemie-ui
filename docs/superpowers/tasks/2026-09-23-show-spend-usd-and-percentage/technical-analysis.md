# Technical Research

**Task**: spending budget currency widget
**Generated**: 2026-09-23
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15187: Personal spending widget: show spend in USD alongside the consumption percentage. Change SpendingCard doughnut centre label and SpendingProgressBar bar label to show format "$12.34 (45%)" instead of bare percentage. Reuse existing formatCurrency/formatSpend helpers in src/utils/currency.ts. Do not clamp USD value at 100 (only percentage/bar clamp). Handle null/undefined spend as "-", no misleading warning colour. Narrow-viewport: no overflow/clip/wrap. UI-only change, no backend, no API change, current_spending already returned by KEY_SPENDING API. Components to change: src/pages/settings/components/SpendingCard.tsx (doughnut centre label, near line 216) and src/pages/analytics/components/widgets/SpendingProgressBar.tsx (bar label, near line 63). Watch clamping asymmetry: SpendingProgressBar.tsx:36 and SpendingCard.tsx:106 clamp with Math.min(...,100) — that's for percentage/bar only, USD value must not be clamped. Both components render in Profile -> Your personal spending and in User Details popup (reused there). Out of scope: SpendingTable.tsx (unused, only its threshold constants imported by projectsManagement/components/budgetSpending.ts), budget limit display, currency conversion, other spend-showing surfaces (UserProjectSpendingTable/SpendingAmount, BudgetSpendCell, ProjectBudgetCard), CLI statusline, warning/danger thresholds, reset-date display.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/settings/components/SpendingCard.tsx` — fetches `TabularMetricType.KEY_SPENDING` via `analyticsStore.fetchTabularData`, renders either a doughnut summary (single-row, `shouldUseWidget`) or a `TableWidget` (multi-row, admin "User spending" list). The doughnut label is at line 216 (`{percentage.toFixed(1)}%`). `percentage` (line 103-110) is derived from `row.total`, clamped `Math.min(..., 100)` at line 106. `currentMetric` (line 100) already looks up the `current_spending` metric object (`{ id, label, format, value }` — `value` is `string | number | boolean`, format is `MetricFormat.CURRENCY`) but today only uses it as a truthiness gate (`currentMetric && limitMetric`) to decide whether to render the doughnut — its numeric value is not read into the label.
- `src/pages/analytics/components/widgets/SpendingProgressBar.tsx` — pure presentational bar; receives only `percentage: number` as a prop (no spend/currency prop exists yet). Clamps at line 37 (`normalizedPercentage = Math.min(Math.max(percentage, 0), 100)`), colors bar via `getStatusColor`/`getStatusColorWithOpacity`, and renders the label at line 64 (`{normalizedPercentage.toFixed(1)}%`) in a `<span>` with `w-12 text-right whitespace-nowrap` — a fixed 3rem width that will need re-measuring for a longer "$12.34 (45%)" string.
- `src/pages/settings/components/SpendingCard.tsx:225-250` (`getSpendingCustomRenderColumns`) is the only call site of `SpendingProgressBar`, inside `TableWidget`'s `customRenderColumns` for the `total` (percentage) column. It receives the full row (`item: Record<string, string | number | boolean>`) but currently passes only `percentage={value}` — the row's `current_spending` field is available on `item` but not threaded through today.
- `src/utils/currency.ts` — `formatCurrency(value: number): string` (`$1,234.50` style, no null handling) and `formatSpend(value: number | null | undefined): string` (`'-'` for null/undefined, else `formatCurrency`). These are the canonical, already-shared helpers named by the task; no local duplicate exists in either target file today.
- `src/utils/analyticsFormatters.ts` — `formatMetricValue(value, format)` used for the other metric rows rendered in `SpendingCard.tsx` (the list above the doughnut); for `MetricFormat.CURRENCY` it independently reimplements the same `$X,XXX.XX` formatting `formatCurrency` provides (not touched by this task, but shows format duplication already exists in this file).
- `src/pages/settings/administration/usersManagement/components/popups/UserDetailsPopup.tsx` — renders `<SpendingCard userId={...} />` directly (grep confirms this is the "User Details popup" reuse the task references); it does not import `SpendingProgressBar` directly — that only reaches the popup indirectly through `SpendingCard`'s multi-row table path.
- `src/pages/settings/ProfilePage.tsx` — renders `<SpendingCard />` for "Your personal spending" (the other reuse site named in the task).

### Architecture and Layers Affected

- **Presentation/widget layer only**: `SpendingCard.tsx` (settings page component) and `SpendingProgressBar.tsx` (analytics widget, reused from settings). No store, API client, or type changes — `analyticsStore.fetchTabularData` and `TabularResponse` are read-only inputs here.
- **Shared utility layer**: `src/utils/currency.ts` is consumed, not changed (per task, "reuse existing helpers").

### Integration Points

- `SpendingCard` → `analyticsStore.fetchTabularData(TabularMetricType.KEY_SPENDING, ...)` (`src/store/analytics`) — read path only, `current_spending` is already a column returned by this call per the task description.
- `SpendingCard` → `SpendingProgressBar` (import at `SpendingCard.tsx:35`), the only in-repo consumer of `SpendingProgressBar`.
- `SpendingCard` → `TableWidget` (`src/pages/analytics/components/widgets/TableWidget`) for the multi-row/admin path; `customRenderColumns` is the seam through which `SpendingProgressBar` gets its row data.
- `getStatusColor` / `getStatusColorWithOpacity` (`src/pages/analytics/components/widgets/RatioWidget/utils.ts`) drive the colour of both the doughnut segment and the bar/text — both take a `percentage` plus `dangerThreshold`/`warningThreshold`; task explicitly says thresholds/colour logic are out of scope, only "no misleading colour when spend is null" needs handling (i.e., don't run a null/undefined spend through the danger/warning percentage colour path).

### Patterns and Conventions

- Null-safe currency formatting is a solved, shared pattern (`formatSpend`) already used across `BudgetSpendCell.tsx`, `SpendingAmount.tsx`, `ProjectsManagementFull.tsx`, etc. — this task is expected to plug into that existing pattern rather than add new null-handling logic.
- Percentage/bar values are clamped separately from currency values everywhere else in the codebase too (e.g. `calculatePercentage` in `RatioWidget/utils.ts` clamps at 100 but only for percentage, never for the underlying currency amount) — consistent with the task's explicit clamping-asymmetry warning.
- Fixed-width label containers (`w-12`, `text-right`, `whitespace-nowrap`) are the existing convention for compact numeric labels in this widget family; a longer combined label will need width/overflow handling to preserve the "no clip/wrap on narrow viewport" requirement.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guide under `.ai-run/guides/` names `SpendingCard`, `SpendingProgressBar`, `formatCurrency`, or `formatSpend`. Relevant general guides: `.ai-run/guides/components/component-patterns.md` (component construction conventions) and `.ai-run/guides/styling/styling-guide.md` (Tailwind conventions, relevant to the narrow-viewport/no-clip requirement) — neither was written with this widget in mind.

### Architectural Decisions

`docs/superpowers/specs/2026-08-13-epmcdme-14071-user-project-spending-design.md` and its companion plan (`docs/superpowers/plans/2026-08-13-epmcdme-14071-user-project-spending.md`) record the design decision that introduced `formatCurrency`/`formatSpend` as the canonical shared helpers, replacing six duplicated local copies, and specifically call out `formatSpend(0)` (real spend) vs `null`/`undefined` (no data, renders `-`) as the behavior that matters. That is the exact null-handling behavior this task is told to reuse.

### Derived Conventions

- Currency labels colocated with a status-coloured element (bar, doughnut) consistently derive their colour from the percentage via `getStatusColor`, not from the currency value itself — supports the task's "no misleading warning colour" instruction: when spend is null, the percentage-derived colour path should not be treated as a real reading.

---

## 4. Testing Landscape

### Existing Coverage

- `src/utils/__tests__/currency.test.ts` — unit tests for `formatCurrency`/`formatSpend`/`formatCliAnalyticsCost` (locale formatting, `null`/`undefined` → `-`, `0` → `$0.00`). This is solid, reusable coverage for the helper this task calls into.
- No test file exists for `SpendingCard.tsx` or `SpendingProgressBar.tsx` (`Glob` for `**/SpendingCard*.test.tsx` and `**/SpendingProgressBar*.test.tsx` both returned no matches).

### Testing Framework and Patterns

Vitest with React Testing Library, two projects (`unit`, `integration`) per `package.json`/`AGENTS.md`. Other tests in this area (e.g. `UserDetailsPopup.auditor.test.tsx`) follow a component-mount + assertion style; no fixture/mock specific to spending widgets exists yet.

### Coverage Gaps

- Both target components (`SpendingCard.tsx`, `SpendingProgressBar.tsx`) have zero existing tests, so this task's rendering-format change has no regression safety net today.
- No test exercises `getSpendingCustomRenderColumns`'s wiring between the `TableWidget` row and `SpendingProgressBar`, which is the exact seam that needs a new prop if the bar label is to include the row's `current_spending`.

---

## 5. Configuration and Environment

### Environment Variables

None found referencing this feature area — this is a pure UI formatting change with no config/env surface.

### Configuration Files

None specific to spending display formatting; `TabularMetricType.KEY_SPENDING` and its columns are defined server-side per the task ("current_spending already returned by KEY_SPENDING API") and are out of this repo's config.

### Feature Flags and Deployment Concerns

None found.

---

## 6. Risk Indicators

- **`SpendingProgressBar` has no spend/currency prop today.** Its only call site (`SpendingCard.tsx` `getSpendingCustomRenderColumns`) currently passes only `percentage`. Speculative: satisfying "bar label shows `$12.34 (45%)`" will require adding a new prop (e.g. `spend`) and threading the row's `current_spending` value through from `item` at the `TableWidget` call site — this is a design/plan decision, not something observed in the current code.
- **Fixed label width (`w-12`) on the bar label** was sized for a 4-6 character percentage string; a combined "$12.34 (45%)" string is much longer, and the task explicitly requires no overflow/clip/wrap on narrow viewports — this is a concrete layout risk given the current markup.
- **Clamping asymmetry is real and already present**: `SpendingCard.tsx:106` and `SpendingProgressBar.tsx:37` clamp the *percentage* at 100, and there is currently no separate USD value being read out of either component's percentage math — introducing an unclamped USD read next to a clamped percentage read is new logic, not an existing pattern to copy.
- **No tests exist for either target file**, so this change starts from zero coverage and any behavior (null handling, clamping, colour) asserted by the task will need new tests written from scratch.
- **`current_spending` nullability is a real, pre-existing domain concern** — `src/types/entity/budget.ts:59` and `src/types/entity/projectManagement.ts:30` both type it as `number | null | undefined` elsewhere in the codebase, corroborating the task's "handle null/undefined spend as '-'" requirement is not a hypothetical edge case.
- **`formatMetricValue` (`src/utils/analyticsFormatters.ts`) independently reimplements currency formatting** for the metric-list rows in `SpendingCard.tsx` above the doughnut. It is out of scope per the task, but its coexistence with `formatCurrency` in the same file is worth the implementer noticing so the two don't visibly disagree on formatting within the same card.

---

## 7. Summary for Complexity Assessment

This is a presentation-layer-only change confined to two files (`SpendingCard.tsx`'s doughnut label, `SpendingProgressBar.tsx`'s bar label) plus their shared colour/percentage utilities, with no store, API, or type changes — `current_spending` is already returned by the backend. The task explicitly names the exact lines to change and the helpers to reuse (`formatCurrency`/`formatSpend`, already tested and null-safe), which caps novelty on the formatting side.

The main technical wrinkle is that `SpendingProgressBar` currently has no prop carrying a spend/currency value — only `percentage` — so making its label show `$12.34 (45%)` requires extending its prop interface and threading `current_spending` through its one call site (`SpendingCard.tsx`'s `getSpendingCustomRenderColumns`, which already has access to the full row via `item` but doesn't pass it today). Combined with the fixed-width (`w-12`) label styling that will need to accommodate a longer string without wrapping or clipping on narrow viewports, this is a small but non-trivial layout/prop-plumbing change, not a pure copy-paste of an existing format call.

Test coverage for both target components is currently zero, so risk is concentrated in verifying the four explicit behavioral requirements (unclamped USD, clamped percentage, null → "-" with no misleading colour, no overflow on narrow viewport) rather than in unfamiliar domain logic — the underlying helpers and colour functions are already well-established and tested elsewhere in the codebase.

---

## 8. External References

None named by the task.
