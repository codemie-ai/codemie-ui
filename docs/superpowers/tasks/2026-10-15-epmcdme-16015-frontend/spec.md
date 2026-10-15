# Spec — EPMCDME-16015 (frontend): Platform Hard Limit must be greater than zero

Ticket: `ticket.md`. Research: `technical-analysis.md`. Size M.

## Goal

In the *Create Budget* / *Update Budget* popup (`UnifiedProjectBudgetModal`), an administrator can no
longer set the Platform Hard Limit to $0 by typing, clearing, dragging the allocation slider, or
resetting the distribution. Legacy projects whose saved Platform budget is 0 keep rendering. CLI,
Premium Models and every Soft Limit keep their current 0 floor.

## Behavior

**Platform minimum share.** A constant `PLATFORM_MIN_PCT = 0.01` (percent). Any Platform amount above
$0 is valid; 0.01% is simply the smallest positive share the save request can carry, because the
payload sends `round2(pct)` (UnifiedProjectBudgetModal.tsx, payload build) and any smaller share is
sent as 0. It does not depend on Total Budget.

**Slider.** The modal passes `PLATFORM_MIN_PCT` as `platformMinPct` to `UnifiedBudgetDragBar` instead
of `0` (UnifiedProjectBudgetModal.tsx:631). Handle 1 already clamps to it (UnifiedBudgetDragBar.tsx:285).
When `platformMinPct > 100 - premium_models` (reachable only from legacy data), the clamp must
resolve deterministically without throwing, keeping Platform ≤ `100 - premium_models`; Platform may
stay below the minimum in that case until the admin reduces Premium.

**Platform Hard Limit input.** `BudgetAmountInput` (BudgetAmountInput.tsx) gains an optional
strict-positive flag, default off. When on, the blur check (L75) commits only values `> 0`; when off,
behavior is unchanged (`>= 0`). `BudgetCategoryTable` turns it on for the Platform hard input only.
For Platform, a typed value of 0, a negative value, or a cleared field (`Number('') = 0`) is not
committed and the field reverts to the previous value — identical to how a negative entry behaves
today. Any typed value `> 0` is accepted. In `onHardInputChange`, the Platform branch clamps with
`PLATFORM_MIN_PCT` instead of `0` (L357), so an accepted positive value whose share rounds below 0.01%
is raised to 0.01%.

**Sub-dollar Platform display (revised at code review, CR-001).** Hard limit inputs display whole
dollars (`Math.round`), which would show a tiny positive Platform amount — e.g. 0.01% of $1,000 =
$0.10 — as "0". With `strictPositive` on, a value in the `0 < value < 1` range is displayed with cent
precision (e.g. "0.10") instead. Accepted edge (code-review.check): with a Total Budget under $50 the
0.01% minimum is below half a cent and displays as "0.00"; the saved share is still ≥ 0.01%. Other
inputs keep whole-dollar display.

**Reset to Default.** Unchanged — `DEFAULT_PCTS.platform = 30` is always above the minimum.

**Total Budget changes.** Shares are left alone. Platform stays above $0 whenever its share is above
0. No re-raising of the Platform share.

**Legacy Platform = 0.** `populateFromGroup` loads it untouched; no migration on load. It stays 0 until
the admin moves Platform via slider, typed value or Reset to Default. Saving it unchanged sends
`pct: 0`; the backend rejection is toasted by the store exactly as today. No client-side submit gate.

**Distribution-only mode** follows the same rules (same component, same submit path).

## Acceptance criteria

1. Typing 0, a negative value, or clearing the Platform Hard Limit input and blurring reverts the field to its previous value; no pct changes. Any typed value > 0 is accepted.
2. Dragging the Platform/CLI slider handle down stops at 0.01%; Platform's share stays > 0.
3. Reset to Default yields Platform 30%; changing Total Budget leaves shares unchanged and a positive Platform share stays positive.
4. Opening the project page and the Update Budget popup for a group with Platform `max_budget: 0` renders without errors and shows Platform at 0 with no automatic change.
5. Saving a legacy-0 group unchanged sends `platform.pct: 0` and surfaces the backend error as today.
6. CLI Hard, Premium Models Hard and all Soft Limits (including Platform Soft) accept 0 and the budget saves.
7. Submitted `platform.pct` after any Platform edit is ≥ 0.01.
8. Distribution-only mode enforces criteria 1, 2 and 7 identically.

## Non-goals

- No new validation message, inline error, or submit-button gating for the Platform minimum.
- No minimum on CLI Hard, Premium Models Hard, or any Soft Limit.
- No automatic migration of legacy Platform-0 groups, on load or on Total Budget change.
- No re-raising of the Platform share when Total Budget is lowered.
- No changes to the older single-category `ProjectBudgetModal.tsx`.
- No backend validation (separate repository).
- No change to the store, payload shape, or types.

## Testing

Extend coverage around the modal (only `UnifiedProjectBudgetModal.chargeback.test.tsx` exists) for
criteria 1-8, and unit-test `BudgetAmountInput`'s strict-positive flag (0, empty, negative rejected;
small positive accepted; flag off still accepts 0).
