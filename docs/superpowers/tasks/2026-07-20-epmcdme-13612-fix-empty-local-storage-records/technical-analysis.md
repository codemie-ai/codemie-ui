# Technical Research

**Task**: localStorage chat-skills chat-tools-config quota storage hooks
**Generated**: 2026-07-20T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

Fix EPMCDME-13612: Many empty records saved in local storage, causing browser storage quota to be exceeded. CodeMie stores many empty records in browser local storage. The issue is that many `_chat-skills-*` and `_chat-tools-config-*` keys with empty array values (`[]`) are written to localStorage, eventually causing QuotaExceededError when the app tries to write additional chat-related data. The keys look like: `9aace8aa-5797-473b-b758-648cdacfd0b1_chat-tools-config-0a36e010-f706-4275-968c-b665821eca76` and `9aace8aa-5797-473b-b758-648cdacfd0b1_chat-skills-0a36e010-f706-4275-968c-b665821eca76`. The root cause must be identified: where are these empty [] values being written to localStorage, what triggers this, and why doesn't the code guard against writing empty arrays. Also check if there is any cleanup/migration logic for these keys.

---

## 2. Codebase Findings

### Existing Implementations

**Primary write sites (root cause):**

- `src/store/chatGeneration.ts` lines 302–308 — **primary bug location**. Inside `createChatGeneration`, when `isNewChat` is true, unconditionally writes both keys for every new chat before delegating to the API call:
  ```
  storage.put(userId, `chat-tools-config-${newId}`, dynamicToolsConfig ?? { enableWebSearch: null, enableCodeInterpreter: null })
  storage.put(userId, `chat-skills-${newId}`, skillIds ?? [])
  ```
  When `skillIds` is `undefined` (e.g. from `useChatInitialPrompt` which omits the field), `undefined ?? []` evaluates to `[]` and writes `"[]"`. When callers pass an explicitly empty array (e.g. `ChatPrompt` with no skills selected: `selectedSkills.map(s => s.value)` on an empty array), `[] ?? []` also evaluates to `[]` — the nullish coalescing operator provides no protection against an explicitly passed empty array.

- `src/pages/chat/hooks/useChatConfiguration.tsx` — defines `CHAT_TOOLS_CONFIG_KEY = 'chat-tools-config'` and `CHAT_SKILLS_KEY = 'chat-skills'` constants; `saveChatSkills` (lines 103–107) and `saveChatTools` (lines 91–95) call `storage.put` whenever invoked; both are guarded by `if (chatId && userId)` (only skips writes when chatId is empty string), so a user deselecting all skills on an existing chat writes `"[]"` freely.

**Storage utilities (no guards):**

- `src/utils/storage.ts` — shared localStorage wrapper exposing `get`, `put`, `getObject`, `remove`. Key scheme: `${userId}_${baseKey}`. The `put` function calls `localStorage.setItem(compoundKey(userId, key), JSON.stringify(value))` with no guard against empty arrays, null-only objects, or quota errors.
- `src/utils/storage/index.ts` — functionally identical duplicate of `storage.ts`; same absence of guards.

**Callsites that trigger writes via chatGeneration.ts:**

- `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` — passes `skillIds: selectedSkills.map(s => s.value)` (empty array when no skills selected) and `dynamicToolsConfig` to `createChatGeneration`.
- `src/pages/chat/hooks/useChatInitialPrompt.tsx` — calls `createChatGeneration` without `skillIds` or `dynamicToolsConfig` (both `undefined`, triggering the `?? []` and `?? { ... }` fallbacks).
- `src/pages/chat/components/ChatHistory/ChatUserMessage/ChatUserMessage.tsx` — calls `createChatGeneration` with `skillIds: selectedSkills.map(s => s.value)` but omits `dynamicToolsConfig`.

**Deletion without cleanup:**

- `src/store/chats.ts` — `deleteChat` (line 384), `deleteAllConversations` (line 418), `deleteChatFolder` (line 461): all remove the chat from API and in-memory state but **none call `storage.remove`** for the corresponding `chat-skills-{chatId}` or `chat-tools-config-{chatId}` keys. Orphaned entries accumulate indefinitely as users create and delete chats.

**Context wiring:**

- `src/pages/chat/hooks/useChatContext.tsx` — bridges `useChatConfiguration` result into React context.
- `src/pages/chat/ChatPage.tsx` — mounts `ChatContext.Provider` with `useChatConfiguration()` result.

**Only safe localStorage writer in app:**

- `src/utils/customAppearance/storage.ts` — sole localStorage utility that wraps `setItem` in a try/catch for `QuotaExceededError`; unrelated to chat keys; shows the pattern that is absent everywhere else.

### Architecture and Layers Affected

- **Store layer** (`src/store/`): `chatGeneration.ts` is the primary write site; `chats.ts` owns deletion and is missing cleanup calls.
- **Hook layer** (`src/pages/chat/hooks/`): `useChatConfiguration.tsx` performs per-action saves on every skill/tool change.
- **Component layer** (`src/pages/chat/components/`): `ChatPrompt`, `ChatUserMessage`, and `useChatInitialPrompt` are the three callsites that invoke `createChatGeneration` and determine what values flow into the writes.
- **Utility layer** (`src/utils/`): `storage.ts` and `storage/index.ts` are the raw write primitives; both lack guards.

### Integration Points

- `chatGenerationStore.createChatGeneration` → `chatsStore.createChat` (gets `newId`) → `storage.put` (writes both keys with `newId`)
- `useChatConfiguration` → `storage.put` (per-action saves on skill/tool change)
- `chatsStore.deleteChat` / `deleteAllConversations` / `deleteChatFolder` — missing → `storage.remove` links (the absent cleanup)
- `storage.remove` is present in the utility module and is used only in `src/utils/filters.ts` line 232 (filter state, unrelated); proves the API is available but never wired to chat deletion.

### Patterns and Conventions

- Key construction: `${userId}_${prefix}-${chatId}` — compound key assembled by the caller before passing to `storage.put`; the storage utility uses `compoundKey(userId, key)` internally to namespace by user.
- Load guard exists, write guard does not: `useChatConfiguration.tsx` line 171 guards the **load** path behind `if (currentChat?.history.length)` (skips loading for brand-new chats), but the **write** path in both `useChatConfiguration.tsx` and `chatGeneration.ts` has no equivalent guard for empty/default values.
- State management: valtio proxy stores (`chatGenerationStore`, `chatsStore`); hooks use React `useState`/`useCallback`/`useEffect`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` — covers layered architecture; localStorage is not in the Cross-Cutting Concerns section; no documented quota strategy or eviction policy.
- `.ai-run/guides/patterns/state-management.md` — store patterns guide; no mention of localStorage eviction or empty-value guards.
- `.ai-run/guides/patterns/custom-hooks.md` — hook conventions; no mention of localStorage hygiene.
- `.ai-run/guides/development/performance-patterns.md` — performance guide; no mention of storage quota.

### Architectural Decisions

No ADR or design document covers the per-chat localStorage persistence strategy for `chat-skills` or `chat-tools-config`. The task directory `docs/superpowers/tasks/2026-07-20-epmcdme-13612-fix-empty-local-storage-records/` exists with only `.state.json`; no spec or plan has been written yet. No prior related decision recorded in guides or inline comments in the relevant files.

### Derived Conventions

- localStorage is accessed exclusively through two thin utility modules: `src/utils/storage.ts` (older, used by most of the app) and `src/utils/storage/index.ts` (newer, with JSDoc; functionally identical). All new writes should go through one of these, not directly via `localStorage.setItem`.
- The `put` helper writes whatever value it is given — callers are responsible for guarding against empty/default values before calling `put`.
- The accepted pattern for quota-safe writes is shown in `src/utils/customAppearance/storage.ts`: wrap `setItem` in try/catch and silently handle the `QuotaExceededError`.
- `storage.remove(userId, key)` is the correct eviction API; it exists but is not wired to any chat-lifecycle event.

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/chatGeneration.test.ts` — tests `chatGenerationStore` (MCP auth flows, thought merging, `stopChatGeneration`). Does NOT cover the `isNewChat` branch in `createChatGeneration` where `storage.put` writes both per-chat keys. Storage module is not mocked or asserted here.
- `src/store/__tests__/chatGeneration.prepareRequestData.test.ts` — tests `_prepareRequestData`; mocks `@/utils/storage` with `vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn() } }))` but never asserts on storage writes. Serves as the reference pattern for mocking the storage module.
- `src/store/__tests__/chatGeneration.resumeWorkflowExecution.test.ts` — also mocks `@/utils/storage` (same pattern) but makes no storage assertions.
- `src/pages/chat/components/ChatConfiguration/__tests__/ChatConfiguration.test.tsx` — tests sidebar open/close UI only; does not exercise `useChatConfiguration`'s save or load logic.
- `src/pages/chat/hooks/__tests__/useAssistantFeatures.test.ts` — tests feature flags per assistant type; no localStorage involvement.
- `src/hooks/__tests__/useSearchHistory.test.ts` — tests `useSearchHistory` with real localStorage mock; uses `localStorage.clear()` in `beforeEach` and asserts on `localStorage.getItem` directly. Best existing model for testing a localStorage-backed hook end-to-end.
- `src/utils/customAppearance/__tests__/storage.test.ts` — tests appearance storage; includes `QuotaExceededError` simulation via `vi.spyOn(global.localStorage, 'setItem').mockImplementation(() => { throw new Error('quota exceeded') })`. Only place in the project that tests storage quota error handling — provides the pattern to reuse.

### Testing Framework and Patterns

- Vitest 1.6.1, jsdom environment; configured in `vite.config.ts` under the `test:` key.
- `@testing-library/react` 16.3.0, `@testing-library/jest-dom` 6.6.3, `@testing-library/user-event` 14.6.1.
- Coverage via `@vitest/coverage-istanbul` 1.6.1.
- Global localStorage mock in `src/setupTests.tsx` lines 57–77: in-memory `store: Record<string, string>` installed via `Object.defineProperty(global, 'localStorage', ...)`.
- Per-test reset: `localStorage.clear()` in `beforeEach`.
- Module mock pattern: `vi.mock('@/utils/storage', () => ({ default: { put: vi.fn(), get: vi.fn() } }))` for unit tests that must not touch real storage.
- Spy-based quota simulation: `vi.spyOn(global.localStorage, 'setItem').mockImplementation(() => { throw ... })` from `customAppearance/storage.test.ts`.

### Coverage Gaps

- `src/utils/storage.ts` — the shared `put`/`get`/`getObject`/`remove` utility has no test file at all; no coverage for the `QuotaExceededError` path.
- `src/pages/chat/hooks/useChatConfiguration.tsx` — `useChatConfiguration` hook has no test file; `saveChatSkills`, `saveChatTools`, `loadChatSkills`, `loadChatTools` are completely untested.
- `src/store/chatGeneration.ts` `isNewChat` branch (lines 297–311) — the two `storage.put` calls for the per-chat keys are never exercised by any test; no test verifies the `skillIds ?? []` empty-array path.
- No test covers the absence of `storage.remove` on chat deletion — this is the direct cause of key accumulation and is a gap both in code and in tests.
- No test covers a startup migration or pruning scan for orphaned chat keys.

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — backend API base URL
- `VITE_ENV` — environment name (local/dev/prod)
- `VITE_IS_ENTERPRISE_EDITION` — enterprise edition flag
- `VITE_SHOW_ALL_PROJECTS` — project visibility toggle
- None of these govern localStorage behavior or storage quotas.

### Configuration Files

- `src/utils/storage.ts` — defines the key namespacing scheme `${userId}_${key}`; no size limits or cleanup config.
- `src/utils/storage/index.ts` — duplicate; same absence of configuration.
- `vite.config.ts` — test configuration (`test:` key with vitest settings); no storage-related configuration.

### Feature Flags and Deployment Concerns

- No feature flags gate or control localStorage writes for `chat-skills` or `chat-tools-config` keys. The feature flag system (`src/utils/featureFlags.ts`) covers: `mcpConnect`, `features:favorites`, `features:pinnedAssistants`, `features:favoritesPage`, `features:requestHedging`, `features:teamsBotIntegration`, `features:costCenters`, `features:generatedAssistantIcons` — none relate to chat configuration storage.
- No deployment manifests or CI/CD config reference localStorage storage limits.
- No secrets or environment-specific configuration affects this domain.

---

## 6. Risk Indicators

- **No cleanup on chat deletion**: `chatsStore.deleteChat`, `deleteAllConversations`, and `deleteChatFolder` in `src/store/chats.ts` never call `storage.remove` for `chat-skills-{chatId}` or `chat-tools-config-{chatId}`. Every chat ever created leaves two orphaned localStorage entries. This is the accumulation mechanism.
- **Write guard missing, load guard present**: `useChatConfiguration.tsx` line 171 guards loads behind `history.length > 0`, but both `saveChatSkills` (lines 103–107) and `saveChatTools` (lines 91–95) have no empty-value guard. The asymmetry suggests the load guard was added deliberately but the corresponding write guard was never implemented.
- **`?? []` does not guard against explicit empty array**: `chatGeneration.ts` line 308 uses `skillIds ?? []`, which only protects against `undefined`/`null`. All three callsites (`ChatPrompt`, `ChatUserMessage`, `useChatInitialPrompt`) can pass an explicit `[]` when no skills are selected, which writes `"[]"` unconditionally.
- **Two storage utilities diverged**: `src/utils/storage.ts` and `src/utils/storage/index.ts` are functional duplicates. Any fix applied to one must be applied to the other, or the duplicate should be consolidated. Failure to do so would leave one write path unpatched.
- **No `QuotaExceededError` handling in chat paths**: `storage.put` / `storage.ts::put` call `localStorage.setItem` with no try/catch. If the quota is already exceeded, any further chat write (including non-empty, legitimate data) will throw an unhandled exception. Only `customAppearance/storage.ts` has a safe pattern.
- **No startup migration or pruning logic**: There is no code that scans existing localStorage keys to evict orphaned `chat-skills-*` or `chat-tools-config-*` entries. Users who already have quota-exhausting key counts will not be automatically healed by a code fix alone — a one-time migration sweep is needed.
- **No test coverage for the exact bug path**: The `isNewChat` branch in `chatGeneration.ts` that writes both keys is never tested. `useChatConfiguration`'s save functions are never tested. This means the fix will need new tests from scratch; no existing test can be extended.
- **Three independent callsites call `createChatGeneration`**: `ChatPrompt`, `ChatUserMessage`, and `useChatInitialPrompt` all invoke `createChatGeneration` with varying completeness. A fix at the `chatGeneration.ts` write site covers all three, but any callsite-level guard must be applied in all three places.

---

## 7. Summary for Complexity Assessment

The bug touches three architectural layers: the store layer (`src/store/chatGeneration.ts` and `src/store/chats.ts`), the hook layer (`src/pages/chat/hooks/useChatConfiguration.tsx`), and the utility layer (`src/utils/storage.ts` and its duplicate `src/utils/storage/index.ts`). The likely file change surface is 3–5 files for the core fix: `chatGeneration.ts` (add empty-value guard before writing), `chats.ts` (add `storage.remove` calls in the three deletion functions), `useChatConfiguration.tsx` (add skip-if-empty guards in `saveChatSkills` and `saveChatTools`), and optionally wrapping `storage.ts::put` in a try/catch for quota safety. A sixth file — a startup migration utility — is likely needed to sweep and evict orphaned keys for users already affected.

The fix follows established patterns in the codebase: `storage.remove` already exists and is called in `src/utils/filters.ts`; the quota-safe try/catch pattern already exists in `src/utils/customAppearance/storage.ts`; and the `vi.mock('@/utils/storage', ...)` pattern already exists in `chatGeneration.prepareRequestData.test.ts`. No novel patterns need to be introduced. The main design decision is where to place the empty-value guard: at the write sites (callers check before calling `storage.put`) versus in `storage.ts::put` itself (centralized, guards all callers). Centralizing in `storage.ts` is lower risk but changes behavior globally; guarding at call sites is more targeted. The duplicate `storage/index.ts` must be addressed alongside whichever approach is taken.

Test coverage posture is poor for the affected area: there are zero tests for `useChatConfiguration`'s save/load functions, zero tests for the `isNewChat` branch in `chatGeneration.ts`, and zero tests for `storage.ts` itself. New tests must be written from scratch. Key risks are: (1) the duplicate `storage.ts` / `storage/index.ts` — a fix applied to only one leaves the other unpatched; (2) the need for a backward-compatible migration to clear existing orphaned keys for already-affected users; and (3) the `?? []` operator pattern being misleading — it will continue to fail silently if callers pass explicit empty arrays unless the guard logic is changed to check `Array.isArray(value) && value.length === 0`.
