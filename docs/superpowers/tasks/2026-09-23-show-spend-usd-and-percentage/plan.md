# Plan: Show spend USD alongside consumption percentage (EPMCDME-15187)

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] Single budget: `SpendingCard` doughnut centre label shows `$12.34 (45%)` — percentage still shown, not replaced.
- [ ] Multiple budgets: `SpendingProgressBar` label shows `$12.34 (45%)` per bar — bar and percentage remain.
- [ ] User Details popup shows the same presentation with no separate code change (it reuses `SpendingCard`).
- [ ] Currency uses the existing `formatCurrency`/`formatSpend` format (`$1,234.56`).
- [ ] Percentage in the combined label is rendered with `Math.round` and no decimal (`45%`, not `45.0%`), matching the CLI statusline (`codemie-code/src/agents/plugins/claude/plugin/statusline.mjs:84`).
- [ ] Spend exceeding budget shows the real, unclamped USD value while percentage/bar stay capped at 100%.
- [ ] Spend absent (`null`/`undefined`, not `0`) renders `-`, never `$0.00` or `$NaN`, and triggers no misleading warning colour.
- [ ] Narrow viewport: neither label overflows, clips, or wraps unreadably.

## Review Focus

- Spend of exactly `0` (real spend, distinct from "no data") must render `$0.00`, not `-` — `formatSpend` already distinguishes this, but the coercion step that reads the raw row/metric value must not treat `0` as falsy and collapse it to `null`.
- A multi-row table row with the `current_spending` column missing entirely (not just `null`) must not crash `SpendingProgressBar` — `item.current_spending` is `undefined` in that case and must render `-`, same as an explicit `null`.
- Null spend must not trigger the danger/warning colour: colour is derived from `percentage` alone in both components, so a null spend paired with a high percentage still shows whatever colour the percentage warrants — not a separate "unknown data" colour.
- A percentage of exactly `100` (not over) must not be mistaken for the "exceeds budget, unclamped spend" case — the label must still read `$<spend> (100%)` using the real spend, whether spend is above, at, or below the budget limit.
- Very large spend values (e.g. `$12,345.67`) combined with a 3-digit percentage must not overflow the doughnut's fixed `w-32 h-32` container or the table row height — covered by Task 1's width-class assertion and Task 2's wrapping step.
- The percentage digits inside the new combined label are rounded with `Math.round` (no decimal), matching the CLI statusline exactly — this changes only the digits rendered in this specific label, not how `percentage`/`normalizedPercentage` is computed, clamped, or used for colour thresholds or the bar's fill width elsewhere in either file.

## Task 1 — Extend `SpendingProgressBar` with a null-safe, unclamped spend label

`src/pages/analytics/components/widgets/SpendingProgressBar.tsx`

Test-first: yes — add `src/pages/analytics/components/widgets/__tests__/SpendingProgressBar.test.tsx` (new file) with failing cases before implementing: (a) `spend={12.34} percentage={44.5}` renders text `"$12.34 (45%)"` (`Math.round(44.5)` → `45`); (b) `spend={120} percentage={250}` renders `"$120.00 (100%)"` — spend unclamped, percentage clamped; (c) `spend={null} percentage={30}` and `spend={undefined} percentage={30}` both render `"- (30%)"`, and the rendered colour is unchanged versus the same `percentage` with a non-null spend (colour derives from `percentage` only); (d) `spend={0} percentage={0}` renders `"$0.00 (0%)"`, not `"- (0%)"`; (e) the label element's class list no longer includes the fixed `w-12` width and instead allows the string to size to content (assert the element still carries `whitespace-nowrap` and does not carry `w-12`).

Steps:
1. Add `spend: number | null | undefined` to `SpendingProgressBarProps` (`SpendingProgressBar.tsx:24-29`).
2. In the component body, build the label as `` `${formatSpend(spend)} (${Math.round(normalizedPercentage)}%)` `` using `formatSpend` from `src/utils/currency.ts` — import it. Match the CLI statusline's rounding (`Math.round`, no decimal — `codemie-code/src/agents/plugins/claude/plugin/statusline.mjs:84`) rather than the existing UI's `toFixed(1)`. Do not clamp `spend`; only `normalizedPercentage` (already clamped at line 37) is used for the percentage part, and no other percentage display or computation in this file changes.
3. Replace the label content at `SpendingProgressBar.tsx:64` with the combined string, and change the `<span>`'s class at line 60-61 from `w-12 text-right` to a non-fixed-width equivalent (drop `w-12`, keep `whitespace-nowrap` and `text-right`; add `min-w-0` on the flex row wrapper at line 50 so the longer label can shrink within its table cell instead of forcing overflow) so a string like `$1,234.56 (100%)` does not clip on narrow viewports.

## Task 2 — Update `SpendingCard` doughnut centre label

`src/pages/settings/components/SpendingCard.tsx`

Test-first: yes — add `src/pages/settings/components/__tests__/SpendingCard.test.tsx` (new file) with failing cases before implementing, mocking `analyticsStore.fetchTabularData` to return a single-row `KEY_SPENDING` response: (a) row with `current_spending: 12.34`, `total: 45` renders doughnut label `"$12.34 (45%)"`; (b) row with `current_spending: 120`, `total: 250` renders `"$120.00 (100%)"` (unclamped spend, clamped percentage — mirrors the existing clamp at `SpendingCard.tsx:106`); (c) row with `current_spending: null`, `total: 30` renders `"- (30%)"` with the doughnut segment colour unchanged versus the same `total` with a non-null `current_spending` (colour continues to derive only from `percentage`); (d) row with `current_spending: 0`, `total: 0` renders `"$0.00 (0%)"`, not `"- (0%)"`.

Steps:
1. Read `currentMetric.value` (already resolved at `SpendingCard.tsx:100`) as `number | null | undefined` — coerce non-numeric/`boolean` values defensively to `null`, but pass a real `0` through unchanged (mirrors the existing `typeof row.total === 'number' ? row.total : 0` guard at line 106, except this read must preserve `null`/`undefined` rather than defaulting to `0`).
2. Import `formatSpend` from `src/utils/currency.ts`.
3. Replace the centre label at `SpendingCard.tsx:216` (`{percentage.toFixed(1)}%`) with `` {`${formatSpend(currentSpendValue)} (${Math.round(percentage)}%)`} `` — matches the CLI statusline's rounding (`Math.round`, no decimal — `codemie-code/src/agents/plugins/claude/plugin/statusline.mjs:84`) rather than the existing `toFixed(1)`. `percentage` (line 103-110) is already clamped; do not clamp the spend value read in step 1, and do not change how `percentage` itself is computed, clamped, or used elsewhere (colour thresholds, other displays).
4. At `SpendingCard.tsx:214-218`, drop any implicit no-wrap behavior on the centre label (there is currently no `whitespace-nowrap` there, so no class removal is needed) and reduce the label's font size one step (e.g. `text-base` → `text-sm`) so the longer combined string wraps onto two lines within the existing `w-32 h-32` doughnut container instead of overflowing it on narrow viewports.

## Task 3 — Thread `current_spending` into `SpendingProgressBar` at its call site

`src/pages/settings/components/SpendingCard.tsx` (`getSpendingCustomRenderColumns`, lines 225-250)

Test-first: yes — extend `src/pages/settings/components/__tests__/SpendingCard.test.tsx` (from Task 2) with a multi-row `KEY_SPENDING` response (`rowCount > 1`, table path): (a) a row with `current_spending: 12.34, total: 45` renders the table's `SpendingProgressBar` label as `"$12.34 (45%)"`; (b) a row where `current_spending` is entirely absent from `item` (key not present, not just `null`) still renders `"- (<percentage>%)"` (percentage rendered via `Math.round`, no decimal) without throwing.

Steps:
1. In the `customColumns[col.id]` callback (`SpendingCard.tsx:235-245`), read `item.current_spending` alongside the existing `item[col.id]` read. Coerce to `null` when the value is missing or not a `number` (the row is typed `Record<string, string | number | boolean>` at the call site but `TabularResponse.rows` is `Record<string, unknown>[]` underneath, so a runtime `null` or absent key is possible despite the narrower local type) — guard with `typeof item.current_spending === 'number'`, and let a real `0` pass through unchanged.
2. Pass the resolved value as a new `spend` prop on the `<SpendingProgressBar>` element (`SpendingCard.tsx:239-243`), alongside the existing `percentage`, `dangerThreshold`, `warningThreshold` props. `SpendingProgressBar`'s own `Math.round` formatting (Task 1) renders the percentage; no percentage logic changes at this call site.

## Negative-constraints pass

- "Do NOT clamp the USD value — only percentage/bar clamp" → honored in Tasks 1–3: every step reads the unclamped spend value separately from the already-clamped `percentage`/`normalizedPercentage`, and Task 1(b)/Task 2(b) tests assert the real spend (`$120.00`) alongside a capped `100%`.
- "no misleading warning colour" when spend is null/undefined → no task touches `getStatusColor`/`getStatusColorWithOpacity` or their `percentage`-only inputs; Task 1(c) and Task 2(c) tests assert colour is unchanged when spend is null versus non-null at the same percentage, confirming colour continues to derive only from `percentage`.
- "no changes to SpendingTable.tsx, budget limit display, currency conversion, other spend-showing surfaces, CLI statusline, warning/danger colour thresholds, or reset-date display" → no task in this plan touches any of those files or values; only `SpendingProgressBar.tsx` and `SpendingCard.tsx` are edited, and neither `getStatusColor`/`getStatusColorWithOpacity` nor their threshold arguments are modified.
- "No backend/API changes" → no task touches `analyticsStore`, API clients, or types; `current_spending`/`total` are read from the existing `TabularResponse` shape only.
- "do not reimplement currency formatting" → all three tasks import `formatSpend` from `src/utils/currency.ts` rather than adding local formatting logic.
- "match the CLI's `Math.round`/no-decimal percentage exactly, but change nothing else about how percentage is computed, clamped, or used" → Task 1 step 2 and Task 2 step 3 change only the digits rendered inside the new combined label (`toFixed(1)` → `Math.round`); `normalizedPercentage`/`percentage` computation and clamping (`SpendingProgressBar.tsx:37`, `SpendingCard.tsx:103-110`), colour thresholds, and the bar's fill width are untouched in every task.
