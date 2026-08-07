# Technical Research

**Task**: chat resize handle prompt area empty state new chat
**Generated**: 2026-08-06T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-13955: New chats are missing the prompt resize handle until the first message is sent. In newly created chats, the draggable resize handle between the chat history and the prompt area is not visible until the user sends the first message. The resize handle introduced by EPMCDME-11292 should be available whenever the chat prompt area is displayed, including in a new chat before any message is sent. Currently, when a user opens or creates a new chat, the resize handle is missing. After the user sends the first message, the handle appears. This makes the resize functionality unavailable during the initial prompt composition flow, even though users may need to adjust the prompt/context window before sending the first message.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/ChatPage.tsx` — Top-level chat page component. Lines 80 and 116–139 contain the exact bug. `hasHistory` is derived as `!!currentChat?.history.length` and the entire resizable panel Group (including `ChatResizableSeparator`) is only rendered inside the `hasHistory ? (...) : (...)` branch. When there is no history the component falls into the `else` branch which renders a flat `<ChatPrompt />` with no separator and no panel Group.
- `src/pages/chat/components/ChatResizableSeparator.tsx` — The separator component itself (introduced by EPMCDME-11292). Renders a `react-resizable-panels` `<Separator>` with `aria-label="Resize chat prompt area"` and a decorative pill indicator. The component itself is unconditional — the conditionality is entirely in `ChatPage.tsx`.
- `src/components/ResizableSeparator/ResizableSeparator.tsx` — Generic reusable separator wrapper around `react-resizable-panels` `<Separator>`. Used for the sidebar and config panel separators; the chat history/prompt separator uses the domain-specific `ChatResizableSeparator` instead.
- `src/pages/chat/hooks/useChatPromptResize.ts` — Hook providing `defaultLayout`, `debouncedOnLayoutChanged`, and `userId` for the resizable panel `<Group>`. Persists panel layout to `localStorage` with key `chat-prompt-height-{userId}` and a 300 ms debounce. Only consumed in the `hasHistory` branch of `ChatPage`.
- `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` — Prompt component. Accepts a `resizable?: boolean` prop. When `resizable={true}` the wrapper divs switch to `h-full flex flex-col` layout classes to fill the panel. When `resizable` is false (the default, used in the empty-state branch), the component renders as a fixed-height, non-panel element.

### Architecture and Layers Affected

**UI / Page layer** — `ChatPage.tsx` is the sole location of the `hasHistory` conditional that controls whether the resizable panel Group is rendered. This is the layer that needs to change.

**Component layer** — `ChatResizableSeparator.tsx` is already fully implemented; it just needs to be mounted unconditionally (or at least whenever `currentChat` exists).

**Hook layer** — `useChatPromptResize.ts` is currently only exercised when `hasHistory` is true. The hook itself is stateless with respect to history and can be called regardless; the `defaultLayout` it provides defaults gracefully when no saved layout exists.

### Integration Points

- `react-resizable-panels` library (`Group`, `Panel`, `Separator` from the library) — the panel system requires `ChatResizableSeparator` to live inside a `<Group>` with orientation `"vertical"`. The empty-state branch currently has no `<Group>`, so moving the separator there requires restructuring the JSX to always use the panel Group.
- `chatsStore` (Valtio store) — `currentChat.history` is the array whose `.length` drives `hasHistory`. No store changes needed; the fix is purely in the rendering layer.
- `localStorage` — the `useChatPromptResize` hook stores layout state per user. Calling it in the new-chat context is harmless; no saved layout means the panel uses `defaultSize` props.

### Patterns and Conventions

- The existing `hasHistory` ternary at `ChatPage.tsx` lines 116–139 is the canonical pattern for the two layouts. The fix should collapse the two branches into one layout that always uses the panel Group, eliminating the conditional entirely (or reducing it to only toggling `ChatHistory` visibility).
- `ChatPrompt` already accepts `resizable` as a boolean prop — it is passed as `<ChatPrompt resizable />` in the history branch and `<ChatPrompt />` (no prop, defaults to `false`) in the empty branch. The fix must pass `resizable` in both cases.
- The config panel and sidebar both follow the same pattern: always-mounted `<Group>/<Panel>/<ResizableSeparator>` with collapse logic handled by `collapsible`/`collapsedSize` panel props, not by conditional rendering.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found specifically for the chat resize feature — conventions derived from code exploration. The `.ai-run/guides/` directory contains backend guides not applicable to this React/TypeScript frontend codebase.

### Architectural Decisions

- EPMCDME-11292 (commit `5867f3f38`) introduced the `ChatResizableSeparator`, `useChatPromptResize`, and the conditional panel Group. The conditional was intentional at that time — the resizable layout only makes sense when there is history to display above the prompt. The ticket did not address the new-chat case.
- EPMCDME-9820 (commit `e92f0d156`) added the resize indicator pill to the config panel separator, following the same decorative-pill pattern visible in `ChatResizableSeparator`.

### Derived Conventions

- Panel layouts are always rendered via `react-resizable-panels` `<Group>/<Panel>/<Separator>` — never via CSS-only split layouts.
- Collapse/hide behaviour is achieved with `collapsible` + `collapsedSize={0}` props on `<Panel>`, not by omitting the panel from the tree.
- The `ChatResizableSeparator` follows the same semantic pattern as `ChatConfigResizableSeparator`: a named `aria-label`, `aria-controls` referencing the two panel IDs, and a visual pill child.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/__tests__/ChatPage.test.tsx` — Unit tests with all panels mocked. Includes two directly relevant tests:
  - `"renders the resize separator when chat has history"` — asserts `resizable-separator` is in the DOM when `history` is non-empty.
  - `"renders ChatPrompt standalone without separator when history is empty"` — explicitly asserts `queryByTestId('resizable-separator')` is **not** in the DOM when `history` is empty. **This test encodes the current (buggy) behaviour and will need updating.**
- `src/pages/chat/__tests__/ChatPage.integration.test.tsx` — Integration tests using the real `react-resizable-panels` library. Includes:
  - `"renders the resize handle (role=separator) when the chat has history"` — passes today.
  - `"does not render a resize handle when the chat has no history"` — explicitly asserts the separator is absent for empty history. **This test also encodes the buggy behaviour and will need updating.**
- `src/pages/chat/__tests__/ChatPage.resize.test.tsx` — Resize-specific test asserting the panel Group structure renders with 4 `data-panel` elements and 1 `data-separator` element. Does not test the empty-state case. May need a count update after the fix.

### Testing Framework and Patterns

- Framework: Vitest with `@testing-library/react`.
- Mocking: `vi.mock()` for all sub-components and hooks; `vi.hoisted()` for store mocks that must be referenced inside `vi.mock()` factories.
- The integration test file explicitly notes that `react-resizable-panels` is **not** mocked so that `role="separator"` assertions on the real DOM element are meaningful.
- Pattern for the empty-state test: set `mockChatsStore.currentChat.history = []`, render, then assert presence/absence of elements.

### Coverage Gaps

- No test currently asserts that the resize separator is present in an empty-state (new) chat. After the fix, at least one new test case must be added asserting `getByRole('separator', { name: 'Resize chat prompt area' })` is present when `history` is empty.
- No test covers the `useChatPromptResize` hook being exercised in the empty-chat context (e.g. that `defaultLayout` is consumed without error when there is no saved layout).

---

## 5. Configuration and Environment

### Environment Variables

None directly relevant to the resize handle feature. The `useChatPromptResize` hook uses `localStorage` (browser API), not environment variables.

### Configuration Files

- `localStorage` key: `chat-prompt-height-{userId}` — controlled entirely in `useChatPromptResize.ts`. No server-side config.

### Feature Flags and Deployment Concerns

No feature flags gate the resize handle. The feature is always-on once the component is rendered. No deployment concerns — the fix is a pure JSX restructure with no API changes.

---

## 6. Risk Indicators

- **Two existing tests explicitly assert the buggy behaviour** and will fail after the fix, requiring deliberate updates:
  - `ChatPage.test.tsx`: `"renders ChatPrompt standalone without separator when history is empty"` asserts `queryByTestId('resizable-separator')` returns null.
  - `ChatPage.integration.test.tsx`: `"does not render a resize handle when the chat has no history"` asserts `queryByRole('separator', { name: 'Resize chat prompt area' })` returns null.
- **`ChatResizableSeparator` uses `aria-controls="chat-history chat-prompt"`** — if the `chat-history` panel is hidden or unmounted in the empty state rather than collapsed, this ARIA reference will point to a non-existent element. The fix must ensure the `chat-history` panel is always mounted (collapsed or zero-height) or the `aria-controls` attribute must be updated conditionally.
- **`ChatPrompt` layout classes differ between resizable and non-resizable modes** — in the empty-state branch it currently renders without `resizable` prop, using `min-h-32 h-fit -translate-y-3 shrink-0` classes. If `resizable={true}` is passed unconditionally, the prompt area will stretch to fill the panel height in the empty state, which may change the visual layout for new chats. This is likely desirable (the prompt would expand to use the available space) but should be confirmed against design intent.
- **`ChatPage.resize.test.tsx`** asserts exactly 4 `data-panel` elements — if the restructure changes panel count (e.g. chat-history panel is always present), this count assertion may need updating.
- **No codegraph MCP available** — research conducted via filesystem tools only; no semantic call-graph analysis was possible.

---

## 7. Summary for Complexity Assessment

The bug is precisely located in `ChatPage.tsx` lines 116–139. The `hasHistory` boolean gates the entire resizable panel Group including `ChatResizableSeparator` — when a chat has no messages, the component renders a flat `<ChatPrompt />` with no separator instead of the panel-based layout. The fix requires collapsing the two rendering branches into a single always-mounted panel Group, where `ChatHistory` is either conditionally rendered inside its panel or the panel itself is collapsed when `history` is empty. This touches one file at the page layer and is a small, well-scoped JSX restructure. The `useChatPromptResize` hook and `ChatResizableSeparator` component require no changes.

The task follows an established pattern already used for the config panel and sidebar: always mount the panel Group, use panel collapse semantics for hide/show rather than conditional rendering. No new patterns or external dependencies are introduced. The `resizable` prop on `ChatPrompt` should be passed `true` in the unified layout branch so the prompt fills its panel correctly.

Test coverage posture is mixed. The affected area has good test coverage overall, but two existing tests explicitly assert the current (buggy) behaviour and will fail after the fix. These tests must be updated, and at least one new test should assert that the separator is present in the new-chat / empty-history state. The integration test file is the most valuable for validating the fix since it exercises the real `react-resizable-panels` Separator rendering. Total estimated file change surface: 1 source file (`ChatPage.tsx`) plus 2–3 test files (`ChatPage.test.tsx`, `ChatPage.integration.test.tsx`, potentially `ChatPage.resize.test.tsx`).
