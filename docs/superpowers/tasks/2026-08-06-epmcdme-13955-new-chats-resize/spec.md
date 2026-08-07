# Spec: EPMCDME-13955 — Resize handle visible in new empty chats

## Problem

`ChatPage.tsx` gates the entire `<Group>`/`<ChatResizableSeparator>`/`<ChatPrompt resizable />` structure behind `hasHistory = !!currentChat?.history.length`. When a chat has no messages the component falls into the `else` branch, rendering `<ChatPrompt />` without a separator or panel group. The resize handle is invisible until the user sends the first message.

## Goal

The `ChatResizableSeparator` must be rendered whenever `currentChat` exists, including for new/empty chats. Users should be able to resize the prompt area before composing their first message.

## Approach

Collapse the two rendering branches (`hasHistory ? ... : ...`) into a single always-mounted panel Group. The `chat-history` panel is always present (required so `aria-controls="chat-history chat-prompt"` on the separator references a real element), but `<ChatHistory />` is only rendered when `hasHistory` is true.

The empty-state layout uses a separate Group `key` and no saved `defaultLayout` so the history panel starts at 0px (collapsed, via `defaultSize={0}` + `collapsible collapsedSize={0}`) and the prompt fills the available space. On first message, `hasHistory` becomes true, the Group re-mounts with the `userId` key and the saved/default layout, and the history panel expands to its minimum size.

No changes are needed to `ChatResizableSeparator`, `useChatPromptResize`, or `ChatPrompt`.

## Acceptance criteria

- Resize handle is rendered in a new/empty chat before the first message is sent.
- Resize handle is functional (draggable) during initial prompt composition.
- Resize handle remains visible and functional after the first message is sent.
- Resize behavior in chats with existing history is unchanged.
- No layout regressions in the chat history or prompt area.
- Tests updated: assertions that previously verified absence of the separator in empty chats are inverted to verify presence.
- A new integration test asserts separator is present in empty-history state.
