# Technical Research

**Task**: prompt box chat input navigation state preservation
**Generated**: 2026-07-13T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-9922: preserve the prompt box / chat input content across navigation. The branch is named EPMCDME-9922_preserve_prompt_box, suggesting the task is to preserve the user's typed prompt text (and possibly attachments/settings) in the prompt/chat input box when the user navigates away from the chat page and comes back.

---

## 2. Codebase Findings

### Existing Implementations

**Prompt box component:**
- `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` — The prompt box component. Owns all local state: `prompt` (`{ message: string; messageRaw: string }`) and `files: FileMetadata[]`. Neither is persisted anywhere. Both are cleared on submit.
- `src/components/Editor/Editor.tsx` — The Quill-based rich-text editor rendered inside `ChatPrompt`. Controlled: receives `value` prop, calls `onChange`. On `onLoad`, initializes Quill DOM from `value.messageRaw`. Actively clears Quill DOM whenever `value.messageRaw === ''` via `useEffect`.

**Chat page entry points:**
- `src/pages/chat/ChatPage.tsx` — Main chat page. Renders `<PageLayout key={currentChat?.id}>` which contains the `ChatPrompt` subtree. The `key={currentChat?.id}` forces full unmount + remount on every chat switch. When navigating to a non-chat route, `ChatPage` is unmounted entirely by React Router's `<Outlet />` rendering.
- `src/pages/chat/SharedChatPage.tsx` — Read-only shared chat view; does not render `ChatPrompt`.

**Chat hooks adjacent to the prompt box:**
- `src/pages/chat/hooks/useChatNavigation.tsx` — Redirects to last/first chat when no `:id` param is present. Uses `router.replace` / `router.push` via the Vue-router adapter.
- `src/pages/chat/hooks/useChatInitialPrompt.tsx` — Reads `?prompt=` query param, auto-submits it once the chat is ready, then clears the param with `setSearchParams`. This is a one-shot seeding mechanism, not a draft round-trip.
- `src/pages/chat/hooks/useChatConfiguration.tsx` — The most relevant reference implementation. Persists and restores `selectedSkills` and `dynamicToolsConfig` per chat in `localStorage` using the pattern `storage.put(userId, 'chat-tools-config-${chatId}', value)`. Loads in a `useEffect([currentChat?.id])`.

**State stores:**
- `src/store/chats.ts` — Valtio `proxy` store. Holds `currentChat`, `openedChatsHistory`, `isNewChat`, `newChatParams`. Persists last-chat-id to `localStorage` on every `getChat()` call.
- `src/store/chatGeneration.ts` — Valtio `proxy` store. Handles streaming generation lifecycle, MCP auth flow, workflow resumption.
- `src/store/files.ts` — Valtio `proxy` store for file API operations (upload, download). Does NOT hold prompt attachment list state.

**Storage utilities:**
- `src/utils/storage.ts` — Older default-export object `{ get, put, getObject, remove }`. Keys namespaced as `${userId}_${key}`.
- `src/utils/storage/index.ts` — Newer named-export version with identical API and key scheme. Both are in active use.

**Unsaved changes infrastructure (exists, not wired to ChatPrompt):**
- `src/hooks/useUnsavedChangesWarning.tsx` — `UnsavedChangesProvider` + `useUnsavedChanges` hook. Registers dirty-check callbacks and blocks navigation with a confirmation dialog. Currently used only by form-level edit/create pages; not wired to the chat prompt box.
- `src/components/appLevel/UnsavedChangesPopup.tsx` — Uses React Router's `useBlocker` and `window.beforeunload` to intercept navigation when any dirty check is active.

**Router:**
- `src/router.tsx` — `createBrowserRouter` (React Router v7). Chat routes: `chats` (no `:id`) and `chats/:id`, both rendering `ChatPage`.
- `src/hooks/useVueRouter.tsx` — Custom Vue-router-shaped adapter wrapping React Router's `useLocation`, `useParams`, and `hashRouter.navigate`. All navigation in the chat domain uses this adapter.

### Architecture and Layers Affected

| Layer | Component / File | How It Is Affected |
|---|---|---|
| UI / Presentation | `ChatPrompt.tsx`, `Editor.tsx` | State initialization must change to accept an externally restored value; reset-on-submit must also clear the persisted draft |
| UI / Presentation | `ChatPage.tsx` | `key={currentChat?.id}` on `PageLayout` is the mechanical root cause of remounting; may need to be scoped or removed |
| State / Hooks | `useChatConfiguration.tsx` | Direct reference implementation for the save-on-change / load-on-chat-switch pattern; a new `useChatPromptDraft` hook would mirror this |
| State / Persistence | `src/utils/storage.ts` / `storage/index.ts` | Already-established localStorage primitives; will be used for read/write of draft content |
| State / Valtio | `chatsStore` | Provides `currentChat?.id` and `isNewChat` flags needed to scope draft keys and guard against storing drafts for unsaved new chats |
| Routing | React Router v6 / `useVueRouter` | Navigation events trigger the remount that destroys state; no changes needed in the router itself, but the architecture of state lift must account for route changes |

### Integration Points

**Internal dependencies that the implementation must interact with:**
- `useSnapshot(chatsStore)` inside `ChatPrompt` — provides `currentChat?.id` for keying drafts.
- `useSnapshot(userStore)` — provides `userId` for storage key namespacing (`${userId}_chat-prompt-draft-${chatId}`).
- `storage.put` / `storage.getObject` (`src/utils/storage/index.ts`) — the write/read primitives for persistence.
- `chatGenerationStore.createChatGeneration()` — the submit path that must also clear the draft after a successful send.
- `filesStore.uploadFiles()` — called by `useFileUpload` to upload files. File metadata (`FileMetadata[]`) must also be considered for draft persistence (though files already uploaded to the server have a `fileId` that could be restored).

**Cross-cutting concerns:**
- `useChatInitialPrompt` — reads `?prompt=` and auto-submits. If both a `?prompt=` query param and a stored draft exist simultaneously, the implementation must define priority (the query param likely takes precedence and should clear the draft).
- `UnsavedChangesProvider` — already in `App.tsx:57`. Not recommended for this task; silent restoration matches the existing skills/tools pattern better.

### Patterns and Conventions

1. **Per-user per-chat `localStorage` key pattern** (established by `useChatConfiguration.tsx`):
   - Key format: `${userId}_chat-<domain>-${chatId}`
   - Write: `storage.put(userId, key, value)` on every relevant state change (optionally debounced)
   - Read: `storage.getObject<T>(userId, key)` inside `useEffect([currentChat?.id])`
   - Clear: `storage.remove(userId, key)` on submit / chat deletion

2. **Controlled `Editor` component initialization** (`Editor.tsx:171–177`):
   - Quill DOM is initialized from `value.messageRaw` inside the `onLoad` callback.
   - Any restored draft must be present in the `prompt` state before the component mounts (i.e., set as initial `useState` value or applied in a first `useEffect` before Quill's `onLoad` fires).

3. **Valtio `useSnapshot` subscription** — all store reads in components use `useSnapshot(store)` for reactivity. New Valtio store properties (if added to `chatsStore` or a new store) follow this convention.

4. **React hooks location convention**: Global hooks live in `src/hooks/`; page-scoped hooks live in `src/pages/<page>/hooks/`. A `useChatPromptDraft` hook serving only `ChatPage` would go in `src/pages/chat/hooks/`.

---

## 3. Documentation Findings

### Guides and Architecture Docs

The following guides under `src/.ai-run/guides/` (the project guide directory) are relevant:

- `.ai-run/guides/architecture/architecture.md` — Documents `UnsavedChangesProvider + useUnsavedChangesWarning` as the cross-cutting mechanism for unsaved state. Lists `storage` utility (user-scoped localStorage) as the persistence mechanism for per-user data.
- `.ai-run/guides/architecture/routing-patterns.md` — Documents hash-based routing with React Router v7. Explicitly states that `useSearchParams` Variant B (`@/hooks/useSearchParams`) persists state to `sessionStorage` keyed by pathname; Variant A (native react-router) is labeled "one-shot params that do not need persistence." This is the hook used by `useChatInitialPrompt`.
- `.ai-run/guides/patterns/custom-hooks.md` — Defines hook naming and location rules. No chat-input-specific hook exists yet.
- `.ai-run/guides/development/performance-patterns.md` — Documents conditional unmount vs CSS-hide as a known tension. Relevant because `ChatPrompt` unmounts on navigation.

No guide file explicitly documents the chat input state lifecycle, the `key={currentChat?.id}` remount pattern, or navigation state preservation in the chat domain.

### Architectural Decisions

- **ADR (implicit): `key={currentChat?.id}` on `PageLayout`** — This forces a clean Quill editor instance on every chat switch, preventing cross-chat state bleed. The decision trades off isolation for persistence. The implementation must decide whether to preserve this key (and use external storage) or remove it for `ChatPrompt` specifically (and rely on component-level state with an effect-based load).
- **ADR (implicit): Prompt state is ephemeral by design** — No storage key, no store property, and no comment documenting intentional non-persistence suggests the original implementation simply did not consider draft preservation. This is a greenfield addition within an existing component.
- **ADR (implicit): `useChatInitialPrompt` uses `?prompt=` for one-shot injection** — Explicitly noted in the routing guide as a non-persistence pattern. The draft-preservation feature must not collide with this mechanism.

### Derived Conventions

- **Silent restoration over navigation blocking** — Skills and tools config are silently restored on chat switch. The prompt draft should follow the same pattern rather than blocking navigation with an unsaved-changes dialog.
- **`localStorage` over `sessionStorage` for cross-session persistence** — All per-chat domain data (skills, tools config, last-chat-id, recent chats) uses `localStorage`. The prompt draft should too, so it survives a browser refresh or returning hours later.
- **userId-scoped keys** — Every key that persists user-facing data (as opposed to purely local UI preferences like sidebar width) is prefixed with `${userId}_`. The prompt draft must follow this convention.
- **Clear on successful submit** — Skills and tools config are not cleared on submit (they persist intentionally). Prompt draft is different: once sent, it should be cleared. This is analogous to `useChatInitialPrompt` clearing the `?prompt=` param after firing.

---

## 4. Testing Landscape

### Existing Coverage

**`ChatPrompt` component tests:**
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` — Covers: stop-generation button visibility; stop button click delegation to `chatGenerationStore.stopChatGeneration`. Does NOT cover: prompt text state, file attachment state, clearing or preserving state on navigation.
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptLlmSelector.test.tsx` — Covers: keyboard navigation in the model selector dropdown; updating `llmModel` via `updateChat`.

**`ChatPage` test:**
- `src/pages/chat/__tests__/ChatPage.test.tsx` — Covers: chat loading on mount, auth callback wiring, composer visibility for workflow vs normal chats. `useChatNavigation` and `useChatInitialPrompt` are fully mocked.

**Hooks:**
- `src/pages/chat/hooks/__tests__/useAssistantFeatures.test.ts` — Covers feature flag derivation from assistantData type.

**No tests exist for:**
- `useChatNavigation`
- `useChatInitialPrompt`
- `useChatConfiguration` (the reference pattern for this feature)
- Prompt text or file state lifecycle in `ChatPrompt`

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 with two projects (`unit` and `integration`) defined in `vitest.workspace.ts`.
- **Libraries**: `@testing-library/react` 16.3, `@testing-library/user-event` 14.6, `@testing-library/jest-dom` 6.6.
- **Unit pattern**: `vi.hoisted()` + per-store `vi.mock` with object literals. `useSnapshot` replaced with `(store) => store`. Stores are plain objects.
- **Integration pattern**: `renderPage(path)` wraps real `createMemoryRouter` + full route config; `mockAPI(method, url, data)` registers fetch overrides. Real Valtio proxy reactivity.
- **Reference unit test to model new tests on**: `ChatPrompt.test.tsx` (same directory as the component under test).
- **Reference integration test to model navigation tests on**: `src/utils/__tests__/navigateBack.integration.test.ts` and `src/pages/assistants/__tests__/AssistantDetailsPage.integration.test.tsx`.

### Coverage Gaps

The following areas have zero existing test coverage and will need new tests:

1. **Prompt text persistence across chat switch** — no test verifies that text typed in `ChatPrompt` survives navigation to another chat and back. Needs both a unit test (new hook logic) and an integration test (navigate away → navigate back → content restored).
2. **File attachment list persistence** — `files: FileMetadata[]` state is equally ephemeral; no test exercises its lifecycle across chat navigation.
3. **Draft cleared on submit** — a unit test must verify that sending a message also clears the `localStorage` draft key (not just the component state).
4. **`useChatInitialPrompt` interaction** — no test verifies that a stored draft is not applied when a `?prompt=` query param is present (or vice versa). Completely untested hook.
5. **`useChatConfiguration` pattern** — the reference implementation has zero tests. While not required for this task, the new `useChatPromptDraft` hook should not inherit the same coverage gap.
6. **`Editor` value synchronization timing** — `Editor.tsx` clears Quill when `value.messageRaw === ''`. A unit test must confirm that a restored draft is set before the clear-effect fires.

---

## 5. Configuration and Environment

### Environment Variables

No `VITE_` environment variable gates, configures, or references chat/prompt input behavior. Relevant env vars are:

- `VITE_CHATBOT_ASSISTANT_SLUG` — resolves the default assistant in `assistantsStore.getDefaultAssistant()`; affects `assistantId` in the generation request payload but not prompt input state.
- `VITE_API_URL=/api` — base URL for all API calls including `v1/files/bulk` (file upload).

No feature flags (loaded from `v1/config` into `appInfoStore.configs`) currently gate any aspect of the chat prompt input.

### Configuration Files

- `vite.config.ts` — Vite build config. Module federation remote `angular-upgrade-app` is currently an empty string. No bundler-level state management configuration. Vitest runs in `jsdom` environment.
- `.env` — Local development env vars (see above). No chat-input-specific values.
- `tsconfig.json` — Standard TypeScript config. No relevance to state management choices.
- `vitest.workspace.ts` — Defines `unit` and `integration` test projects. New tests for this feature should go in the `unit` project (hook logic) and `integration` project (navigation round-trip).

### Feature Flags and Deployment Concerns

- No feature flags currently gate the prompt box or its state lifecycle.
- Module Federation: the app is federated but the remote (`angular-upgrade-app`) is empty. No deployment concern for this feature.
- The `localStorage` keys added by this feature will persist in users' browsers until explicitly cleared. Key naming must be stable and versioned if the stored schema changes. The existing project convention is not to version keys — they are simply overwritten. This is acceptable for a string draft.
- If a user's stored draft contains Quill delta HTML, the schema should be treated as opaque and validated on read (return empty string if malformed) to avoid rendering crashes after a schema change.

---

## 6. Risk Indicators

- **Root cause is structural, not incidental**: `ChatPage.tsx:73` uses `key={currentChat?.id}` on `PageLayout`, which is the primary architectural mechanism destroying `ChatPrompt` state. Any implementation must either work around this (external persistence) or change it (lift `ChatPrompt` above `PageLayout`). Changing the key is riskier because the key was likely added intentionally to prevent Quill editor state bleed between chats.

- **`Editor.tsx` clear-on-empty timing**: The Quill DOM is actively cleared by a `useEffect` whenever `value.messageRaw === ''` (`Editor.tsx:135–143`). Restoring a draft by setting state in a subsequent `useEffect` after mount could race with this clear. Initial `useState` value or synchronous initialization before the empty-check effect fires is required.

- **`useChatInitialPrompt` collision**: This hook auto-submits on `?prompt=` query param. If a stored draft exists at the same time (e.g., user was mid-typing, then opened a deep link), there is no defined behavior. The implementation must explicitly decide priority and add a guard.

- **New chat edge case**: `chatsStore.isNewChat` is `true` while the conversation has not been persisted to the API yet (no real `chatId`). Drafts cannot be scoped to a chat ID that does not exist. The implementation must handle the new-chat case separately (either skip persistence, or use a special `new` key).

- **File attachment restoration complexity**: `FileMetadata` objects have a `fileId` (a server-assigned URL from `v1/files/bulk`). Files already uploaded can be restored by `fileId`. However, `isUploading` state would need to be reset to `false`, and there is no API to verify that the file still exists server-side. Restoring file attachments is significantly more complex than restoring text and may warrant a separate decision or scoped out of EPMCDME-9922.

- **No existing test coverage for `useChatConfiguration`**: The reference pattern this feature should follow has zero tests. The new hook should not inherit this gap, but it means there is no test scaffold to copy from.

- **No guide documents the chat input state lifecycle**: Conventions must be inferred from `useChatConfiguration.tsx`, `chatsStore.ts`, and the storage utilities. The implementation must establish the pattern as a new de facto convention.

- **Quill delta HTML as stored value**: Storing `messageRaw` (Quill's HTML output) in `localStorage` preserves rich formatting (bold, mentions). On restore, the HTML must be set back into the controlled `value` prop before Quill's `onLoad` runs. If the stored string is malformed, Quill may throw or render incorrectly. Input validation on read is needed.

- **codegraph returned no results**: Repository is not indexed in codegraph. All findings are from filesystem exploration only. Coverage is best-effort over the filesystem, not guaranteed complete.

---

## 7. Summary for Complexity Assessment

This task introduces a state-persistence feature within the `ChatPrompt` component that is currently entirely stateless with respect to navigation. The affected architectural layers are: **UI/Presentation** (`ChatPrompt.tsx`, `Editor.tsx`), **State/Hooks** (a new `useChatPromptDraft` hook mirroring `useChatConfiguration.tsx`), and **State/Persistence** (`src/utils/storage/index.ts`). The likely file change surface is 3–6 files: `ChatPrompt.tsx` (state init and submit path), a new `useChatPromptDraft` hook (new file), `ChatPage.tsx` (potentially adjusting the `key` prop scope), and possibly `useChatConfiguration.tsx` if the draft hook is co-located there. No router, store, or API changes are expected.

The task follows an already-established pattern (`useChatConfiguration`'s per-chat localStorage save/restore cycle) and introduces no new third-party dependencies. The primary technical novelty is the interaction with the Quill editor's initialization timing and the `key={currentChat?.id}` remounting architecture. Both are well-understood from the codebase exploration: restoring state must happen at the initial `useState` value level rather than via a post-mount `useEffect`, and the `isNewChat` guard must handle the case where no `chatId` exists yet. File attachment restoration is the most complex sub-problem and may warrant explicit scoping decisions.

Test coverage for this domain is sparse. `ChatPrompt.test.tsx` exists but covers only the stop-generation button; the reference pattern (`useChatConfiguration`) has no tests at all. New unit tests for the draft hook (save on change, restore on chat switch, clear on submit, guard for `isNewChat`) and at least one integration test (navigate away → navigate back → text persists) will be essential to validate the feature. The risk of regressions is moderate: the `key={currentChat?.id}` remounting pattern is a deliberate isolation mechanism, and any change to it (or work around it) must be verified not to bleed Quill state across chats.
