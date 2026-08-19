# Technical Research

**Task**: chat premium model tip tooltip dismissal
**Generated**: 2026-08-19
**Research path**: filesystem

---

## 1. Original Context

analyze the issue with premium model tool tip. it looks like for new chat it is not appear if it was previously closed, all hover constnatly displayed with premium message

Additional context from the user's report (verbatim intent): There is a premium-model indication tooltip/tip in the chat UI. Two symptoms are reported: (1) when a new chat is started, the tip does not appear again if the user previously closed/dismissed it; (2) on hover, the premium message is displayed constantly / always shown. The recent branch EPMCDME-14126_premium-model-indication introduced this feature (see commits touching ChatPremiumModelTip). Research the dismissal/persistence state, the re-arm logic, the hover/tooltip trigger, and where the tip visibility is computed.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatPrompt/ChatPremiumModelTip.tsx` — presentational banner ("Premium model active", model label, link to `HELP_MODELS_ROUTE`, close button with `aria-label="Dismiss premium model tip"`). Props: `modelLabel`, `onDismiss`. No state of its own.
- `src/pages/chat/components/ChatHistory/ChatHistory.tsx` — the only place the tip is rendered and the only place tip visibility is computed (lines 45–86):
  - `effectiveModel = currentChat?.llmModel ? llmModels.find(m => m.value === currentChat.llmModel) : null`
  - `isPremiumActive = effectiveModel?.isPremium ?? false`
  - `premiumTipKey = currentChat?.id && effectiveModel?.value ? \`${currentChat.id}:${effectiveModel.value}\` : null`
  - `const [dismissedPremiumTipKey, setDismissedPremiumTipKey] = useState<string | null>(null)` — dismissal lives in React component state only; nothing writes it to `storage`/localStorage or to a Valtio store.
  - Re-arm effect: `useEffect(() => { if (premiumTipKey) setDismissedPremiumTipKey(null) }, [premiumTipKey])` — the reset is skipped whenever the key is `null`.
  - `tipIsVisible = isPremiumActive && premiumTipKey !== null && dismissedPremiumTipKey !== premiumTipKey`
  - Tip is rendered as a `shrink-0 px-6 py-2` flex item **below** the scroll container, `{tipIsVisible && effectiveModel && ...}`.
  - `useChatScroll({ scrollContainerRef, layoutDeps: [tipIsVisible] })`.
- `src/pages/chat/ChatPage.tsx` — mounting rules that gate the tip:
  - line 118: `<PageLayout key={currentChat?.id} ...>` — the whole chat subtree (including `ChatHistory`) is re-keyed on chat id change, so `ChatHistory` state is recreated whenever `currentChat.id` changes.
  - lines 130–138: `hasHistory = !!currentChat?.history.length`; `ChatHistory` is rendered **only** when `hasHistory` is true, otherwise `ChatPromptStarters` is rendered instead.
  - line 124: inner `Group key={hasHistory ? userId : \`empty-${userId}\`}` — another remount boundary when the first message appears.
- `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` — hover surface for the premium message:
  - lines 131–135 recompute `effectiveModel` / `isPremiumActive` independently of `ChatHistory` (duplicated derivation).
  - lines 255–269: the **entire prompt container div** (wrapping the editor, the toolbar row, the LLM selector, file upload, skills, send button) receives `data-tooltip-id="react-tooltip"` and `data-tooltip-content={PREMIUM_MODEL_TOOLTIP}` when `isPremiumActive`, plus `ring-1 ring-aborted-primary/60`.
  - The tip component itself is no longer rendered from `ChatPrompt` (moved to `ChatHistory` in commit `f44a86c89`).
- `src/components/PremiumModelBadge/PremiumModelBadge.tsx` — exports `PREMIUM_MODEL_TOOLTIP = 'Premium model — higher usage rates apply'`; the badge `<span>` is itself a `data-tooltip-id="react-tooltip"` anchor with that same content, wrapping `StatusBadge` (Warning).
- `src/pages/chat/components/ChatPrompt/ChatPromptLlmSelector.tsx` — the selector trigger button (lines 124–142) is also a `react-tooltip` anchor whose content is `PREMIUM_MODEL_TOOLTIP` when the selected model is premium, and it renders `<PremiumModelBadge />` (another anchor) inside itself. Both sit inside the `ChatPrompt` container anchor described above — three nested anchors with the same tooltip id.
- `src/utils/tooltip.ts` — single global `react-tooltip` instance (`id: 'react-tooltip'`) rendered into `#react-tooltip-container` by `setupGlobalTooltip()` (called from `src/main.tsx:38`). Configured with `openEvents: { mouseover: true }` (mouseover **bubbles** from descendants, unlike the library default `mouseenter`), `clickable: true`, `globalCloseEvents: { escape: true }`; no `closeEvents` or delay overrides.
- `src/store/appInfo.ts:256–278` — `getLLMModels()` maps `is_premium` → `isPremium`. Called from `src/hooks/appLevel/useInitialDataFetch.tsx:45`, `ChatPromptLlmSelector.tsx:69`, `ModelsCatalogPage.tsx:45`, and two data-source screens.
- `src/store/chats.ts` — chat lifecycle relevant to the tip key:
  - `startNewChat` (lines 295–315) fetches the `v1/conversations/new` template, then sets `newConversation.id = ''` and `isNewChat = true`. An empty-string id is falsy, so `premiumTipKey` evaluates to `null` for an unsaved new chat.
  - `updateChat` (lines 375–396): while `isNewChat`, it only does `Object.assign(chat, data)` locally and resolves `null` — no PUT.
  - `createChat` (lines 317–348): POSTs the conversation, calls `getChat(newChat.id)`, clears `isNewChat`, and `router.replace({ name: 'chats', params: { id: newChat.id } })`.
- `src/store/chatGeneration.ts:334–345` — on the first send of a new chat: captures `pendingLlmModel = chat.llmModel`, awaits `createChat()`, re-applies `updateChat(newId, { llmModel: pendingLlmModel })`, then recurses into `createChatGeneration`.
- `src/pages/chat/components/ChatHistory/hooks/useChatScroll.tsx` — `layoutDeps` (default `[]`) spread into the stick-to-bottom effect deps (line 63) alongside `currentChat?.history`; separate effect scrolls to bottom on `currentChat?.id`.

### Architecture and Layers Affected

- **View / chat page composition**: `src/pages/chat/ChatPage.tsx` (mount gating via `hasHistory`, remount keys), `ChatHistory.tsx` (visibility computation + render slot), `ChatPrompt.tsx` (hover anchor + premium ring).
- **Presentational components**: `ChatPremiumModelTip.tsx`, `PremiumModelBadge.tsx`, `ChatPromptLlmSelector.tsx`.
- **Global tooltip infrastructure**: `src/utils/tooltip.ts` + `src/main.tsx` (single shared `react-tooltip` instance used by ~40 components repo-wide).
- **Hooks**: `useChatScroll.tsx` (layout re-anchor coupled to `tipIsVisible`).
- **State layer (Valtio)**: `src/store/chats.ts` (`currentChat`, `isNewChat`, `updateChat`, `startNewChat`, `createChat`), `src/store/appInfo.ts` (`llmModels`, `isPremium`), `src/store/chatGeneration.ts` (new-chat promotion path).
- **Client-side persistence layer (adjacent, currently unused by the tip)**: `src/utils/storage.ts` + `src/utils/chatStorageUtils.ts` (per-user, per-chat keys such as `chat-skills-<chatId>`, `chat-tools-config-<chatId>`, `chat-hide-tool-outputs-<chatId>`, with `removeChatStorage`/`sweepOrphanedChatKeys` housekeeping).

### Integration Points

- `ChatHistory` → `appInfoStore.llmModels` (read only; `ChatHistory` never calls `getLLMModels()` itself — the fetch comes from `useInitialDataFetch` or from `ChatPromptLlmSelector`'s mount effect).
- `ChatHistory` → `chatsStore.currentChat` (id, llmModel, history) via `useSnapshot`.
- `ChatPrompt` → same two stores, deriving `isPremiumActive` a second time.
- `ChatPremiumModelTip` → `react-router` `Link` → `HELP_MODELS_ROUTE` (`/help/models`, `src/pages/help/ModelsCatalog/`).
- All premium hover text flows through the single global `react-tooltip` instance; changing its options affects every tooltip in the app.
- External service: `GET v1/llm_models` supplies `is_premium`; `POST/PUT v1/conversations*` supplies/persists `llm_model`.

### Patterns and Conventions

- Valtio `useSnapshot(store)` for state reads; store mutation through store methods (`chatsStore.updateChat`).
- Global tooltip via data attributes (`data-tooltip-id="react-tooltip"` + `data-tooltip-content`), never per-component `<Tooltip>` instances for hover text (PrimeReact `Tooltip` wrapper exists at `src/components/Tooltip/` but is not used here).
- Truncation-aware tooltips: `ModelOptionLabel` in `ChatPromptLlmSelector` sets `data-tooltip-content` only when `useIsTruncated` reports truncation — an existing precedent for conditionally suppressing tooltip anchors.
- Per-chat client state is persisted through `storage.put(userId, \`<key>-<chatId>\`, value)` helpers in `chatStorageUtils.ts` / `useChatPromptDraft.ts`.
- Components are function components with `FC<Props>`, Tailwind class composition via `cn`, Apache license header on every file.
- Remount-as-reset is used deliberately in `ChatPage` (`key={currentChat?.id}`, `key={hasHistory ? userId : ...}`).

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/` is present: `architecture/`, `components/`, `development/`, `patterns/`, `styling/`, `testing/`, `standards/`, `onboarding/`, `project.md`, `quality-gates.md`.
- `.ai-run/guides/testing/testing-patterns.md` — Vitest 1.6.1 + RTL; tests live in co-located `__tests__/`; `*.test.tsx` → `unit` project (mocks `useSnapshot` and `@/utils/api` via `setupTests.unit.ts`), `*.integration.test.tsx` → `integration` project (real Valtio, mocked fetch). Commands: `npm run test:unit`, `npm run test:integration`, `npm test -- <file>`.
- `.ai-run/guides/patterns/state-management.md` — no guidance on localStorage/persistence (grep for `storage|persist|localStorage` returns nothing).
- No guide covers the premium-model feature, the global tooltip utility, or tip dismissal semantics.

### Architectural Decisions

Recorded in the repo as SDLC review artifacts (`docs/superpowers/tasks/`):

- `2026-08-14-epmcdme-14126-premium-model-indication/code-review-check.json` (approve) records the original design intent: "ChatPremiumModelTip portaled above the chat prompt with a ResizeObserver anchor. Tip re-arms on chat or model change (premiumTipKey). Amber ring on the input container while premium model is active." and "dismissal is scoped per (chatId, modelValue) key". Also: "ModelOptionLabel component shows full-name tooltip only when the name is actually truncated — avoids spurious tooltips."
- `2026-08-17-epmcdme-14126-followup-layout-fix/code-review-final.json` (request-changes, risk flag `ux-regression`) raised:
  - **CR-001** — tip appearing/disappearing steals ~40px from the scroll area without re-anchoring scroll.
  - **CR-002** — `premiumTipKey` previously stringified to `'undefined:undefined'`, so a transient null-chat state between navigations re-armed a previously dismissed tip. Recommendation: guard the key against nulls and skip the reset while null "so dismissal is preserved across brief unmount/remount cycles".
- `2026-08-17-epmcdme-14126-followup-layout-fix/code-review-check.json` (approve) confirms both were implemented in `a2c6e5b89` — i.e. the current `if (premiumTipKey)` guard and `layoutDeps` were added deliberately to *preserve* dismissal across null-key transitions.
- Commit `f44a86c89` message: "Render the tip inside ChatHistory as a shrink-0 flex item so it pushes messages up without affecting the prompt panel size. Clean up tip logic from ChatPrompt."
- Inline comment in `ChatPremiumModelTip.tsx:28`: "Styled after InfoWarning (WARNING type) but with a link to the models catalog."
- Inline comment in `vitest.workspace.ts` documenting the unit/integration split.

### Derived Conventions

- Hover text is expressed declaratively as data attributes on the *smallest* meaningful anchor elsewhere in the codebase (badges, icon buttons, truncated labels); `ChatPrompt.tsx:255–269` is the one place a full-size layout container carries `data-tooltip-content`.
- Dismissible/one-off UI state elsewhere in chat (skills, tool config, hide-tool-outputs, prompt drafts) is stored per `(userId, chatId)` through `chatStorageUtils`/`storage`; the premium tip is the exception with in-memory-only state.
- No `TODO`/`HACK`/`FIXME` markers found in the premium-model files; the only suppression is `// eslint-disable-next-line react-hooks/exhaustive-deps` in `useChatScroll.tsx:62`.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatPrompt/__tests__/ChatPremiumModelTip.test.tsx` — 3 unit tests: renders "Premium model active" + model label + rate text; link href `/help/models`; `onDismiss` fired once on close click. Renders the component in isolation inside `MemoryRouter`.
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` — `describe('ChatPromptLlmSelector — premium badge')`: badge shown on premium option rows only, badge in trigger for premium selection, no badge for standard model.
- `src/components/PremiumModelBadge/__tests__/PremiumModelBadge.test.tsx` — badge rendering.
- `src/pages/chat/components/ChatHistory/__tests__/ChatHistory.scrollbar.test.tsx` — renders `ChatHistory` with `ChatHistoryGroup`, `useChatScroll`, `useChatInfiniteScroll` mocked; asserts only scrollbar utility classes.
- `src/pages/help/ModelsCatalog/__tests__/ModelsCatalogPage.test.tsx`, `src/store/__tests__/appInfo.test.ts` (premium mapping), `src/pages/assistants/.../__tests__/LLMSelector.test.tsx`.
- E2E (`e2e/`, Playwright, `playwright.config.ts` — untracked working-tree addition) contains only marketplace specs; no chat or premium specs.

### Testing Framework and Patterns

- Vitest 1.6.1 + `@testing-library/react` 16.3.0 + `@testing-library/user-event` 14.6.1 + `jest-dom` 6.6.3; jsdom for unit, custom `vitest-env-integration.ts` for integration (30s timeout).
- Unit project mocks `useSnapshot` and `@/utils/api` globally (`setupTests.unit.ts`); `SettingsLayout` and `useVueRouter` mocked in `setupTests.tsx`.
- Prevailing patterns: `vi.mock` of child components/hooks (as in `ChatHistory.scrollbar.test.tsx`), AAA structure, one behaviour per `it`, `screen.getByRole` queries.

### Coverage Gaps

- No test exercises `ChatHistory`'s tip visibility logic: `premiumTipKey` computation, the `if (premiumTipKey)` re-arm guard, `dismissedPremiumTipKey`, or `tipIsVisible`. The only `ChatHistory` test mocks everything and asserts CSS classes.
- No test covers behaviour across chat switches / new-chat creation (dismiss in chat A → open chat B → start new chat), i.e. the exact reported symptom.
- No test covers `ChatPrompt`'s conditional `data-tooltip-content={PREMIUM_MODEL_TOOLTIP}` on the container, nor nested-anchor behaviour with the global tooltip.
- No test covers `src/utils/tooltip.ts` options (`openEvents: { mouseover: true }`, `clickable: true`) — only `src/utils/__tests__/tooltip.test.ts` for the container bootstrap.
- No integration test spans `ChatPage` → `chatsStore.startNewChat`/`createChat` → tip rendering.

---

## 5. Configuration and Environment

### Environment Variables

- None referenced by the premium-tip code path. Premium status is runtime data from `GET v1/llm_models` (`is_premium`), not configuration.

### Configuration Files

- `src/utils/tooltip.ts` — the effective configuration surface for all hover tooltips (id, `openEvents`, `clickable`, `globalCloseEvents`, class names incl. `z-[10000] max-w-[500px]`).
- `package.json` — `react-tooltip 5.29.1`, `valtio 2.1.5`, `react-router`, `vitest 1.6.1`.
- `vitest.workspace.ts` — unit vs integration projects and their setup files.
- `src/pages/help/ModelsCatalog/constants.ts` + `index.ts` — `HELP_MODELS_ROUTE` used by the tip link.
- `.ai-run/guides/quality-gates.md` — lint/typecheck/test gate commands (`npm run typecheck`, `npm run lint`, `npm run check:pre-commit`).

### Feature Flags and Deployment Concerns

- No feature flag guards the premium indication; it is driven purely by `isPremium` on the model record, with `?? false` fallbacks so older backends without `is_premium` render nothing (documented in the 2026-08-14 review artifact).
- No secrets or deployment manifests touch this area.
- Working tree currently has unrelated in-flight changes (marketplace management pages, Playwright `e2e/`), which share the branch but not this feature area.

---

## 6. Risk Indicators

- **Tip visibility depends on three independent mount/visibility gates that are easy to break in isolation**: `ChatPage.tsx:131` (`hasHistory ? <ChatHistory/> : <ChatPromptStarters/>`), `ChatHistory.tsx:51-52` (`premiumTipKey` requires a truthy `currentChat.id`), and `ChatHistory.tsx:59-60` (`dismissedPremiumTipKey !== premiumTipKey`). A new chat created via `startNewChat` has `id = ''` (falsy) and empty history, so both the mount gate and the key gate are closed for the whole unsaved phase.
- **Dismissal state is in-memory and remount-scoped, while `ChatPage` deliberately remounts on `currentChat?.id` change (`key={currentChat?.id}`) and on the empty→non-empty history transition (`key={hasHistory ? userId : \`empty-${userId}\`}`)**. The recorded CR-002 intent ("dismissal is preserved across brief unmount/remount cycles") and the actual remount keys pull in opposite directions; the `if (premiumTipKey)` guard only preserves state within a single mounted instance.
- **The re-arm effect is skipped whenever `premiumTipKey` is `null`** (`ChatHistory.tsx:56`), i.e. exactly during new-chat / model-cleared / models-not-yet-loaded states. Any surviving `dismissedPremiumTipKey` from an earlier key is carried unchanged through those states.
- **`appInfoStore.llmModels` is not fetched by `ChatHistory`**; if the list is empty at first paint (`useInitialDataFetch` still in flight, or the selector never mounted because `assistantFeatures.modelSelector` is false / workflow / shared page), `effectiveModel` is `null`, `isPremiumActive` is `false`, and the key is `null` — the tip silently does not render.
- **Constant-hover surface**: `ChatPrompt.tsx:255-269` attaches `data-tooltip-content={PREMIUM_MODEL_TOOLTIP}` to the full-height prompt container, and the global tooltip uses `openEvents: { mouseover: true }` — a bubbling event — plus `clickable: true`. Any pointer movement over the editor, toolbar, buttons, or the tooltip itself keeps re-opening/holding the premium message. This is the strongest match for symptom (2).
- **Three nested anchors with the same tooltip id** (prompt container → LLM selector trigger → `PremiumModelBadge` span) all resolve to `PREMIUM_MODEL_TOOLTIP` on a single shared `react-tooltip` instance; nested anchors on one instance can cause the tooltip to persist or flicker as `mouseover` bubbles between them.
- **Duplicated derivation of `isPremiumActive`** in `ChatHistory.tsx:47-50` and `ChatPrompt.tsx:132-135` — the two can disagree (e.g. `ChatHistory` unmounted while `ChatPrompt` still shows the ring/tooltip), and any fix applied in one place silently misses the other.
- **Coupling to scroll behaviour**: `useChatScroll({ layoutDeps: [tipIsVisible] })` with an `eslint-disable` on the deps array means changing how `tipIsVisible` is computed also changes scroll re-anchoring (CR-001 territory).
- **Zero test coverage on the failing logic** — `ChatHistory` tip visibility, chat-switch behaviour, and the `ChatPrompt` tooltip attribute are all untested; the existing `ChatPremiumModelTip.test.tsx` only exercises the presentational shell, so a regression here is invisible to CI.
- Global tooltip changes have blast radius: `src/utils/tooltip.ts` serves ~40 components, so altering `openEvents`/`clickable` there affects unrelated screens.
- *Speculative:* fixing symptom (1) will likely require choosing an explicit persistence scope for dismissal (in-memory vs `chatStorageUtils`-style per-`(userId, chatId)` key vs a Valtio store field) and reconciling it with the `key={currentChat?.id}` remount; the two recorded reviews (`code-review-check.json` 2026-08-14 vs `code-review-final.json` CR-002) state re-arm expectations that are not obviously compatible with the current remount strategy, so the intended semantics need to be settled before implementation.
- *Speculative:* fixing symptom (2) will likely mean narrowing or removing the container-level `data-tooltip-content` in `ChatPrompt.tsx` and/or adjusting the shared tooltip's open/close events, the latter of which is a repo-wide change requiring broader regression checking.

---

## 7. Summary for Complexity Assessment

The premium-model tip is a small, self-contained feature spread over four files plus one shared utility. Visibility is computed entirely inside `src/pages/chat/components/ChatHistory/ChatHistory.tsx` (lines 45–86) from three Valtio-derived values — `currentChat.id`, `currentChat.llmModel` resolved against `appInfoStore.llmModels`, and a locally held `dismissedPremiumTipKey` — while the hover text comes from a completely separate path: `PREMIUM_MODEL_TOOLTIP` attached as `data-tooltip-content` on the whole prompt container in `ChatPrompt.tsx:255-269`, on the LLM selector trigger, and on `PremiumModelBadge`, all served by the single global `react-tooltip` instance configured in `src/utils/tooltip.ts` with the bubbling `openEvents: { mouseover: true }` and `clickable: true`. Layers touched are therefore: chat page composition (`ChatPage.tsx` mount gates and remount keys), two chat view components, one presentational component, one shared badge/constant, one hook (`useChatScroll` via `layoutDeps`), and the global tooltip utility — with read-only dependencies on `chatsStore`, `appInfoStore`, and `chatGenerationStore`'s new-chat promotion path. The expected change surface is a handful of files in `src/pages/chat/` plus possibly `src/utils/tooltip.ts` and new tests.

Technical novelty is low — no new API, no schema, no migration, no new dependency — but the state semantics are genuinely tangled. New chats start with `id = ''` and no history, so both `ChatPage`'s `hasHistory` mount gate and `ChatHistory`'s truthy-id `premiumTipKey` gate are closed until the chat is persisted by `chatsStore.createChat()`; meanwhile the dismissal flag is plain `useState` inside a subtree that `ChatPage` deliberately re-keys on `currentChat?.id` and on the empty→non-empty history transition. Two recorded review artifacts under `docs/superpowers/tasks/` document an explicit but hard-to-satisfy intent ("dismissal scoped per (chatId, modelValue)", "preserved across brief unmount/remount cycles", CR-002), so the correct behaviour must be settled from those decisions rather than guessed. Repo conventions offer a ready persistence precedent (`chatStorageUtils.ts` per-`(userId, chatId)` keys) if persistence is chosen.

Test posture is the main risk multiplier: the only premium tests are presentational (`ChatPremiumModelTip.test.tsx`, `ChatPromptLlmSelector.test.tsx` badge assertions, `PremiumModelBadge.test.tsx`), and the sole `ChatHistory` test mocks every dependency to assert scrollbar classes. Nothing covers `premiumTipKey`, the `if (premiumTipKey)` re-arm guard, chat-switch or new-chat flows, or the prompt-container tooltip attribute, so both reported symptoms are currently invisible to CI and any fix lands without a safety net. Additional risk factors: the duplicated `isPremiumActive` derivation in `ChatHistory` and `ChatPrompt` that can drift apart, the `tipIsVisible` → `useChatScroll` layout coupling introduced by CR-001, three nested anchors sharing one tooltip id, and the repo-wide blast radius of any change to `src/utils/tooltip.ts`.
