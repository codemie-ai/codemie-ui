# Spec: Fix empty localStorage records causing QuotaExceededError

**Ticket:** EPMCDME-13612  
**Branch:** EPMCDME-13612_fix-empty-local-storage-records

---

## Problem

CodeMie accumulates two orphaned localStorage entries per chat created:

- `{userId}_chat-skills-{chatId}` — written as `[]` when no skills are selected
- `{userId}_chat-tools-config-{chatId}` — written as `{"enableWebSearch":null,"enableCodeInterpreter":null}` when no tools are configured

Two root causes drive accumulation:

1. **No write guard.** `chatGeneration.ts` writes both keys for every new chat, using `skillIds ?? []` and `dynamicToolsConfig ?? {…}` fallbacks that protect against `undefined` but not an explicitly passed empty array or all-null object. `useChatConfiguration.tsx` writes both keys on every user interaction with no empty-value check.

2. **No cleanup on delete.** `chats.ts` removes chats from the API and in-memory state but never calls `storage.remove` for the corresponding per-chat keys. Every deleted chat leaves two orphaned entries indefinitely.

Over time the orphaned entries exhaust the browser's localStorage quota (~5–10 MB in Chrome). Once the quota is full, any subsequent write — including the `recent_chats` write — throws `QuotaExceededError` and the app stops responding.

---

## Solution

Four targeted changes. No changes to the storage utility API.

### 1. Write guards

**`src/store/chatGeneration.ts`** — in the `isNewChat` branch, skip both `storage.put` calls when values are empty/default:

- Skip `chat-skills-{chatId}` if `skillIds` is nullish or has length 0.
- Skip `chat-tools-config-{chatId}` if `dynamicToolsConfig` is nullish or both `enableWebSearch` and `enableCodeInterpreter` are null.

**`src/pages/chat/hooks/useChatConfiguration.tsx`** — guard the two module-private save functions:

- `saveChatSkills`: skip `storage.put` if `skills.length === 0`.
- `saveChatTools`: skip `storage.put` if `config.enableWebSearch === null && config.enableCodeInterpreter === null`.

### 2. Cleanup on chat deletion

**`src/store/chats.ts`** — after each successful deletion, call `storage.remove` for both per-chat keys using the deleted chat's id and `userStore.user?.userId`:

- `deleteChat`: remove both keys after the API call resolves.
- `deleteAllConversations`: iterate `chatsStore.chats` before clearing the array and remove both keys for every chat.
- `deleteChatFolder(folder, deleteChats=true)`: snapshot `chatsStore.chats.filter(c => c.folder === folder)` before the API call; remove their keys after the API confirms deletion.

### 3. Startup sweep

A `sweepOrphanedChatKeys(userId: string, validChatIds?: string[]): void` utility function in `src/utils/chatStorageUtils.ts`:

- Iterates `Object.keys(localStorage)`.
- Removes any key matching `{userId}_chat-skills-*` whose parsed value is an empty array.
- Removes any key matching `{userId}_chat-tools-config-*` whose parsed value has both `enableWebSearch` and `enableCodeInterpreter` as null.
- If `validChatIds` is provided, also removes any `{userId}_chat-skills-*` or `{userId}_chat-tools-config-*` key whose embedded chatId is not in the list — covering chats deleted before this fix was deployed.
- Runs silently — no toast, no side effects beyond `localStorage.removeItem`.

**Pass 1 — empty/default sweep** (immediate): called from `App.tsx` in the existing `useEffect(() => { if (user) { … } }, [user])` block as `sweepOrphanedChatKeys(userId)`. Runs before any chat writes, heals existing users on their next login.

**Pass 2 — existence sweep** (after chats load): called from `chatsStore.getChats()` after `chatsStore.chats` is populated, as `sweepOrphanedChatKeys(userId, chatsStore.chats.map(c => c.id))`. Removes keys for any chatId that no longer exists on the server.

### 4. Reactive handling on QuotaExceededError

The `storage.put` calls in `chatGeneration.ts` and `useChatConfiguration.tsx` are wrapped in try/catch. On `QuotaExceededError`, log the error and swallow silently. The startup sweep is the recovery mechanism; a mid-session write failure for chat settings is non-critical.

---

## Files changed

| File | Change |
|---|---|
| `src/store/chatGeneration.ts` | Add write guards; wrap writes in try/catch with sweep + retry |
| `src/pages/chat/hooks/useChatConfiguration.tsx` | Add write guards to `saveChatSkills` and `saveChatTools`; wrap in try/catch |
| `src/store/chats.ts` | Add `storage.remove` in `deleteChat`, `deleteAllConversations`, `deleteChatFolder` |
| `src/utils/chatStorageUtils.ts` | New file: `sweepOrphanedChatKeys(userId, validChatIds?)` |
| `src/App.tsx` | Call `sweepOrphanedChatKeys(userId)` in the user-load effect (Pass 1) |
| `src/store/chats.ts` | Also call `sweepOrphanedChatKeys(userId, chatIds)` after `getChats()` populates (Pass 2) |

---

## Acceptance criteria

- CodeMie does not write `chat-skills-{chatId}` with `[]` to localStorage.
- CodeMie does not write `chat-tools-config-{chatId}` with all-null values to localStorage.
- Deleting a chat removes its corresponding `chat-skills-*` and `chat-tools-config-*` localStorage keys.
- Deleting all conversations removes all per-chat localStorage keys for the current user.
- On app startup, existing empty/default `chat-skills-*` and `chat-tools-config-*` keys are silently removed.
- When a `storage.put` call fails with `QuotaExceededError`, the error is logged and swallowed silently.
- On app startup (Pass 2, after chats load), localStorage keys for chatIds that no longer exist on the server are removed.
- `recent_chats` can be saved without triggering `QuotaExceededError` after the startup sweep runs.
