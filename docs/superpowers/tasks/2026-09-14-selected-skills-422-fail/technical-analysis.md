# Technical Research

**Task**: chat skills persistence
**Generated**: 2026-09-14T00:00:00Z
**Research path**: codegraph

---

## 1. Original Context

Fix EPMCDME-14520 — Chat with selected skills fails with /model 422 after navigating to Assistants and returning. Root cause: a shape mismatch in chat skills storage — chatGeneration.ts's new-chat branch (createChatGeneration, around the saveChatSkills(userId, newId, skillIds ?? []) call) writes bare skillIds strings (string[], the /model wire format) under the same localStorage key (chatSkillsKey) that useChatConfiguration.tsx's handleSetSelectedSkills / loadChatSkills read and write, which expect SkillOption[] objects ({value, label, description?}). Reading a string element as {value} yields undefined, producing skill_ids: [null] on the next /model request after navigating away to Assistants and back. There are two more suspected pre-existing bugs interacting with this: (1) handleSetSelectedSkills's guard `if (chatId && userId)` treats chatsStore.startNewChat()'s chatId of '' as falsy, so skills picked on a brand-new chat (before the first real chat id exists) are never persisted to storage at all; (2) any orphaned-key sweep mechanism (if present) may delete a ''-keyed temp entry before it can be migrated to the real chat id. Acceptance criteria (Jira): selected skills remain valid and persisted after navigating away and back; frontend never sends skill_ids containing null/undefined/invalid values; if a selected skill is no longer available, UI handles it gracefully and excludes it; continuing a chat with previously selected skills after visiting Assistants works without /model 422; model request payload contains only valid skill IDs; a regression test covers new chat → add skills → send message → navigate to Assistants → return to chat → send another message. Research needed: exact current source of chatGeneration.ts's createChatGeneration new-chat branch, useChatConfiguration.tsx's handleSetSelectedSkills/loadChatSkills/saveChatSkills/chatSkillsKey and its reload useEffect (deps on currentChat?.id), chatsStore.startNewChat()/createChat()/getChats() and whether any orphaned-key sweep exists on this branch currently, and existing tests covering this flow (chatGeneration storage-guard tests, useChatConfiguration tests, any integration tests under src/pages/chat/hooks/__tests__/). Note: a previous fix attempt was reverted on this branch; do not assume any skills-fix code currently exists — verify current state from scratch.

---

## 2. Codebase Findings

### Existing Implementations

- `src/store/chatGeneration.ts:416-451` — `chatGenerationStore.createChatGeneration(options)`. On the new-chat path (`chatsStore.isNewChat === true`, lines 436-451): calls `chatsStore.createChat()` to obtain `newId`, then at **line 444** calls `saveChatSkills(userId, newId, skillIds ?? [])` where `skillIds: string[] | undefined` comes straight from `ChatGenerationOptions.skillIds` (`src/types/chatGeneration.ts:126`, `string[]`). This writes an array of bare skill-id strings under `chatSkillsKey(newId)`.
- `src/store/chatGeneration.ts:461-482` — the `ChatRequest` built for the `/model`-bound request. `skill_ids: skillIds?.length ? skillIds : undefined` (line 478) — this is the correct, string-array wire shape for the network request itself. The bug is that the *same* string array is also persisted into the localStorage slot that the other code path expects to hold `SkillOption[]`.
- `src/pages/chat/hooks/useChatConfiguration.tsx`:
  - `loadChatSkills(userId, chatId)` (line 47-49): `storage.get<SkillOption>(userId, chatSkillsKey(chatId))` — typed as `SkillOption[]`, but `storage.get` (see below) does no runtime validation; it just parses whatever JSON was stored and casts it.
  - `handleSetSelectedSkills` (lines 117-127): `setSelectedSkills(skills)` then `if (chatId && userId) saveChatSkills(userId, chatId, skills)` where `chatId = currentChat?.id`. Guard is a plain truthiness check — an empty string chat id (`''`) is falsy, so the `saveChatSkills` call is skipped entirely for a brand-new, not-yet-created chat.
  - Reload effect (lines 171-198): keyed on `[currentChat?.id, currentChat?.isWorkflow, closeConfigForm]`. When `chatId && userId` **and** `currentChat?.history.length` truthy, it calls `setSelectedSkills(loadChatSkills(userId, chatId))` — i.e. it repopulates `selectedSkills` state straight from whatever is in storage, with no shape validation. This is the read side that trips on the string-array written by `chatGeneration.ts`.
  - `export { saveChatSkills, saveChatTools }` (line 37) re-exports the storage-util functions unchanged; the storage-guard test file imports `saveChatSkills`/`saveChatTools` from `'../useChatConfiguration'`, not from `chatStorageUtils` directly.
- `src/utils/chatStorageUtils.ts`:
  - `CHAT_SKILLS_KEY = 'chat-skills'`, `chatSkillsKey = (chatId) => \`chat-skills-${chatId}\`` (lines 20, 24).
  - `saveChatSkills(userId, chatId, skills: unknown[])` (lines 49-56): guard is only `if (skills.length === 0) return` — no shape/type validation of the elements; `unknown[]` is accepted and written as-is via `storage.put`.
  - `removeChatStorage(userId, chatId)` (lines 80-84): removes both the skills and tools keys for a chat id; called only from `chatsStore.deleteChat`/`deleteAllConversations` in `src/store/chats.ts`.
  - `isEmptyChatValue(key)` (lines 86-96): parses the raw localStorage string and treats it as "empty" only if it is `[]` or the default (all-null) tools config object. A non-empty array of bare strings (e.g. `["skill-a"]`) is **not** considered empty by this check, so it will not be swept even though it is the wrong shape.
  - `sweepOrphanedChatKeys(userId, validChatIds?)` (lines 98-134) — this **is** the orphaned-key sweep mechanism referenced in the ticket. Two passes over every localStorage key:
    1. **Existence sweep** (only runs when `validChatIds !== undefined`): for the current user's `chat-skills-*`/`chat-tools-config-*`/`chat-hide-tool-outputs-*` keys, extracts the trailing chat id and deletes the key if that id is not in `validChatIds`.
    2. **Empty-value sweep** (always runs, all users): deletes any chat-scoped key (for *any* user) whose parsed value is empty per `isEmptyChatValue`.
  - Called from exactly one place: `src/store/chats.ts:170-199`, inside `chatsStore.getChats()`, immediately after `chatsStore.chats = chats` — i.e. every time the chat list is (re)fetched, with `validChatIds = chats.map(c => c.id)`. **`getChats()` is not called by `startNewChat()` or `createChat()`** — it is triggered independently (e.g. on navigation to a page that lists chats, such as Assistants or the sidebar). Because `''` is never a valid chat id in `validChatIds`, if a `chat-skills-` entry were ever written under the empty-string key (`chatSkillsKey('') === 'chat-skills-'`) it would be swept the next time `getChats()` runs and passes a `validChatIds` list that does not include `''`.
- `src/utils/storage.ts` and `src/utils/storage/index.ts` — two near-duplicate storage helper modules exist (`get`/`put`/`getObject`/`remove`/`compoundKey`, key format `${userId}_${key}`). `chatStorageUtils.ts` imports from `@/utils/storage` (the flat file, not the `/index.ts` variant which is used elsewhere, e.g. `useSkillsBase.ts` does not touch it but other callers do). Neither `get` nor `put` performs any schema/shape validation — both simply `JSON.parse`/`JSON.stringify` the value handed to them.
- `src/store/chats.ts`:
  - `startNewChat(assistantId, folder, isWorkflow)` (lines 329-352): fetches a template conversation, then **explicitly sets `newConversation.id = ''`** (line 342), sets `chatsStore.isNewChat = true`, stores `newChatParams`, and sets `chatsStore.currentChat = newConversation`. This is the exact origin of the `''` chat id the ticket describes — confirmed in code, not just suspected.
  - `createChat()` (lines 354-389): POSTs to `v1/conversations` using `chatsStore.newChatParams`, gets back a real `newChat.id`, updates `chatsStore.chats`, fetches the full chat via `getChat(newChat.id)`, sets `chatsStore.isNewChat = false`, clears `newChatParams`, and redirects the router to `chats/:id` with the new id. It does **not** call `sweepOrphanedChatKeys` and does **not** migrate/copy any `''`-keyed storage entry to the new id.
  - `getChats()` (lines 170-199): the only caller of `sweepOrphanedChatKeys`, as above.

### Architecture and Layers Affected

- **Store layer** (`src/store/chatGeneration.ts`, `src/store/chats.ts`) — owns the new-chat creation flow, the `/model` request assembly, and the orphaned-key sweep trigger.
- **Hook layer** (`src/pages/chat/hooks/useChatConfiguration.tsx`) — owns the `selectedSkills` component state, the load-on-chat-switch effect, and the save-on-change handler; this is where `SkillOption[]` is the expected shape.
- **Storage utility layer** (`src/utils/chatStorageUtils.ts`, `src/utils/storage.ts`) — shared, untyped localStorage read/write primitives with no runtime shape enforcement; both the store layer and the hook layer write through `saveChatSkills` into the identical key (`chatSkillsKey(chatId)`), which is the point where the two producers' shapes collide.
- **Component layer** (`ChatConfigSkillsSelector.tsx`, `ChatPromptSkillsButton.tsx`, `ChatSkillsSelector.tsx`) — both call `setSelectedSkills`/`handleConfirm` with `SkillOption[]` built from live `Skill` fetch results (`{value, label, description}`); neither component path is the source of the bug — they always produce the correct shape at their own call sites.

### Integration Points

- `chatGenerationStore.createChatGeneration` → `chatsStore.createChat` → `chatsStore.getChat` (internal store-to-store calls, no network shape mismatch here).
- `chatGenerationStore.createChatGeneration` → `saveChatSkills`/`saveChatTools` (from `chatStorageUtils.ts`) — this is the exact seam where a `string[]` (the /model wire shape) enters the same storage slot the hook layer treats as `SkillOption[]`.
- `useChatConfiguration` → `loadChatSkills`/`saveChatSkills` (also from `chatStorageUtils.ts`) — the read/write seam that assumes `SkillOption[]`.
- `chatsStore.getChats()` → `sweepOrphanedChatKeys` — the only invocation of the sweep, fired whenever the chat list is refetched (e.g. on navigating to a page that lists chats).
- `ChatRequest.skill_ids` (`src/types/chatGeneration.ts:81`) is the outbound `/model` payload field; it is `string[] | undefined`, populated from `skillIds` in `createChatGeneration`, independent of whatever is in storage — the 422 arises when a later render reloads `selectedSkills` from the corrupted storage entry (via `loadChatSkills`) and that state is what feeds the *next* `createChatGeneration` call's `skillIds` option.

### Patterns and Conventions

- Guide-mandated layering (`state-management.md`): "Component → Store → API. Never skip layers," and "Never mutate `snap.*` — call store actions instead." `useChatConfiguration` follows this for the store-backed pieces (`assistantsStore`, `chatsStore`) but manages `selectedSkills` as local React state synced to localStorage via plain functions, not a Valtio store — it is a hook-owned cache, not itself a store.
- Storage helpers in this codebase are consistently "fire and forget": every `save*` function in `chatStorageUtils.ts` wraps `storage.put` in `try { } catch { toaster.error(...) }` to swallow `QuotaExceededError`, but none validate the shape of what's written or read. This is the existing convention that a type-safe fix should extend rather than replace (i.e. add a runtime guard/normalizer, not a new storage abstraction).
- `saveChatSkills`'s existing empty-guard (`if (skills.length === 0) return`) is the established "don't write junk" pattern in this file; a shape-validating equivalent (drop non-object / malformed entries before writing, and filter on read) fits the same style as `isDefaultToolsConfig`/`isEmptyChatValue`, which already parse-and-check before acting.
- `SkillOption` type is defined once, in `src/pages/chat/components/ChatConfiguration/ChatConfigSkillsSelector.tsx:26-30` (`{ label: string; value: string; description?: string }`), and re-imported everywhere else that needs it (`useChatConfiguration.tsx`, `ChatPromptSkillsButton.tsx`, `ChatSkillsSelector.tsx`) — it is the de facto canonical shape, not duplicated.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/patterns/state-management.md` — covers Valtio store conventions (loading/error state, `useSnapshot`, debounce cleanup) but does not address hook-managed localStorage caches like `selectedSkills`/`chatSkillsKey`; no guide section specifically documents the chat-skills persistence mechanism, its key scheme, or the orphaned-key sweep.
- No guide file under `.ai-run/guides/` was found describing `chatStorageUtils.ts`, the `sweepOrphanedChatKeys` mechanism, or the new-chat (`isNewChat`/`newChatParams`) lifecycle in `chats.ts`.

### Architectural Decisions

- None found in guides. Inline comments in `chats.ts` explain *why* certain behaviors exist (e.g. line 175-178 explaining `pendingRename` carry-forward, line 345-347 explaining why `premiumModelTipStore.clearPendingDismissals()` runs on every new chat) but nothing documents the `id = ''` placeholder convention or its downstream storage-key implications.
- `src/utils/chatStorageUtils.ts` has no header comment explaining the dual-purpose sweep (existence vs. empty-value); this is derived from reading the function body only.

### Derived Conventions

- The `''` empty-string chat id is a deliberate, code-visible placeholder (`newConversation.id = ''` in `startNewChat`) for the pre-creation state of a new chat, gated by `chatsStore.isNewChat`. Any code keying off `currentChat?.id` truthiness (as `handleSetSelectedSkills`'s `if (chatId && userId)` does) will silently no-op during this window — this is consistent with `handleSetDynamicToolsConfig` and `handleSetHideToolOutputs`, which use the identical `if (chatId && userId)` guard and have the identical blind spot for tools config and hide-tool-outputs, respectively (not fixed by any current code).
- `saveChatSkills`/`saveChatTools` are called from two independent producers (`useChatConfiguration.tsx` for user-driven config-panel edits, `chatGeneration.ts` for the initial skills/tools passed into a brand-new chat's first message) — both funnel into the same storage key via the same function, but only one producer (`chatGeneration.ts`) currently passes the wrong element shape.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/hooks/__tests__/useChatConfiguration.storageGuards.test.ts` — imports `saveChatSkills`/`saveChatTools` re-exported from `useChatConfiguration.tsx` (not the hook itself). Covers only the empty-array/null-config guard and `QuotaExceededError` swallowing for `saveChatSkills` and `saveChatTools`. Test at line 42-45 passes a well-formed `{value, label}` object and asserts the exact object round-trips through `storage.put` — it does **not** cover a bare-string element, nor does it exercise `loadChatSkills`, `handleSetSelectedSkills`, or the reload `useEffect`.
- `src/utils/__tests__/chatStorageUtils.test.ts` — covers `sweepOrphanedChatKeys` (both the empty-value sweep and the existence sweep), `chatHideToolOutputsKey`, `saveChatHideToolOutputs`, `loadChatHideToolOutputs`. Notably: the empty-value sweep tests only exercise `[]` and the default-tools-config object as "empty" — there is no test asserting behavior for a non-empty array of bare strings (the exact shape the bug produces), and no test at all for `chatSkillsKey('')` (the empty-chat-id case) being present or absent from a sweep.
- No test file was found for `useChatConfiguration`'s `loadChatSkills`, `handleSetSelectedSkills`, or the `useEffect` that reloads skills/tools/hideToolOutputs on `currentChat?.id` change.
- No test file was found for `chatGenerationStore.createChatGeneration`'s new-chat branch (the `isNewChat` block at lines 436-451 of `chatGeneration.ts`), i.e. the exact code path where `saveChatSkills(userId, newId, skillIds ?? [])` is called with the wrong element shape.
- No existing test simulates the full navigate-away-and-back regression scenario named in the acceptance criteria (new chat → add skills → send message → navigate to Assistants → return → send another message).

### Testing Framework and Patterns

- Vitest, two projects (`unit`, `integration`) per `AGENTS.md`/`vitest.workspace.ts`. Storage-facing unit tests mock `@/utils/storage` wholesale (`vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn(), getObject: vi.fn(), remove: vi.fn() } }))`) and assert on the mock's call arguments; `chatStorageUtils.test.ts` instead exercises real `localStorage` directly (via jsdom) and clears it in `beforeEach`.
- Both existing test files mock or avoid `chatsStore`/`userStore`/`assistantsStore` entirely (`vi.mock('@/store/chats', () => ({ chatsStore: {} }))` etc.) rather than rendering the hook — they test the pure storage-util functions in isolation, not hook behavior under React lifecycle (no `renderHook`/`@testing-library/react` usage observed in these two files).

### Coverage Gaps

- The exact shape-mismatch bug (string element vs. `SkillOption` object) has zero test coverage on either the write side (`chatGeneration.ts`'s `saveChatSkills` call) or the read side (`loadChatSkills` in `useChatConfiguration.tsx`).
- The `''`-chatId guard bug (`if (chatId && userId)` in `handleSetSelectedSkills`/`handleSetDynamicToolsConfig`/`handleSetHideToolOutputs`) has zero test coverage — no test constructs a `currentChat.id === ''` scenario and asserts on the save behavior.
- `sweepOrphanedChatKeys` has no test for a `chatSkillsKey('')`-keyed entry, i.e. no test proves or disproves the ticket's suspected sweep-deletes-the-temp-entry interaction.
- No integration/regression test exists for the full navigate-away-and-back flow described in the acceptance criteria; `src/pages/chat/hooks/__tests__/` has no file combining `useChatConfiguration` + `chatGenerationStore` + `chatsStore` end to end.

---

## 5. Configuration and Environment

### Environment Variables

None specific to chat-skills persistence were found; this feature is gated by a feature flag, not an env var (see below).

### Configuration Files

- No dedicated config file governs chat-skills storage; behavior is entirely code-defined in `chatStorageUtils.ts` (key names) and `chatGeneration.ts`/`useChatConfiguration.tsx` (read/write call sites).
- The skills feature itself is gated by `useFeatureFlag('skills')`, checked in both `ChatConfigSkillsSelector.tsx` (line 33) and `ChatPromptSkillsButton.tsx` (line 31) — if the flag is off, both UI entry points render `null`, but this does not affect already-stored/loaded skill data or the storage read/write functions themselves.

### Feature Flags and Deployment Concerns

- `FEATURE_FLAGS`/`useFeatureFlag` mechanism (`@/hooks/useFeatureFlags`) controls only UI visibility of the skills selectors, not the storage or request-building code paths — `loadChatSkills`/`saveChatSkills`/`createChatGeneration`'s skill handling run regardless of the flag's value, so a fix in the storage/request layer is not flag-dependent.

---

## 6. Risk Indicators

- **Confirmed root cause, not merely suspected**: `saveChatSkills(userId, newId, skillIds ?? [])` at `src/store/chatGeneration.ts:444` writes a `string[]` into the same key that `loadChatSkills` at `src/pages/chat/hooks/useChatConfiguration.tsx:47-49` reads back as `SkillOption[]`. Neither `saveChatSkills` (`chatStorageUtils.ts:49-56`) nor `storage.put`/`storage.get` (`storage.ts`) performs any shape validation, so the corrupted write is silently accepted and silently misread.
- **Confirmed second bug**: `startNewChat` (`src/store/chats.ts:342`) sets `newConversation.id = ''`; `handleSetSelectedSkills`'s guard `if (chatId && userId)` (`useChatConfiguration.tsx:122`) treats `''` as falsy, so any skills a user picks before the first message creates the real chat are never persisted via that path — they only reach storage via the *other* producer (`chatGeneration.ts`'s new-chat branch), which is the one with the shape bug. The same guard pattern is duplicated in `handleSetDynamicToolsConfig` (line 98) and `handleSetHideToolOutputs` (line 110) — a fix that changes the guard shape should consider all three call sites for consistency, though only skills is in scope per the ticket.
- **Sweep interaction is plausible but unconfirmed by any test**: `sweepOrphanedChatKeys` only runs from `chatsStore.getChats()` (`chats.ts:190-193`), not from `startNewChat`/`createChat` — so it would only race a `''`-keyed entry if `getChats()` happens to run while a chat is still in the `isNewChat`/`''`-id state (e.g. background chat-list refresh while composing a first message). No existing test constructs this scenario in either direction.
- **No runtime shape guard anywhere in the read path**: `loadChatSkills` casts `storage.get<SkillOption>(...)` with a generic type parameter that has zero runtime effect — a malformed/legacy entry (bare strings, or partially-shaped objects) will flow straight into `selectedSkills` state and then into the next `/model` request's `skillIds`, which is exactly the `skill_ids: [null]` symptom in the ticket. This is the layer where "excludes it gracefully if no longer available" (an acceptance criterion) is not currently implemented at all — there is no cross-check against `useChatConfigSkills`'s live fetched skill list before persisting/loading selected skills.
- **Duplicate storage helper modules**: `src/utils/storage.ts` and `src/utils/storage/index.ts` implement the same `get`/`put`/`getObject`/`remove`/`compoundKey` functions independently; `chatStorageUtils.ts` uses the flat-file version. Any fix touching "the storage layer" must confirm which module is actually imported at each call site to avoid patching the unused twin.
- **Zero existing test coverage for the exact bug paths** named in section 4 — the storage-guard test only proves well-formed objects round-trip; nothing proves or would catch a regression of the string-vs-object shape mismatch, the `''`-guard skip, or the sweep race.
- **Speculative**: A full fix will likely need to (a) normalize/validate skill entries at the `saveChatSkills`/`loadChatSkills` boundary so either producer's shape is coerced to `SkillOption[]` before it reaches component state, and (b) change the `if (chatId && userId)` truthiness checks to distinguish "no chat yet" from "chat id is the empty-string placeholder" only if the new-chat skill-picking scenario is confirmed still broken after re-verifying against the current `isNewChat` flow. This is a design decision for the spec/plan stage, not a discovered requirement — the current code review only establishes that the guard *would* skip persistence for `''`; whether that is actually the correct behavior (since `chatGeneration.ts`'s own new-chat branch already persists skills once the real id exists) needs spec-level reasoning, not assumption.

---

## 7. Summary for Complexity Assessment

The change is contained to three layers already wired together for this exact feature: the store layer's new-chat branch in `src/store/chatGeneration.ts` (one call site, line 444), the hook layer's read/write/guard logic in `src/pages/chat/hooks/useChatConfiguration.tsx` (`loadChatSkills`, `handleSetSelectedSkills`, and possibly the sibling tools/hideToolOutputs guards for consistency), and the shared storage utility `src/utils/chatStorageUtils.ts` (`saveChatSkills`, and potentially `sweepOrphanedChatKeys`/`isEmptyChatValue` if the empty-value sweep needs to recognize a bare-string array as invalid, not just empty). No new files, stores, or components are required by anything found in the code — the fix is a shape-normalization/validation problem at an existing, well-defined seam, not a new feature.

Technical novelty is low: the codebase already has an established pattern for guarding on/validating storage content (`isDefaultToolsConfig`, `isEmptyChatValue`, the empty-array guard in `saveChatSkills`) that a shape-validating equivalent for skill entries can follow directly. The primary risk is not novelty but precision — three interacting bugs (the shape mismatch, the `''`-guard skip, and the unconfirmed sweep race) must each be verified against current code (which this document does, by direct read of `chatGeneration.ts:416-451`, `useChatConfiguration.tsx:92-198`, and `chats.ts:329-389`) before deciding which are real, since the ticket itself flags two of the three as "suspected" and notes a previous fix attempt was reverted.

Test coverage posture is the most significant risk factor: none of the three suspected bugs has any existing regression test, and the acceptance criteria explicitly require a new integration-style regression test (new chat → add skills → send message → navigate to Assistants → return → send another message) that has no existing scaffold to extend — `src/pages/chat/hooks/__tests__/` currently only has isolated, heavily-mocked unit tests for the storage-util functions, not a hook-level or cross-store integration test. Building that regression test, plus validating the fix against the untested `''`-chatId and sweep-race paths, is where most of the implementation effort will land, more than the fix itself.

---

## 8. External References

None named by the task.
