# EPMCDME-9922 — Preserve Prompt Box Text Across Navigation

## Problem

`ChatPrompt` owns two pieces of local React state: `prompt: { message, messageRaw }` and
`files: FileMetadata[]`. Neither is persisted. Two navigation events silently discard
whatever the user has typed:

1. **Chat switch** — `ChatPage` renders `<PageLayout key={currentChat?.id}>`, which fully
   unmounts and remounts the entire `ChatPrompt` subtree on every chat-ID change.
2. **Route leave** — navigating to Assistants, Workflows, or any non-chat route unmounts
   `ChatPage` entirely via React Router's `<Outlet>`.

When the user returns to a chat, the prompt box is always empty.

## Scope

- **In scope**: persist and restore the text prompt (`message` + `messageRaw`) per chat.
- **Out of scope**: file attachments. `FileMetadata` objects carry a server-assigned `fileId`
  from `v1/files/bulk`. Restoring them requires verifying the file still exists server-side
  and resetting `isUploading` state — a meaningfully larger sub-problem deferred to a
  follow-up ticket.
- **Out of scope**: new chats (`currentChat?.id` undefined / `isNewChat === true`). No
  stable key to scope the draft to; silently skipped, consistent with the existing
  `useChatConfiguration` pattern.

## Design

### New hook: `useChatPromptDraft`

File: `src/pages/chat/hooks/useChatPromptDraft.ts`

The hook owns the full draft lifecycle — initialization, save, and clear — and exposes
three stable values:

```
{ initial, saveDraft, clearDraft }
```

**Initialization (`initial`):**

The hook reads from `localStorage` synchronously on first render using a `useRef` guard
(reads once, never again for the same mount). It returns the stored draft as `initial`, or
the empty-prompt default if none exists.

`ChatPrompt` passes `initial` directly to `useState`:

```tsx
const { initial, saveDraft, clearDraft } = useChatPromptDraft(chatId, userId)
const [prompt, setPrompt] = useState(initial)
```

Because `ChatPage` already renders `<PageLayout key={currentChat?.id}>`, `ChatPrompt`
remounts on every chat switch. Each fresh mount runs `useChatPromptDraft` anew, reads the
correct draft for the new `chatId`, and `useState(initial)` captures it. No lazy-initializer
function is needed in `ChatPrompt` — the stable `initial` value from the hook is enough.

This timing is critical: the `Editor` component's `onLoad` callback initializes the Quill
DOM from `value.messageRaw` at mount. If `value.messageRaw` is non-empty at that point, the
draft appears in the editor. A post-mount `useEffect` restore would race with `Editor`'s
own clear-on-empty effect (`Editor.tsx:135–143`) and lose.

**Save (`saveDraft`):**

`ChatPrompt` calls `saveDraft(prompt)` in a `useEffect([prompt])` that fires on every
prompt state change. `saveDraft` writes to `localStorage` when `messageRaw` is non-empty,
and removes the key when it is empty (implicit draft clear on backspace-to-empty).

**Clear (`clearDraft`):**

`ChatPrompt` calls `clearDraft()` in `handleSubmit` (both the normal and
workflow-interrupted paths) before resetting local state. This is an explicit removal
independent of the `useEffect` path, making submit semantics unambiguous.

### Storage key

```
chat-prompt-draft-${chatId}
```

Namespaced via the existing `put`/`getObject`/`remove` utilities from
`src/utils/storage/index.ts` with the `${userId}_` prefix, matching the established
`chat-tools-config-${chatId}` and `chat-skills-${chatId}` convention. `userId` is
`userStore.user?.userId` (the `User.userId` field, same source as `useChatConfiguration`).

### Guard conditions

Both `saveDraft` and `clearDraft` are no-ops when `chatId` or `userId` is `undefined`.
`readPromptDraft` returns `null` for those cases. This silently covers new chats and any
edge case where the user store has not yet resolved.

### Files changed

| File | Change |
|---|---|
| `src/pages/chat/hooks/useChatPromptDraft.ts` | **New** — hook + `readPromptDraft` helper |
| `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` | Use `initial` from hook, add save effect, add `clearDraft` calls in submit |
| `src/pages/chat/hooks/__tests__/useChatPromptDraft.test.ts` | **New** — unit tests |

No changes to `ChatPage.tsx`, `Editor.tsx`, routing, or stores.

## Edge Cases

| Scenario | Behaviour |
|---|---|
| New chat (no `chatId`) | Draft persistence skipped silently |
| `?prompt=` auto-submit fires | `useChatInitialPrompt` calls `createChatGeneration` directly, bypassing `handleSubmit`. The draft is not cleared automatically — it remains in the box and in `localStorage`. The user's next normal submit or manual clear (backspace to empty) removes it. |
| Malformed JSON in `localStorage` | `storage.getObject` returns `null` (default); gracefully falls back to empty prompt |
| Chat switch | `PageLayout key={currentChat?.id}` remounts `ChatPrompt`; fresh `useChatPromptDraft` read loads draft for new chatId |
| Browser refresh | Draft survives in `localStorage`; fresh mount restores it |
| Submit clears draft | `clearDraft()` called before `setPrompt({ message: '', messageRaw: '' })`; both the explicit call and the subsequent save-effect agree |

## Async Upgrade Path

The current implementation reads `localStorage` synchronously via `useRef` on first render.
If the storage layer is ever replaced with an async mechanism (IndexedDB, remote API), the
hook internals change as follows — `ChatPrompt` does not need to change its API:

1. Replace the `useRef` synchronous read with `useLayoutEffect` (fires before paint).
2. Add `draftLoaded: boolean` to the hook's return type (initially `false`, set `true` after
   load completes).
3. Gate the `Editor` render in `ChatPrompt` on `draftLoaded`:
   ```tsx
   {draftLoaded && <Editor value={prompt} ... />}
   ```
   For `localStorage` this would be imperceptible; `useLayoutEffect` resolves before the
   browser paints even with a microtask-wrapped async call.

## Testing

**Unit — `useChatPromptDraft.test.ts`**

- `readPromptDraft` returns `null` for a missing key.
- `readPromptDraft` returns the stored draft when the key exists.
- `saveDraft` writes to `localStorage` when `messageRaw` is non-empty.
- `saveDraft` removes the key when `messageRaw` is empty.
- `clearDraft` removes the key.
- Both `saveDraft` and `clearDraft` are no-ops when `chatId` or `userId` is `undefined`.

**Unit — extend `ChatPrompt.test.tsx`**

- `ChatPrompt` initializes `prompt` state from the stored draft (non-empty `messageRaw`
  passed to `Editor` on first render).
- `ChatPrompt` submit path calls `clearDraft` and resets prompt state.
