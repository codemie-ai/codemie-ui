# EPMCDME-16057: Typed budget category values must not recalculate other categories

## Problem

In the Create/Update Budget popup (`UnifiedProjectBudgetModal`), typing a Hard Limit for Platform, CLI or
Premium Models rewrites a peer category so the distribution stays at 100%. It also clamps the typed value to
`100 - peer`. See `src/pages/settings/administration/components/UnifiedProjectBudgetModal.tsx:347-372`.
Users see values they never entered: typing CLI = 0 makes Premium jump. The proportional Soft Limit rescale
(`:296-329`) then also changes the Soft Limits of the typed category and the cascaded peer.

## Goal

A typed Hard Limit changes only its own category. When the categories no longer total 100%, the user sees
whether they are under or over and fixes it, by typing or dragging. Nothing is corrected silently.

## Behavior

1. **Typed Hard Limit.** Committing a Hard Limit for a category sets only that category's percentage
   (`typed $ / Total Budget * 100`, kept at the current 2-decimal precision). Neither of the other two
   categories changes. The typed value has no upper bound: neither `100 - peer` nor 100% of the Total
   Budget caps it.
2. **Platform minimum (EPMCDME-16015), the only correction kept.** Platform still rejects 0, negative or
   empty input by reverting the field (`BudgetAmountInput` `strictPositive`). A positive Platform value
   whose share is below `PLATFORM_MIN_PCT` (0.01%) is still raised to 0.01%. Legacy groups with Platform
   at 0 still load and save unchanged. This is the only exception to "no automatic correction".
3. **Soft Limits on typed edits.** A typed Hard edit does not rescale any Soft Limit, including the typed
   category's own. If the Soft Limit now exceeds the new Hard Limit, the existing per-column "Exceeds hard
   limit" error appears and submit stays blocked, as it does today.
4. **Soft Limits elsewhere (unchanged).** Proportional Soft rescaling still runs on drag, on Total Budget
   changes and on Reset to Default, exactly as today.
5. **Drag-and-drop (unchanged).** `UnifiedBudgetDragBar` keeps its current handle logic. Dragging
   recomputes the dragged pair, so after a drag the distribution totals 100% again, even if it started
   unbalanced. Drag is the intended way to rebalance.
6. **Distribution warning.** The existing out-of-balance condition stays: sum of round2 percentages more
   than 0.5 away from 100 (`:206-207`). Its single message under the Distribution bar (`:638-643`) is
   replaced by two variants:
   - under: `Category limits are $<diff> below the Total Budget (<sum>%). Adjust the values to total 100%.`
   - over: `Category limits are $<diff> above the Total Budget (<sum>%). Adjust the values to total 100%.`

   `<diff>` is `|sum - 100| / 100 * Total Budget`, formatted the way the modal already formats amounts.
   `<sum>` is the rounded current total percentage. The styling stays `text-xs text-failed-secondary`.
   Submit stays disabled while the warning shows. The backend rejects such a payload with a 400 anyway.

## Acceptance criteria

- **AC1.** Typing a Hard Limit for Platform, CLI or Premium leaves the other two categories' Hard Limits
  unchanged.
- **AC2.** Typing 0 for CLI or Premium leaves the other categories unchanged. Platform 0 or empty reverts
  (16015).
- **AC3.** Dragging either handle still redistributes. Starting from an unbalanced total, one drag brings
  the total back to 100% and clears the warning.
- **AC4.** An under-100% total shows the "below" message and an over-100% total shows the "above"
  message. Each shows the $ difference and the current %, and submit is disabled.
- **AC5.** A typed Hard edit changes no other value automatically: not the peer Hard Limits and not any
  Soft Limit. The only exception is the Platform minimum in AC6.
- **AC6.** The 16015 Platform behaviour is unchanged: no 0 or empty, sub-0.01% raised to 0.01%, legacy
  Platform-0 groups preserved.

## Non-goals

- No backend, API or store change. The server-side 100 ±0.5% validation stays as it is.
- No change to how a loaded group is normalized to 100% (`populateFromGroup`, `:229-235`).
- No change to Reset to Default, to Total Budget rescaling, or to drag-bar visuals and handle maths.
- No new validation message or gating for the Platform minimum (16015 rules it out).
- No per-field "over 100%" message and no per-category cap.
- No change to the precision of typed values (round2 of the percentage).

## Testing

Use Vitest + RTL in `components/__tests__/`. Rewrite the four `UnifiedProjectBudgetModal.platformMin` cases
that type a single Hard Limit and then save. Today they pass only because of the cascade, so each must type
compensating values to reach 100% before saving. Add tests for:

- AC1/AC2: peers unchanged after a typed edit, including 0.
- AC4: the under and over text and the disabled submit.
- AC5: Soft Limits unchanged after a typed Hard edit, with "Exceeds hard limit" shown when relevant.
- AC3: a drag from an unbalanced state restores 100% and clears the warning.
