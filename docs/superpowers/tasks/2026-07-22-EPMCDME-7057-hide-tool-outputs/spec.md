# EPMCDME-7057: Hide Tool Outputs in Chat

## Problem

Tool outputs ("Thoughts") rendered by `ChatAiMessage` are always visible. Non-technical users
find them noisy and distracting; only the final AI answer is relevant to them.

## Goal

Add a per-chat toggle in the Configuration sidebar so users can hide or show tool outputs.
When hidden, only the final Markdown response is rendered. The setting persists across page
reloads for each chat via localStorage.

---

## Behaviour

| State | What the user sees |
|---|---|
| Toggle off (default) | Thoughts rendered above the final response — current behaviour unchanged |
| Toggle on ("Hide tool outputs") | `message.thoughts` block not rendered; final response shown immediately |

Default is **off** (outputs shown). Existing chat sessions are unaffected on first load
until the user explicitly enables the toggle.

---

## Architecture

### Storage — `chatStorageUtils.ts`

New storage key `chat-hide-tool-outputs-{chatId}`. Helper functions:

```ts
export const chatHideToolOutputsKey = (chatId: string): string =>
  `chat-hide-tool-outputs-${chatId}`

export const saveChatHideToolOutputs = (userId: string, chatId: string, value: boolean): void
export const loadChatHideToolOutputs = (userId: string, chatId: string): boolean
```

`saveChatHideToolOutputs` is a no-op when `value === false` (the default), matching the
skip-on-default pattern used by `saveChatTools`.

`sweepOrphanedChatKeys` is updated to recognise the new prefix so orphaned keys are cleaned
up on the next sweep.

### State — `useChatConfiguration.tsx`

New fields added to `UseChatConfigReturn`:

```ts
hideToolOutputs: boolean
setHideToolOutputs: (value: boolean) => void
```

`hideToolOutputs` is a `useState` boolean, initialised to `false`. The existing `useEffect`
that fires on `currentChat?.id` change loads the persisted value via `loadChatHideToolOutputs`
(alongside the existing `dynamicToolsConfig` and `skills` loads). `setHideToolOutputs`
persists via `saveChatHideToolOutputs` then updates the state.

Because `ChatContext` is `UseChatConfigReturn & { isSharedPage: boolean }`, the new fields
are automatically available to every `useChatContext()` consumer with no context changes.

### New component — `ChatConfigHideToolOutputs.tsx`

Mirrors `ChatConfigImageGeneration.tsx`:

- Reads `hideToolOutputs` and `setHideToolOutputs` from `useChatContext()`
- Renders a `<Switch label="Hide tool outputs" />` in a `<div className="mt-6 flex flex-col gap-4">`
- Returns `null` when `currentChat` is absent

### `ChatConfiguration.tsx` — placement

Inside the existing `General` section, after `ChatConfigImageGeneration`:

```tsx
{assistantFeatures.tools && <ChatConfigHideToolOutputs />}
```

`assistantFeatures.tools` is `false` only for `BEDROCK_AGENTCORE_RUNTIME` assistants, which
never produce thoughts, so the guard is both correct and conservative.

### `ChatAiMessage.tsx` — guard

Replace the unconditional thoughts block:

```tsx
// 1. Add hideToolOutputs to the existing useChatContext() destructure (line 58):
const { selectedAssistant, openConfigForm, closeConfig, isSharedPage, hideToolOutputs } =
  useChatContext()

// 2. Replace the unconditional thoughts block:
// before
<div className="flex flex-col gap-2 mt-2">
  {message?.thoughts?.map((thought) => (
    <Thought key={thought.id} thought={thought} />
  ))}
</div>

// after
{!hideToolOutputs && !!message?.thoughts?.length && (
  <div className="flex flex-col gap-2 mt-2">
    {message.thoughts.map((thought) => (
      <Thought key={thought.id} thought={thought} />
    ))}
  </div>
)}
```

The `!!message?.thoughts?.length` guard also avoids rendering an empty `div` when there are
no thoughts, removing a minor pre-existing DOM noise.

---

## Files Changed

| File | Change |
|---|---|
| `src/utils/chatStorageUtils.ts` | Add `chatHideToolOutputsKey`, `saveChatHideToolOutputs`, `loadChatHideToolOutputs`; update `sweepOrphanedChatKeys` |
| `src/pages/chat/hooks/useChatConfiguration.tsx` | Add `hideToolOutputs` state + loader + `setHideToolOutputs` handler; extend `UseChatConfigReturn` type |
| `src/pages/chat/components/ChatConfiguration/ChatConfigHideToolOutputs.tsx` | New component (mirrors `ChatConfigImageGeneration.tsx`) |
| `src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` | Import and render `ChatConfigHideToolOutputs` gated on `assistantFeatures.tools` |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` | Read `hideToolOutputs` from context; guard the thoughts block |
| `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx` | New test file: thoughts visible by default, hidden when toggle is on, empty-thoughts edge case |

---

## Testing

Unit tests in `ChatAiMessage.test.tsx` (new file — no prior baseline):

1. Renders thoughts when `hideToolOutputs === false` (default).
2. Hides thoughts when `hideToolOutputs === true`.
3. Does not render the thoughts `div` when `message.thoughts` is empty or absent.

`useChatConfiguration` changes are covered implicitly by the existing hook-level test patterns in the repo; no dedicated new hook tests are required.

---

## Out of Scope

- No server-side changes. The toggle is client-only.
- No shared-chat page support: `isSharedPage` chats do not show the configuration sidebar, so the toggle is inaccessible there by design.
- No i18n: label string follows the existing pattern of hardcoded English strings in this codebase.
