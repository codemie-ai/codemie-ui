# Premium Model Tip — Visibility & Hover Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the premium-model tip re-arm for every new chat while staying dismissed where it should, and leave exactly one premium hover anchor in the prompt subtree.

**Architecture:** Dismissal moves from `ChatHistory` component state into a session-scoped Valtio store keyed by `` `${chatId || pending-sentinel}:${modelValue}` ``, so it survives the `ChatPage` remount keys (`ChatPage.tsx:118,124`). `chatsStore.startNewChat` clears pending dismissals; `createChat` promotes them to the real chat id. A shared hook replaces the duplicated premium derivation in `ChatHistory.tsx:47-50` and `ChatPrompt.tsx:132-135`, and the tip renders from one slot inside the `chat-history` Panel — present in both the `ChatHistory` and `ChatPromptStarters` page states — directly above the prompt panel.

**Tech Stack:** React 18 + TypeScript, Valtio 2.1.5 (`proxy` + `useSnapshot`), Tailwind, react-tooltip 5.29.1 (global instance, untouched), Vitest 1.6.1 + RTL.

**Spec:** `docs/superpowers/tasks/2026-08-19-premium-model-tip-visibility-fix/spec.md`

## Global Constraints

- Do **not** modify `src/utils/tooltip.ts` or the global react-tooltip options (`openEvents`, `clickable`, `globalCloseEvents`).
- Dismissal is **session-scoped only** — no `localStorage`, no `chatStorageUtils`, no cross-session persistence. (Logout does a full document navigation, `src/store/auth.ts:86,94`, which wipes module state — no explicit reset needed.)
- No change to the tip's visuals, copy, or the `/help/models` link in `ChatPremiumModelTip.tsx`.
- No change to `GET v1/llm_models`, the `is_premium` mapping (`appInfo.ts:266`), or the premium data model.
- No premium indication added outside the chat prompt area.
- Keep `useChatScroll`'s existing re-anchor behaviour; do not rework the hook.
- Do not change `ChatPage` layout, resizable panels, or the remount keys themselves.
- Do not touch the in-flight marketplace / Playwright work on this branch.
- Unit tests: `*.test.tsx?` under co-located `__tests__/`; the unit project mocks `useSnapshot` and `@/utils/api` globally (`setupTests.unit.ts`) — follow `src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts` for hook-plus-store test shape.
- Commit per task using the repository's existing convention (`.ai-run/guides/standards/git-workflow.md`).
- **Task 4 carries the spec-mandated reproduction of symptom 1.** Its failing test must be observed red before the fix. If it passes against the pre-fix code, stop and re-diagnose — the root cause is elsewhere.

---

### Task 1: Session-scoped dismissal store

**Files:**
- Create: `src/store/premiumModelTip.ts`
- Modify: `src/store/index.ts` (add the export alongside the existing store exports)
- Test: `src/store/__tests__/premiumModelTip.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:

```ts
export const PENDING_CHAT_KEY = 'pending-new-chat'

interface PremiumModelTipStoreType {
  dismissedKeys: Record<string, boolean>
  buildKey(chatId: string | null | undefined, modelValue: string | null | undefined): string | null
  isDismissed(key: string | null): boolean
  dismiss(key: string | null): void
  clearPendingDismissals(): void
  promotePendingDismissals(chatId: string): void
}

export const premiumModelTipStore = proxy<PremiumModelTipStoreType>({ /* ... */ })
```

Semantics: `buildKey` returns `null` when `modelValue` is falsy, and substitutes `PENDING_CHAT_KEY` for a falsy `chatId`. `dismiss(null)` and `isDismissed(null)` are no-ops returning `void` / `false` — a null key never mutates state (CR-002). `promotePendingDismissals(chatId)` re-keys every `` `${PENDING_CHAT_KEY}:${model}` `` entry to `` `${chatId}:${model}` `` and deletes the pending ones.

**Test-first: yes** — `premiumModelTip.test.ts` fails with "Cannot find module '@/store/premiumModelTip'": `buildKey` null/pending cases; `dismiss` then `isDismissed` true; `dismiss(null)` leaves `dismissedKeys` empty; `clearPendingDismissals` removes only pending entries; `promotePendingDismissals('c1')` moves `pending-new-chat:gpt-5` to `c1:gpt-5`.

- [ ] **Step 1:** Write the failing test file covering the six behaviours above.
- [ ] **Step 2:** Run `npm test -- src/store/__tests__/premiumModelTip.test.ts` — expect FAIL (module not found).
- [ ] **Step 3:** Create the store with the interface above (Apache license header, `proxy` + methods on the proxy, matching `src/store/chats.ts` style) and export it from `src/store/index.ts`.
- [ ] **Step 4:** Re-run the test — expect PASS.

---

### Task 2: Shared premium-tip hook

**Files:**
- Create: `src/pages/chat/hooks/usePremiumModelTip.ts`
- Test: `src/pages/chat/hooks/__tests__/usePremiumModelTip.test.ts`

**Interfaces:**
- Consumes: `premiumModelTipStore`, `PENDING_CHAT_KEY` (Task 1).
- Produces:

```ts
export const usePremiumModelTip = (): {
  effectiveModel: ModelOption | null // ModelOption as imported by src/store/appInfo.ts
  isPremiumActive: boolean
  tipKey: string | null
  tipIsVisible: boolean
  dismissTip: () => void
}
```

The hook subsumes the derivation currently duplicated at `ChatHistory.tsx:47-50` and `ChatPrompt.tsx:132-135`, reading `chatsStore.currentChat` and `appInfoStore.llmModels` via `useSnapshot`. `tipKey = premiumModelTipStore.buildKey(currentChat?.id, effectiveModel?.value)`; `tipIsVisible = isPremiumActive && tipKey !== null && !isDismissed(tipKey)`; `dismissTip` calls `premiumModelTipStore.dismiss(tipKey)`.

**Test-first: yes** — `usePremiumModelTip.test.ts` fails with "Cannot find module": premium model on an unsaved chat (`id: ''`) yields `tipIsVisible: true` with a pending `tipKey`; `dismissTip` flips it to false; a non-premium model yields `isPremiumActive: false` and `tipIsVisible: false`; `currentChat: null` or empty `llmModels` yields `tipKey: null` and leaves `dismissedKeys` untouched.

- [ ] **Step 1:** Write the failing test with `renderHook`, seeding `chatsStore`/`appInfoStore` per the existing hook-test pattern.
- [ ] **Step 2:** Run `npm test -- src/pages/chat/hooks/__tests__/usePremiumModelTip.test.ts` — expect FAIL.
- [ ] **Step 3:** Implement the hook.
- [ ] **Step 4:** Re-run — expect PASS.

---

### Task 3: Re-arm and promotion in the chat store

**Files:**
- Modify: `src/store/chats.ts:295-315` (`startNewChat`) and `src/store/chats.ts:317-348` (`createChat`)
- Test: `src/store/__tests__/chats.premiumTipDismissal.test.ts`

**Interfaces:**
- Consumes: `premiumModelTipStore.clearPendingDismissals`, `premiumModelTipStore.promotePendingDismissals` (Task 1).
- Produces: no new exports.

In `startNewChat`, call `premiumModelTipStore.clearPendingDismissals()` alongside the existing `isNewChat = true` assignment, so a second consecutive new chat on the same model re-arms. In `createChat`, call `premiumModelTipStore.promotePendingDismissals(newChat.id)` after `getChat(newChat.id)` resolves and before `router.replace(...)` (`chats.ts:340-345`), so a tip dismissed on the unsaved chat does not pop back on first-message promotion. Import direction is one-way (`chats.ts` → `premiumModelTip.ts`); do not import `chatsStore` from the new store.

**Test-first: yes** — `chats.premiumTipDismissal.test.ts` fails because neither hook-in is wired: with `pending-new-chat:gpt-5` dismissed, `startNewChat()` leaves `dismissedKeys` empty; with the same seed, `createChat()` leaves `dismissedKeys` containing only `c1:gpt-5`; a dismissal recorded for another real chat (`c9:gpt-5`) survives both calls.

- [ ] **Step 1:** Write the failing test, mocking `api` responses in the style of `src/store/__tests__/chats.getChats.test.ts`.
- [ ] **Step 2:** Run `npm test -- src/store/__tests__/chats.premiumTipDismissal.test.ts` — expect FAIL.
- [ ] **Step 3:** Add the two calls described above.
- [ ] **Step 4:** Re-run — expect PASS.

---

### Task 4: Single tip slot present in both page states

**Files:**
- Create: `src/pages/chat/components/ChatPrompt/ChatPremiumModelTipSlot.tsx`
- Modify: `src/pages/chat/ChatPage.tsx:130-138` — wrap the `hasHistory ? <ChatHistory /> : <ChatPromptStarters />` branch in a `h-full flex flex-col` container whose first child is a `flex-1 min-h-0` wrapper around that branch and whose second child is `<ChatPremiumModelTipSlot />`. Panels, `Group`, remount keys and `minSize` values stay exactly as they are.
- Modify: `src/pages/chat/components/ChatHistory/ChatHistory.tsx:45-62,79-86` — delete `dismissedPremiumTipKey` state, the re-arm `useEffect`, the local premium derivation and the rendered tip block; keep `useChatScroll({ scrollContainerRef, layoutDeps: [tipIsVisible] })` fed by `usePremiumModelTip()` so the CR-001 re-anchor survives.
- Test: `src/pages/chat/components/ChatPrompt/__tests__/ChatPremiumModelTipSlot.test.tsx`

**Interfaces:**
- Consumes: `usePremiumModelTip` (Task 2), `ChatPremiumModelTip` (`modelLabel`, `onDismiss` — unchanged).
- Produces: `const ChatPremiumModelTipSlot: FC` — default export; renders `null` when `tipIsVisible` is false, otherwise the existing `shrink-0 px-6 py-2` wrapper from `ChatHistory.tsx:80` around `<ChatPremiumModelTip modelLabel={effectiveModel.label} onDismiss={dismissTip} />`.

**Test-first: yes** — this is the spec's reproduction test and must be seen red first: with a premium model dismissed on chat `c1`, then `chatsStore.startNewChat()` simulated (id `''`, empty history, same model), the slot renders "Premium model active"; today it renders nothing. Also assert: renders on a premium chat with no messages; hidden after `onDismiss` click; still hidden after re-rendering the same `(chatId, model)` pair; visible again after switching to a different premium model; hidden for a non-premium model; a transient `currentChat: null` render neither shows nor permanently hides it.

- [ ] **Step 1:** Write the failing slot test covering the reproduction plus the cases above.
- [ ] **Step 2:** Run `npm test -- src/pages/chat/components/ChatPrompt/__tests__/ChatPremiumModelTipSlot.test.tsx` — expect FAIL on the reproduction assertion.
- [ ] **Step 3:** Create the slot component, mount it in `ChatPage.tsx`, and strip the tip logic out of `ChatHistory.tsx` as described.
- [ ] **Step 4:** Re-run the slot test and `npm test -- src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx` — expect PASS.

---

### Task 5: One premium hover anchor in the prompt subtree

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx:261-264` — remove the conditional `data-tooltip-id` / `data-tooltip-content` spread from the prompt container. The `ring-1 ring-aborted-primary/60` at `:268` stays. Replace the local derivation at `:131-135` with `const { isPremiumActive } = usePremiumModelTip()`.
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx:115-117,128-129` — when `showPremiumBadge` is true the trigger button emits no tooltip attributes at all (the badge it renders at `:140` owns the premium text); when false it keeps `data-tooltip-id="react-tooltip"` with `'Select LLM model for this conversation'`. Follow the `ModelOptionLabel` precedent of omitting the anchor attributes rather than passing an empty string.
- Test: create `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.premiumTooltip.test.tsx`; extend `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`
- Do not touch `src/components/PremiumModelBadge/PremiumModelBadge.tsx`.

**Interfaces:**
- Consumes: `usePremiumModelTip` (Task 2), `PREMIUM_MODEL_TOOLTIP` from `PremiumModelBadge` (unchanged export).
- Produces: no new exports.

**Test-first: yes** — with a premium model selected, `container.querySelectorAll('[data-tooltip-content="Premium model — higher usage rates apply"]')` currently returns 3 nodes; the tests assert the prompt container carries no `data-tooltip-content`, the selector trigger carries none while the badge is shown, exactly one element in the rendered prompt subtree carries `PREMIUM_MODEL_TOOLTIP`, and the non-premium trigger still carries `'Select LLM model for this conversation'`.

- [ ] **Step 1:** Write the failing assertions in both test files.
- [ ] **Step 2:** Run `npm test -- src/pages/chat/components/ChatPrompt/__tests__` — expect FAIL (3 anchors found, expected 1).
- [ ] **Step 3:** Apply the two edits above.
- [ ] **Step 4:** Re-run — expect PASS.

---

## Amendment — 2026-08-19: premium badge layout (Tasks 6-7)

Added at the user's direction after Tasks 1-5 landed; see the matching amendment section in
`spec.md`. Both tasks are presentational — no store, hook, or data change.

### Task 6: Stable badge and check slots in the chat model selector

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx:158-188` — restructure all three `renderOption` branches (default `OPTION_ID_DEFAULT`, recommended `OPTION_ID_RECOMMENDED`, model) to the same slot layout: a left group holding the name (taking free width, truncating) with the badge immediately after it, and a check slot at the far right that is rendered on **every** row and hidden with `invisible` (not unmounted) when `state.selected` is false. The left group needs `min-w-0` so the name truncates instead of pushing the badge out.
- Do not modify `src/components/SearchableCombobox/SearchableCombobox.tsx` — the existing row container `w-full flex items-center justify-between gap-2` (`:210`) is what makes the reserved check slot hold the badge in place.
- Do not modify `src/components/PremiumModelBadge/PremiumModelBadge.tsx`.
- Test: extend `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`

**Interfaces:**
- Consumes: `ComboboxItem`, `state.selected` (unchanged `SearchableCombobox` contract), `PremiumModelBadge`, `CheckSvg`.
- Produces: no new exports. The premium tooltip anchor rule from Task 5 must still hold — the badge stays the only premium anchor, and `ModelOptionLabel` keeps its truncation-conditional tooltip.

**Test-first: yes** — render the open selector with a premium model selected and a second premium model unselected, then assert that both premium rows place `PremiumModelBadge` at the same offset within their row: today the selected row mounts `CheckSvg` as a third `justify-between` child and the unselected row does not, so the selected row's badge sits one check-width plus gap further left. Concretely, assert every row contains a check-slot element (selected or not) and that the unselected row's check slot carries `invisible` while the selected row's does not; assert the badge is a sibling immediately following the name within the left group in both rows. Also assert the recommended and default rows expose the same reserved check slot.

- [ ] **Step 1:** Write the failing assertions in `ChatPromptLlmSelector.test.tsx`.
- [ ] **Step 2:** Run `npm test -- src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` — expect FAIL (unselected rows have no check slot).
- [ ] **Step 3:** Apply the slot restructure to the three `renderOption` branches.
- [ ] **Step 4:** Re-run that file plus `npm test -- src/pages/chat/components/ChatPrompt/__tests__` — expect PASS, Task 5's single-anchor assertions still green.

### Task 7: Readable model names in the assistant form LLM selector

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:158-164` — replace the absolutely-positioned trigger badge overlay so the badge participates in layout and the value label truncates before reaching it, instead of being painted underneath. Inspect `src/components/form/MultiSelect` first to decide between passing a value template and constraining the label box; keep the change inside `LLMSelector` if the shared `MultiSelect` would otherwise change behaviour for its other consumers.
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:129-137` — make the `renderOption` wrapper full-width (`w-full`) with the label taking the free space (`flex-1 min-w-0 truncate`) and the badge `shrink-0`, so a name truncates only at the badge boundary.
- Test: create `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`

**Interfaces:**
- Consumes: `PremiumModelBadge`, `appInfoStore.llmModels` (`isPremium`), the existing `MultiSelect` props.
- Produces: no new exports. `invalidModel` handling, `defaultLlmModel` resolution and the reset effects are untouched.

**Test-first: yes** — with a premium model selected whose label is long, assert the trigger badge is not rendered inside an element carrying the `absolute` overlay classes (`absolute inset-x-0 bottom-0`) — it is today — and that the value label element carries the truncation classes rather than being overlapped; and assert a premium option row's wrapper is `w-full` with the label span `flex-1 min-w-0`, which today it is not.

- [ ] **Step 1:** Write the failing test file.
- [ ] **Step 2:** Run `npm test -- src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx` — expect FAIL.
- [ ] **Step 3:** Apply both edits.
- [ ] **Step 4:** Re-run that file plus `npm test -- src/pages/assistants` — expect PASS.

---

## Follow-up — 2026-08-19: compact badge in dropdown rows (Task 8)

User-directed after Tasks 6-7 shipped: the alignment is right but the full badge still starves the
name, so two long premium model names truncate to the same string. See the "Follow-up — compact
badge in dropdown rows" section in `spec.md`.

### Task 8: Compact premium dot in dropdown rows with row-level hover

**Files:**
- Modify: `src/components/PremiumModelBadge/PremiumModelBadge.tsx` — add a compact variant (prop, e.g. `compact`, default false) rendering only the amber dot, no "Premium" text, `shrink-0`, carrying an accessible name (`aria-label`/visually-hidden text) so premium is not colour-only. Add an `anchorTooltip` escape (default true) so a badge inside a row that already anchors emits no `data-tooltip-id`/`data-tooltip-content` — omit the attributes entirely rather than passing empty strings, matching the `ModelOptionLabel` precedent. The default (full, anchoring) rendering must stay byte-identical for existing consumers: chat prompt, both triggers, models catalog.
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — use the compact, non-anchoring badge in all three `renderOption` branches; keep the full anchoring badge in `renderTrigger` (`:146`). Move the premium hover to the row: compose one content string per row and put it on the row's own element via `data-tooltip-id="react-tooltip"` / `data-tooltip-content`. `ModelOptionLabel` must not anchor when its row anchors — pass the truncation state up (or accept an `anchor={false}` prop) so the row owns the single content string: full label when truncated, `PREMIUM_MODEL_TOOLTIP` when premium, both joined when both. Preserve the Task 6 slot layout and the Task 5 rule that the trigger emits no premium anchor while its badge is shown.
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx:129-137` — use the compact, non-anchoring badge in `renderOption`; keep the full badge in the `selectedItemTemplate` trigger. Anchor the premium text on the option row wrapper.
- Test: extend `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`, `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`, `src/components/PremiumModelBadge/__tests__/PremiumModelBadge.test.tsx`.

**Interfaces:**
- Consumes: `StatusBadge` (`StatusEnum.Warning`) for the full variant; `PREMIUM_MODEL_TOOLTIP` (unchanged export).
- Produces: `PremiumModelBadge` props `{ compact?: boolean; anchorTooltip?: boolean }`. No store or data change.

**Test-first: yes** — assert that a premium dropdown row renders no "Premium" text (only the dot with its accessible name) while the trigger still renders the full badge; that the row element itself carries `data-tooltip-content` including `PREMIUM_MODEL_TOOLTIP`; that no element **nested inside** an anchoring row carries `data-tooltip-id` (today the badge does, and `ModelOptionLabel` does when truncated — two nested same-id anchors); that a truncated premium row's single content string contains both the full label and the premium sentence; and that a non-premium row carries no premium content. Today all of these fail: rows render the full badge text and anchor nothing at row level.

- [ ] **Step 1:** Write the failing assertions across the three test files.
- [ ] **Step 2:** Run `npm test -- src/components/PremiumModelBadge src/pages/chat/components/ChatPrompt/__tests__ src/pages/assistants/components/AssistantForm/components/__tests__` — expect FAIL.
- [ ] **Step 3:** Add the badge variants, then switch both dropdowns to compact non-anchoring badges with row-level tooltip composition.
- [ ] **Step 4:** Re-run the three paths — expect PASS, with Task 5's container/trigger assertions and Task 6's slot assertions still green.

---

## Follow-up 2 — 2026-08-19: adaptive badge and scroll-close (Tasks 9-10)

User-directed after Task 8 shipped. See "Follow-up 2" in `spec.md`. Task 10 amends the run's
standing non-goal on `src/utils/tooltip.ts`, with the user's explicit approval.

### Task 9: Adaptive premium badge — text when it fits, dot when tight

**Files:**
- Modify: `src/components/PremiumModelBadge/PremiumModelBadge.tsx` — replace the binary `compact`
  prop usage in rows with an adaptive variant. Keep `compact` for any caller that wants the dot
  unconditionally; add the adaptive rendering used by dropdown rows: render both the dot and the
  "Premium" text, and let a container query hide the text when the row is too narrow. The dot must
  keep its accessible name in both states, and the accessible name must not change with width — a
  screen reader reads the same thing either way.
- Modify: the stylesheet carrying app-level CSS (locate it — likely `src/index.css` or the file
  holding the Tailwind directives) — add `container-type: inline-size` for the row container class
  and a native `@container (min-width: …)` rule revealing the badge text. Tailwind 3.4.17 has no
  container-query plugin here; do **not** add one, and do not measure in JS.
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` and
  `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — rows opt into the
  adaptive variant and establish the container. Triggers keep the full badge unchanged.
- Test: extend `src/components/PremiumModelBadge/__tests__/PremiumModelBadge.test.tsx`.

**Interfaces:**
- Produces: `PremiumModelBadge` props gain the adaptive mode alongside `compact` / `anchorTooltip`.
  Task 8's non-anchoring behaviour inside rows is unchanged.

**Test-first: yes** — jsdom does not evaluate container queries, so assert the *contract* rather
than the rendered width: the adaptive badge renders both the dot and the "Premium" text node in the
DOM (today the row renders the dot only, so this fails), the text node carries the class the
`@container` rule targets, the row container carries the class that establishes the query
container, and the accessible name is identical in both variants. Add a stylesheet assertion that
the `@container` rule exists for that class.

- [ ] **Step 1:** Write the failing assertions.
- [ ] **Step 2:** Run `npm test -- src/components/PremiumModelBadge src/pages/chat/components/ChatPrompt/__tests__ src/pages/assistants/components/AssistantForm/components/__tests__` — expect FAIL.
- [ ] **Step 3:** Add the adaptive variant, the CSS, and the row opt-ins.
- [ ] **Step 4:** Re-run — expect PASS, Tasks 5, 6 and 8 assertions still green.

### Task 10: Close tooltips on scroll and resize

**Files:**
- Modify: `src/utils/tooltip.ts` — `globalCloseEvents: { escape: true }` becomes
  `{ escape: true, scroll: true, resize: true }`. Change nothing else in that file: `openEvents`,
  `clickable`, `arrowColor`, `className` and the container bootstrap stay exactly as they are.
- Test: `src/utils/__tests__/tooltip.test.ts` (create if absent).

**Interfaces:**
- Consumes: `react-tooltip` 5.29.1 `GlobalCloseEvents = { escape?, scroll?, resize?, clickOutsideAnchor? }`.
- Produces: no new exports. Affects every `data-tooltip-id="react-tooltip"` consumer app-wide.

**Test-first: yes** — assert the props handed to the rendered `Tooltip` carry
`globalCloseEvents.scroll === true` and `.resize === true` while `escape` stays true and
`clickable` stays true; today `scroll` and `resize` are absent, so it fails. This test is the
regression guard for the other ~40 consumers.

- [ ] **Step 1:** Write the failing test.
- [ ] **Step 2:** Run `npm test -- src/utils` — expect FAIL.
- [ ] **Step 3:** Add the two options.
- [ ] **Step 4:** Re-run, then `npm test -- src/pages/chat/components/ChatPrompt/__tests__` — expect PASS.

---

## Follow-up 3 — 2026-08-19: chat dropdown width (Task 11)

User-reported after Task 9: in the chat model selector both `Bedrock Claude Opus 4.5` and `…4.6`
truncate to `Bedrock Claude Opus 4…`, losing the version that distinguishes them. The cause is the
panel cap `contentClassName="min-w-64 max-w-96"` (384px) in `ChatPromptLlmSelector`, not the badge.

The user chose **widen the panel and keep the adaptive text**. These pull against each other: past
Task 9's 420px threshold the `PREMIUM` text returns and consumes roughly 110px, so the panel must be
wide enough for the longest model name *plus* that text, or the truncation simply returns.

### Task 11: Widen the chat model dropdown so names survive alongside the badge text

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx:215` — raise the
  `contentClassName` cap from `max-w-96` so a premium row fits the longest model label, the badge
  text, the check slot and the row padding without truncating. `min-w-64` stays: the panel still
  shrinks to its content, the cap only stops it running away.
- Do not change the Task 9 threshold in `src/assets/stylesheets/main.scss` unless the measured
  widths require it; if they do, change the threshold rather than reintroducing truncation, and say
  so in the commit message.
- Do not touch `LLMSelector` (assistant form) — its panel is already wide enough and shows the text.
- Test: extend `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`.

**Interfaces:**
- Consumes: `SearchableCombobox`'s `contentClassName` prop (unchanged contract).
- Produces: no new exports. Tasks 5, 6, 8, 9 behaviour unchanged.

**Test-first: yes** — jsdom does not lay out, so assert the contract: the combobox receives a
`contentClassName` whose max-width cap is greater than the Task 9 container-query threshold, so a
premium row is wide enough to establish the query container *and* keep its name. Today the cap is
`max-w-96` (384px) against a 420px threshold — strictly below it — so the assertion fails.

- [ ] **Step 1:** Write the failing assertion.
- [ ] **Step 2:** Run `npm test -- src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` — expect FAIL.
- [ ] **Step 3:** Raise the cap.
- [ ] **Step 4:** Re-run the ChatPrompt test paths — expect PASS, Tasks 5/6/8/9 assertions still green.

**Note:** the exact pixel values are provisional — jsdom cannot confirm them. Visual verification in
a real browser is required after this task and is owned by the pipeline's verification stage, not by
a plan task.

---

## Follow-up 4 — 2026-08-19: premium as a meta line (Task 12)

User-directed, and it supersedes the horizontal-fit work. Observed in the browser: the chat panel
showed `● PREMIUM` inline while the assistant-form panel showed the dot alone at ~590px of row width
— Task 9's container query fires in one panel and not the other. Rather than debug that asymmetry,
the badge stops competing for horizontal space: premium moves to a second line, exactly how the
recommended row already presents `Recommended`.

This **supersedes** the badge-slot layout of Task 6, the compact dot of Task 8, the adaptive variant
of Task 9 and the panel floor of Task 11 **for dropdown rows only**. Triggers and the chat prompt
are unchanged.

### Task 12: Premium as a second-line meta label; revert Tasks 9 and 11

**Files:**
- Modify: `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — every option row
  becomes two lines: the model name, then a meta line carrying `Recommended`, `Premium`, or
  `Recommended · Premium`. The recommended row's existing subtitle folds into this one line rather
  than gaining a second. The check keeps its reserved, vertically-centred far-right slot (Task 6).
  No badge component renders inside rows. Keep the row-level composed hover from Task 8 — the meta
  line names the state, the tooltip still explains the rate consequence.
  Revert Task 11: `contentClassName` returns to `min-w-64 max-w-96`.
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — same
  two-line row treatment; the `selectedItemTemplate` trigger keeps its full inline badge.
- Modify: `src/assets/stylesheets/main.scss` — remove the `container-type: inline-size` rule and the
  `@container (min-width: 420px)` block added by Task 9. Removing the containment is required, not
  cosmetic: it is what made rows contribute zero intrinsic width.
- Modify: `src/components/PremiumModelBadge/PremiumModelBadge.tsx` — remove the `adaptive` variant
  and its class exports. Remove `compact` too **if** nothing consumes it after this task; keep
  `anchorTooltip` only if a caller still needs it. Grep before deleting; leave no dead props.
- Test: update `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx`,
  `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`,
  `src/components/PremiumModelBadge/__tests__/PremiumModelBadge.test.tsx`.

**Styling:** the meta line matches the existing `Recommended` treatment (`text-xs`, tertiary
colour). Render the `Premium` token in the amber/warning accent so the premium signal survives the
loss of the badge; the separator and `Recommended` stay tertiary. Flag this to the user — it is the
one visual choice not dictated by the reference row.

**Interfaces:**
- Consumes: `llmModels[].isPremium`, the existing recommended-row data. No store or data change.
- Produces: no new exports. Tasks 5 and 10 are untouched; Task 6's reserved check slot survives.

**Test-first: yes** — assert a premium row renders the model name and a separate meta element whose
text is exactly `Premium`; a recommended premium model renders one meta line reading
`Recommended · Premium` (not two lines, not a badge); a plain row renders no meta line; no
`PremiumModelBadge` renders inside any dropdown row while the trigger still renders one; the check
slot stays reserved on unselected rows. Today rows render a badge and the recommended row renders
its own separate subtitle, so these fail. Also assert `contentClassName` is back to `max-w-96` and
that `main.scss` no longer contains `container-type` or `@container` for the badge classes.

- [ ] **Step 1:** Write the failing assertions across the three test files.
- [ ] **Step 2:** Run `npm test -- src/components/PremiumModelBadge src/pages/chat/components/ChatPrompt/__tests__ src/pages/assistants/components/AssistantForm/components/__tests__` — expect FAIL.
- [ ] **Step 3:** Implement the meta line in both selectors, then revert the Task 9 CSS/variant and the Task 11 width.
- [ ] **Step 4:** Re-run those paths plus `npm test -- src/utils/__tests__/tooltip.test.ts` — expect PASS, Tasks 5, 6 and 10 still green.

---

## Follow-up 5 — 2026-08-19: premium on the closed trigger (Task 13)

Last surface. In the narrow "Extra configuration" panel (~380px) the trigger's `● PREMIUM` pill
takes ~130px, truncating the selected value to `Bedrock Claude O…`. The user chose **option F** from
a seven-option visual mockup reviewed in-session and not retained in the repository: an amber ring
on the control plus a `Premium` line beneath
it. The ring is not a new invention — `ChatPrompt` already rings the prompt in
`ring-1 ring-aborted-primary/60` when a premium model is active, so this makes the two surfaces
agree instead of each having its own idiom.

### Task 13: Amber ring plus meta line on the assistant-form trigger

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` —
  when the selected model is premium: (a) apply the same amber ring the chat prompt uses to the
  control, (b) render a `Premium` meta line beneath the field in the amber accent, matching the row
  meta line from Task 12, (c) stop rendering the inline badge in the trigger. If the
  `selectedItemTemplate` added by Task 7 exists **only** to place that badge, remove it and let the
  default value rendering return — but re-verify the placeholder/empty-value case Task 7 called out,
  since that template also owned it.
  The component already accepts a `hint` prop from callers: **compose**, never clobber — a
  caller-supplied hint and the premium line must both survive.
- Do not change `ChatPromptLlmSelector`'s trigger. It lives inside the chat prompt, which already
  carries the ring; adding a second indication there would double up.
- Test: extend `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`.

**Interfaces:**
- Consumes: `appInfoStore.llmModels[].isPremium`, the existing `MultiSelect` `className`/`hint` props,
  the `ring-aborted-primary` token already used by `ChatPrompt`.
- Produces: no new exports.

**Tooltip anchor:** Task 5's invariant still holds — exactly one premium anchor per surface, never
nested. With the trigger badge gone, the premium hover moves to the meta line. Assert it, or the
explanation of *why* premium matters is lost from this surface entirely.

**Test-first: yes** — assert that with a premium model selected the trigger renders no
`PremiumModelBadge`, the control carries the ring class, a meta element reads exactly `Premium`, and
that element is the single premium tooltip anchor on the surface; that a caller-supplied `hint`
still renders alongside it; and that a non-premium selection renders no ring, no meta line and no
premium anchor. Today the badge renders inline and there is no ring, so these fail.

- [ ] **Step 1:** Write the failing assertions.
- [ ] **Step 2:** Run `npm test -- src/pages/assistants/components/AssistantForm/components/__tests__` — expect FAIL.
- [ ] **Step 3:** Apply the ring, the meta line, and the badge removal.
- [ ] **Step 4:** Re-run that path plus `npm test -- src/pages/assistants src/pages/chat/components/ChatPrompt/__tests__` — expect PASS, Tasks 5, 10 and 12 still green.

---

## Follow-up 7 — 2026-08-19: models-and-rates link on the trigger (Task 15)

The chat tip already ends with `View models and rates` linking to `HELP_MODELS_ROUTE`
(`ChatPremiumModelTip.tsx:38-43`). The user wants the same route reachable from the assistant form,
so premium is not a dead end wherever it appears.

### Task 15: Link the assistant-form premium note to the models catalog

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` — the premium
  note becomes `Premium model` + the info affordance from Task 14 + `· View models and rates`
  linking to `HELP_MODELS_ROUTE`. The link is **visible text**, not tooltip-only: a link reachable
  only on hover cannot be tabbed to, and Task 10 now closes tooltips on scroll. Reuse the link
  styling from `ChatPremiumModelTip.tsx:40` so the two surfaces match.
- Do **not** put the link inside dropdown row hovers: clicking a row selects that model, so a link
  competing for that click is a trap.
- Test: extend `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`.

**Interfaces:**
- Consumes: `HELP_MODELS_ROUTE` from `@/pages/help/ModelsCatalog`, `react-router` `Link`,
  `PREMIUM_MODEL_TOOLTIP`.
- Produces: no new exports.

**Routing caveat:** the assistant form renders inside a modal/drawer in some callers. Confirm the
`Link` resolves against the same router context and that navigating away from a dirty form is not
silently destructive — if it is, say so rather than shipping a data-loss path.

**Test-first: yes** — assert the note renders an anchor whose text is `View models and rates` and
whose target is `HELP_MODELS_ROUTE`; that it is a real link element, tab-reachable, not a hover-only
node; that a non-premium selection renders no link; and that Task 14's single premium tooltip anchor
is unchanged (the link must not become a second anchor).

- [ ] **Step 1:** Write the failing assertions.
- [ ] **Step 2:** Run `npm test -- src/pages/assistants/components/AssistantForm/components/__tests__` — expect FAIL.
- [ ] **Step 3:** Add the link.
- [ ] **Step 4:** Re-run that path plus `npm test -- src/pages/assistants` — expect PASS, Tasks 5, 12 and 14 still green.

---

## Follow-up 6 — 2026-08-19: soften the trigger treatment (Task 14)

Task 13 shipped option F and it read wrong in the running app: an amber ring around a form control
looks like a validation error, and a bare amber `Premium` beneath it looks like the error message —
especially next to the Skills field directly below, whose hint is an icon plus a full sentence. The
user's call: drop the ring, and name the state properly with an explanation on hover.

### Task 14: `Premium model` label with an info tooltip, ring removed

**Files:**
- Modify: `src/pages/assistants/components/AssistantForm/components/LLMSelector.tsx` —
  remove the `ring-1 ring-aborted-primary/60` added by Task 13 from the control; the field returns
  to its normal border in every state. The note under the field reads **`Premium model`** followed
  by an info affordance whose hover carries `PREMIUM_MODEL_TOOLTIP`. Reuse the component the form
  already uses for field hints (`TooltipButton`, as used for the `hint` prop on the label) rather
  than introducing a second info-icon idiom.
- Test: extend `src/pages/assistants/components/AssistantForm/components/__tests__/LLMSelector.premiumLayout.test.tsx`.

**Scope note:** dropdown rows keep the short `Premium` / `Recommended · Premium` meta line from
Task 12. In a list of models the context is unambiguous and the rows have no room for a sentence;
the trigger is the surface that reads as a form field and needs naming.

**Interfaces:**
- Consumes: `PREMIUM_MODEL_TOOLTIP` (unchanged export), the existing `TooltipButton`.
- Produces: no new exports.

**Test-first: yes** — assert the control carries no ring class in any state (today it does when
premium); the note reads exactly `Premium model`; the info affordance is the single premium tooltip
anchor on the surface and carries `PREMIUM_MODEL_TOOLTIP`; the label text itself does not anchor, so
nothing nests (Task 5); and a non-premium selection renders neither the note nor an anchor.

- [ ] **Step 1:** Write the failing assertions.
- [ ] **Step 2:** Run `npm test -- src/pages/assistants/components/AssistantForm/components/__tests__` — expect FAIL.
- [ ] **Step 3:** Remove the ring, rename the note, attach the info tooltip.
- [ ] **Step 4:** Re-run that path plus `npm test -- src/pages/assistants src/pages/chat/components/ChatPrompt/__tests__` — expect PASS, Tasks 5, 10 and 12 still green.
