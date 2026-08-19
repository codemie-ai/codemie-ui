# Spec — Premium model tip: visibility and hover fixes

**Date**: 2026-08-19 · **Branch**: EPMCDME-14126_premium-model-indication · **Size**: M (19/36)
**Research**: `technical-analysis.md` (same directory)

## Problem

The premium-model indication shipped with two user-visible defects.

1. **The tip does not appear for a new chat after it was once dismissed.** Three gates must all
   open for it to render, and a new chat closes two of them: `ChatPage.tsx:131` mounts
   `ChatHistory` only when the chat already has messages, and `ChatHistory.tsx:51-52` requires a
   truthy `currentChat.id` — an unsaved new chat has `id = ''` and no history. Dismissal itself is
   plain `useState` (`ChatHistory.tsx:53`) inside a subtree that `ChatPage.tsx:118,124`
   deliberately re-keys, so the state that *should* persist is thrown away while the tip that
   *should* re-arm never gets a chance to render.
2. **The premium hover text is displayed constantly.** `ChatPrompt.tsx:255-269` attaches
   `data-tooltip-content={PREMIUM_MODEL_TOOLTIP}` to the entire prompt container, and the shared
   instance in `src/utils/tooltip.ts` opens on the bubbling `mouseover` with `clickable: true`.
   Every pointer move over the editor, toolbar or buttons re-opens it. Two further anchors with the
   same id nest inside that one: the selector trigger (`ChatPromptLlmSelector.tsx:128-129`) and the
   `PremiumModelBadge` it renders (`:140`).

## Approach

**Own tip visibility in one place, above the remount boundary; own the hover text on one element.**

*Visibility.* Dismissal moves out of `ChatHistory` component state into session-scoped store state
that survives the `ChatPage` remount keys, recorded against the key
`` `${chatId || <pending-new-chat sentinel>}:${modelValue}` ``. Rules:

- `chatsStore.startNewChat` clears the pending-new-chat dismissal, so **every** new chat re-arms
  the tip — including a second new chat on the same model.
- When `createChat` promotes the unsaved chat to a real id, a dismissal already recorded under the
  pending key transfers to the real key, so a tip the user closed does not pop back after the
  first message.
- A model change inside a chat re-arms the tip (the original 2026-08-14 design intent).
- A null key — models not yet loaded, `currentChat` null between navigations — never mutates
  dismissal state, preserving CR-002 from the 2026-08-17 review.

The tip renders from a single slot that exists in **both** page states (`ChatHistory` and
`ChatPromptStarters`, `ChatPage.tsx:130-138`), positioned directly above the prompt panel as a
`shrink-0` row so it pushes content up rather than shrinking the prompt (the CR-001 shape from
`ChatHistory.tsx:79-86` is preserved, including the `useChatScroll` re-anchor).

The duplicated premium derivation (`ChatHistory.tsx:47-50` and `ChatPrompt.tsx:132-135`) collapses
into one shared hook so the amber ring and the tip cannot disagree.

*Hover.* The container-level anchor at `ChatPrompt.tsx:261-264` is removed; the amber ring
(`:268`) stays. Premium hover text keeps exactly one anchor inside the prompt subtree —
`PremiumModelBadge` — with the selector trigger suppressing its own premium tooltip while the badge
is shown. This follows the codebase's existing convention of anchoring hover text to the smallest
meaningful element (see the truncation-conditional `ModelOptionLabel`).

*Rejected:* changing `openEvents` / `clickable` in `src/utils/tooltip.ts` — it serves ~40
components and the local anchors are the actual defect. *Rejected:* persisting dismissal in
`localStorage` per `(userId, chatId)` — it grows unbounded, and the reported expectation is that a
new chat shows the tip again, which needs no persistence.

*Before fixing:* the first symptom has more than one plausible mechanism. A failing test that
reproduces "dismiss → new chat → tip absent" is required before the fix lands.

## Acceptance criteria

- Premium model selected on a chat with no messages: tip is visible above the prompt.
- Dismissing the tip keeps it hidden for that chat and model, including across the first-message
  promotion from unsaved to persisted chat.
- Starting a new chat after dismissing shows the tip again — also on a second consecutive new chat
  with the same model.
- Switching to a different premium model in the same chat re-arms the tip.
- Switching to a non-premium model hides the tip and removes the ring.
- Leaving and returning to a chat in the same session does not resurrect a dismissed tip; a
  transient null chat/model state neither re-arms nor force-hides it.
- Hovering the editor, toolbar, buttons or empty prompt area shows no premium tooltip; hovering the
  premium badge shows it and it closes on mouse-out.
- At most one element in the prompt subtree carries `PREMIUM_MODEL_TOOLTIP` at any time.
- Tip appearing or disappearing keeps the message list anchored at the bottom.
- Unit tests cover the visibility state machine (new chat, promotion, model switch, transient null)
  and the absence of the container tooltip attribute. `npm run typecheck`, `npm run lint`,
  `npm run test:unit` pass.

## Non-goals

- No change to `src/utils/tooltip.ts` or the global react-tooltip options.
- No `localStorage` / cross-session persistence of the dismissal.
- No change to the tip's visuals, copy, or the `/help/models` link.
- No change to the premium data model, `GET v1/llm_models`, or `is_premium` mapping.
- No premium indication added to surfaces outside the chat prompt area (models catalog,
  assistants, data sources). *(Relaxed by the 2026-08-19 amendment below for the assistant form's
  existing badge — its layout is corrected, no new indication is introduced.)*
- No rework of `useChatScroll` beyond keeping the existing re-anchor behaviour intact.
- No refactor of `ChatPage` layout, resizable panels, or the remount keys themselves.
- No touching the unrelated in-flight marketplace / Playwright work on this branch.

## Open risks

- The root cause of symptom 1 is hypothesised, not proven; the reproducing test may reveal a
  different mechanism and shift the fix within the same design.
- Narrowing anchors is a local mitigation — the globally bubbling `mouseover` + `clickable`
  configuration remains for every other tooltip in the app.
- Session-scoped dismissal state added to the chat store must be reset on user switch/logout.

---

## Amendment — 2026-08-19: premium badge layout in the model selectors

Two further user-reported defects in the same feature, folded into this run at the user's direction
after the first five tasks landed. Both are presentational: the badge exists and is correct, its
placement is not.

### Problem

3. **Model names are unreadable in the assistant form's "Extra configuration → LLM model"
   selector** (`LLMSelector.tsx`). The trigger badge is an absolutely-positioned overlay —
   `absolute inset-x-0 bottom-0 flex h-8 items-center justify-end pr-9` (`:158-164`) — painted on
   top of the PrimeReact value label. It reserves no layout space, so a long value such as
   *Bedrock Claude Opus 4.5* runs underneath the badge and is cut mid-word. In the dropdown rows
   (`renderOption`, `:129-137`) the flex wrapper is `min-w-0` but never full-width, so the name
   truncates to `Bedrock Claude O…` while horizontal space to the right of the badge stays empty —
   non-premium rows in the same list render their full names.
4. **The premium badge shifts horizontally between rows in the chat model selector**
   (`ChatPromptLlmSelector.tsx:181-187`). The row is
   `w-full flex items-center justify-between gap-2` (`SearchableCombobox.tsx:210`) over the children
   `label`, optional badge, optional check. On an unselected premium row `justify-between` pins the
   badge to the right edge; on the selected row the check mounts and pushes the badge left by the
   check width plus the gap. Selecting a model therefore makes badges jump — the "dancing" in the
   report. The same defect applies to the `OPTION_ID_RECOMMENDED` row (`:167-177`).

### Approach

**Give the badge and the check each a slot of their own, so neither depends on the other's presence
or on the name's length.**

*Chat selector rows.* Row layout becomes **name left, badge immediately right of the name, check far
right in an always-reserved slot**. The name and badge form one left group with the name taking the
free width and truncating; the check slot is rendered on every row and made invisible (not
unmounted) when the row is unselected, so the badge's position is identical selected and unselected.
Applies to the model rows, the recommended row, and the default row alike.

*Assistant form selector.* The trigger badge stops being an overlay: it participates in layout, with
the value label given the remaining width and truncating before it reaches the badge, so the name is
never painted under it. In the dropdown rows the wrapper becomes full-width with the label taking
the free space, so a name only truncates when it genuinely runs into the badge.

*Rejected:* moving the badge into the PrimeReact `valueTemplate` wholesale — larger blast radius
across every `MultiSelect` consumer than the defect warrants; the overlay is replaced in place.
*Rejected:* right-aligning the badge in a fixed column in the chat rows — the user chose
badge-follows-name.

### Acceptance criteria

- In the assistant form, selecting a long premium model shows the full name (or an ellipsis at the
  badge boundary) with no text painted underneath the badge.
- Dropdown rows in the assistant form use the available width: a name truncates only when it would
  otherwise collide with the badge; non-premium and premium rows truncate at the same boundary.
- In the chat model selector, a premium badge occupies the same horizontal position whether or not
  its row is selected — selecting a row does not move any badge.
- The check mark stays at the far right of the row and its slot is reserved on unselected rows.
- The default and recommended rows follow the same slot layout.
- No change to badge visuals, copy, or the single-anchor tooltip rule established above.
- Unit tests assert the reserved check slot and the unchanged badge position across selection state,
  and the assistant-form trigger no longer renders the badge as an absolute overlay.
  `npm run typecheck`, `npm run lint`, `npm run test:unit` pass.

### Follow-up — compact badge in dropdown rows

Tasks 6-7 made the name truncate *at* the badge boundary as intended, but the outcome is still
wrong: the full badge costs ~145px of a ~550px row, so `Bedrock Claude Opus 4.5` and
`Bedrock Claude Opus 4.1` both collapse to the identical string `Bedrock Claude O…` — two
different models render indistinguishably. Width, not alignment, is the remaining defect.

**Dropdown option rows carry a compact badge; the hover moves to the row.**

- `PremiumModelBadge` gains a compact variant rendering the amber dot alone, without the
  "Premium" text, with an accessible name so the indication is not colour-only.
- Both model dropdowns (`ChatPromptLlmSelector` rows, `LLMSelector` rows) use the compact variant.
  The full badge stays everywhere else — both triggers, and the chat prompt.
- The premium hover text moves from the dot to the **whole option row**, so hovering anywhere on a
  premium model explains it. The compact dot inside a row anchors nothing, because a same-id anchor
  nested inside another is precisely the flicker this run removed in Task 5.
- `ModelOptionLabel`'s truncation tooltip and the premium text must not fight over one row: the row
  composes a single content string — the full label when truncated, the premium sentence when
  premium, both when both apply — and `ModelOptionLabel` stops anchoring inside rows that anchor.

**Amends the Task 5 criterion** "at most one element in the prompt subtree carries
`PREMIUM_MODEL_TOOLTIP`": the invariant is *no nested premium anchors, and never on the prompt
container*. With the dropdown open, each premium row anchors its own row-level tooltip — sibling
anchors, not nested ones — which is correct.

**Acceptance criteria (follow-up)**

- Premium model names in both dropdowns are readable and mutually distinguishable: two models
  sharing a long prefix do not truncate to the same string at the default panel width.
- Dropdown rows show the amber dot only; triggers and the chat prompt keep the full badge.
- Hovering anywhere on a premium row shows the premium text; hovering a non-premium row does not.
- A truncated premium row shows one tooltip containing both the full name and the premium text —
  never two overlapping tooltips, never a flicker as the pointer crosses the dot.
- The compact dot exposes an accessible name; the premium state is not conveyed by colour alone.
- `npm run typecheck`, `npm run lint`, `npm run test:unit` pass.

### Follow-up 2 — adaptive badge and the scroll-stuck tooltip

Two defects observed after the compact dot shipped.

5. **The dot is too little where there is room.** In the wider assistant "General → LLM Model"
   panel a premium row now shows the amber dot with ~150px of empty space beside it — the word
   "PREMIUM" was traded away for width that panel did not need. The compact form only earns its
   keep in the narrow panel where `Bedrock Claude Opus 4.5` and `…4.6` would otherwise both
   truncate to `Bedrock Claude O…`.

   **The badge becomes adaptive**: full `● PREMIUM` when the row is wide enough for it alongside
   the untruncated name, collapsing to the dot alone only when it is not. Implemented with a native
   CSS container query (`container-type: inline-size` on the row, a plain `@container` rule in a
   stylesheet) — Tailwind 3.4.17 here has no container-query plugin, and the native rule needs no
   new dependency and no JS measurement.

6. **The premium tooltip does not close when the dropdown list scrolls.** `src/utils/tooltip.ts`
   passes `globalCloseEvents: { escape: true }`. The option type is
   `{ escape?, scroll?, resize?, clickOutsideAnchor? }`, so naming only `escape` leaves scroll- and
   resize-close **off**. A tooltip opened over a listbox row therefore survives the list scrolling
   underneath it, and when its anchor row unmounts (scrolled out, or filtered by the search box)
   the tooltip collapses to the viewport's top-left corner. Row-level anchors made this visible;
   the defect predates them and affects every tooltip in the app.

   **Fix at the source**: add `scroll: true, resize: true` to `globalCloseEvents`. This **amends
   the run's standing non-goal** "no change to `src/utils/tooltip.ts`" — accepted deliberately by
   the user, because closing on scroll is the standard behaviour and the local workaround would
   leave the same bug everywhere else.

**Acceptance criteria (follow-up 2)**

- A row wide enough shows `● PREMIUM`; a row too narrow for badge text plus the untruncated name
  shows the dot alone. No JS measurement, no new dependency.
- Both dropdowns pick the right form for their own panel width, in the same session.
- Scrolling a dropdown list with a premium tooltip open closes that tooltip.
- Filtering the list so the hovered row unmounts leaves no tooltip stranded at the viewport corner.
- Resizing the window with a tooltip open closes it.
- The global change is exercised by a test asserting `globalCloseEvents` carries `scroll` and
  `resize`, so it cannot silently regress for the other ~40 consumers.

### Follow-up 3 — the assistant-form trigger (resolves CR-003)

Recorded after code review flagged that this surface's chrome was authorised only in `plan.md`. It
**was** deliberate — user-directed during visual iteration on 2026-08-19 — so the criteria belong
here rather than the change being reverted. The earlier non-goal "no premium indication added to
surfaces outside the chat prompt area" is relaxed for this one field: the assistant form already
carried a premium badge, and what changed is how it is presented, not whether premium appears there.

**Requirement.** When the selected model is premium, the assistant-form LLM field shows, beneath the
control: the text `Premium model`, an info affordance whose hover carries `PREMIUM_MODEL_TOOLTIP`,
and a `View models and rates` link to `HELP_MODELS_ROUTE`. The inline badge is not rendered on this
trigger, and the control itself carries no premium ring — an amber outline on a form control reads as
a validation error.

**Acceptance criteria**

- A premium selection renders the note, the info affordance and the catalog link; a non-premium
  selection renders none of them.
- The model name in the field is never truncated by premium chrome.
- The link is a real, tab-reachable anchor targeting `HELP_MODELS_ROUTE`, not hover-only content.
- Exactly one premium tooltip anchor exists on this surface (the info affordance), never nested.
- A caller-supplied `hint` still renders.
- Navigating via the link from a dirty form raises the existing unsaved-changes confirmation rather
  than discarding edits silently.

### Non-goals (amendment)

- No change to `SearchableCombobox`'s own row container beyond what the slot layout requires.
- No change to `PremiumModelBadge` beyond adding the compact and adaptive variants described above.
- No change to `src/utils/tooltip.ts` beyond the `globalCloseEvents` scroll/resize addition — the
  `openEvents`, `clickable` and styling options stay exactly as they are.
- No change to which models are premium or how that is resolved.
- No restyling of the selectors beyond the badge/check/name layout.
