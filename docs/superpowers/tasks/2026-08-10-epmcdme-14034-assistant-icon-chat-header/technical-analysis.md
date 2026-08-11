# Technical Research

**Task**: chat header assistant icon avatar
**Generated**: 2026-08-10T00:00:00Z

---

## 1. Original Context

EPMCDME-14034: Assistant icon is missing in the chat header next to the assistant name. The assistant icon is not displayed in the chat header next to the assistant name. It is visible in other UI areas such as the assistant list and message area. Expected: The assistant icon is displayed in the chat header next to the assistant name, matching the icon shown in the assistant list and message area. If no custom icon, fallback avatar behavior should apply consistently. No regression in assistant list, message area, or avatar rendering.

---

## 2. Codebase Findings

### Existing Implementations

- **`src/pages/chat/components/ChatHeader/ChatHeader.tsx`** — The primary file with the bug. The component renders the chat header including assistant name and action buttons. The `Avatar` component is imported and used for group chats (renders up to 3 avatars side-by-side), but for single-assistant chats only a `<span>` with the assistant name is rendered — no `Avatar` component is present.
  - Lines 101–115: group chat avatar block — iterates `currentChat.assistantData.slice(0, 3)` and renders `<Avatar … type={AvatarType.SMALL} onClick={handleAvatarClick} withTooltip />` per assistant.
  - Lines 117–125: single-assistant block — only `<span>{assistantDisplayName}</span>` is rendered; no avatar.
  - `handleAvatarClick` (lines 79–85) is defined and routes to workflow details or toggles the config sidebar, but it is **only wired to group chat avatars**, not to any single-assistant avatar.

- **`src/components/Avatar/Avatar.tsx`** — Generic, reusable avatar component. Accepts `iconUrl`, `name`, `type` (AvatarType enum), `onClick`, `withTooltip`, `className`. Falls back to a generated data-URL avatar (feature-flagged via `features:generatedAssistantIcons`) or the static `ai-avatar.png` image. When `onClick` is provided, renders a `<button>`; otherwise renders a bare `<img>`.

- **`src/pages/assistants/components/AssistantList/AssistantCard/AssistantAvatar.tsx`** — A thin re-export of `Avatar` under the old name for backwards compatibility. No separate logic.

- **`src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`** — Message area. Uses `<Avatar type={AvatarType.CHAT} iconUrl={message.assistant?.iconUrl} name={message.assistant?.name} onClick={handleAvatarClick} withTooltip />`. This is the reference for the correctly working icon in the message area.

- **`src/pages/chat/SharedChatPage.tsx`** — Shared-link version of the chat page. Renders avatars for all assistants in `assistantData` (up to 3) using `<Avatar type={AvatarType.SMALL} iconUrl={assistant.iconUrl} … />`. Mirrors the group-chat avatar block from `ChatHeader`.

- **`src/constants/avatar.ts`** — Defines `AvatarType` enum: `DROPDOWN`, `CARD`, `MODAL`, `MEDIUM`, `SMALL`, `CHAT`, `XS`. `SMALL` = 32 px, `CHAT` = 40 px.

- **`src/types/entity/conversation.ts`** — `AssistantData` interface (lines 170–178): `{ id: string; name: string; iconUrl?: string; conversationStarters?; context?; tools?; type? }`. The `iconUrl` field is optional and present in both the store and the component props chain.

### Architecture and Layers Affected

- **UI Component layer** (primary): `ChatHeader.tsx` is the only file requiring a code change. The Avatar sub-component and the `AvatarType` constant already exist and need no modification.
- **Test layer** (secondary): `ChatHeader.test.tsx` requires new test cases for the single-assistant avatar scenario.

### Integration Points

- **`chatsStore` (Valtio store)** — `currentChat.assistantData[]` provides `iconUrl` and `name` for each assistant. Already consumed in `ChatHeader.tsx`; `assistantData[0]` is accessible when the chat has exactly one assistant.
- **`Avatar` component** — already imported in `ChatHeader.tsx` (line 23) and used for the group-chat code path.
- **`AvatarType` constant** — already imported in `ChatHeader.tsx` (line 26).
- **`handleAvatarClick`** — already defined in `ChatHeader.tsx` (line 79); handles both workflow and non-workflow chats; just needs to be attached to the new single-assistant Avatar.

### Patterns and Conventions

- Avatar sizing in chat-adjacent headers uses `AvatarType.SMALL` (32 px) — see group-chat avatars in `ChatHeader.tsx` and `SharedChatPage.tsx`.
- Avatar in the message-area body uses `AvatarType.CHAT` (40 px) — not the right size for the header.
- `withTooltip` is passed to all header-area Avatars in group chat and in `SharedChatPage`; should be passed in the fix for consistency.
- `onClick={handleAvatarClick}` is the correct handler to wire — it already discriminates between workflow and regular chats.
- Avatar fallback behavior (generated icon vs static `ai-avatar.png`) is entirely internal to `Avatar.tsx` via the `features:generatedAssistantIcons` feature flag — no caller-side logic required.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/components/reusable-components.md` — mentions the `Avatar` component exists in `@/components/Avatar` but provides no usage specifics relevant to this fix.
- No dedicated Avatar usage guide found in `.ai-run/guides/`.

### Architectural Decisions

- `AssistantAvatar.tsx` contains an inline note: `"Renamed to the generic Avatar component. Re-exported for backwards compatibility."` — documents the consolidation of assistant-specific avatar into the generic `Avatar`.
- No ADRs or `DECISION:` / `NOTE:` markers found in the affected files.

### Derived Conventions

- Avatar components used in chat-header-level UI consistently use `AvatarType.SMALL`.
- `handleAvatarClick` in `ChatHeader` is the canonical click handler for header avatar interactions; it correctly routes workflow vs. regular-assistant clicks.
- Feature-flagged avatar generation is transparent to callers — pass only `iconUrl` and `name` to `Avatar`.

---

## 4. Testing Landscape

### Existing Coverage

- **`src/pages/chat/components/ChatHeader/__tests__/ChatHeader.test.tsx`** — 20+ test cases covering: New Chat button, sidebar expansion, new chat with same assistant, workflow chat, group chat avatar count, separator rendering, action buttons.
  - Line 320: `it('does not show assistant avatars for non-group chat', …)` — verifies "Assistant One" text is absent in a non-group chat. Uses `mockChat` which has `assistantData: []`, so this test does not exercise the single-assistant-with-data scenario.
  - No test verifies that a single-assistant chat renders an Avatar with the correct `iconUrl` or the correct fallback.

- **`src/components/Avatar/__tests__/Avatar.test.tsx`** — 12 test cases covering: render as `<img>` vs `<button>`, `onClick` handler, `iconUrl` src, fallback to `ai-avatar.png`, generated avatar fallback, all `AvatarType` sizes, `aria-label` / `alt` text for tooltip variants. Coverage is thorough; no changes needed to this file.

### Testing Framework and Patterns

- **Vitest** with `@testing-library/react` and `@testing-library/user-event`.
- Two project workspaces: `unit` (mocked Valtio) and `integration` (real stores, mocked API).
- `ChatHeader.test.tsx` is a unit test — Valtio stores are mocked via `vi.mock`. The pattern is: set `mockChatsStore.currentChat = <fixture>` in each test, then `render(<ChatHeader />)` and assert on DOM.
- Mocks for: `useVueRouter`, `useChatContext`, Valtio stores, `agentWorkspaceStore`.
- Avatar is rendered through real component (not mocked) in ChatHeader tests.

### Coverage Gaps

- No test for a non-group chat where `assistantData` has exactly one entry with a populated `iconUrl` — the new Avatar should render with that icon src.
- No test for a non-group chat where `assistantData[0].iconUrl` is absent — the Avatar should render with the fallback icon.
- No test verifying `handleAvatarClick` is invoked when the single-assistant header Avatar is clicked.
- The test at line 320 ("does not show assistant avatars for non-group chat") will need to be updated or augmented once the Avatar is added for the single-assistant case.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are directly involved in this rendering path. The `features:generatedAssistantIcons` feature flag is loaded via `useFeatureFlag` inside `Avatar.tsx` and requires no caller-side configuration.

### Configuration Files

No specific configuration files govern the avatar rendering logic. Tailwind CSS class names used in `Avatar.tsx` are standard utility classes defined in the project Tailwind config.

### Feature Flags and Deployment Concerns

- `features:generatedAssistantIcons` (checked in `Avatar.tsx`) — when enabled, replaces the static `ai-avatar.png` fallback with a generated data-URL based on the assistant name. This flag is already handled inside `Avatar.tsx`; the fix requires no changes to feature-flag usage.
- No deployment-level concerns. The fix is a pure client-side rendering change scoped to one component.

---

## 6. Risk Indicators

- The `mockChat` fixture in `ChatHeader.test.tsx` has `assistantData: []`. This means the existing test "does not show assistant avatars for non-group chat" passes today for the wrong reason (no data, not no rendering logic). After the fix, this test will still pass (correctly), but new tests must be added to cover the actual single-assistant-with-data scenario.
- The `handleAvatarClick` function in `ChatHeader.tsx` calls `attemptToggleConfigVisibility()` for non-workflow chats. Wiring it to the new Avatar in the single-assistant path introduces a subtle behavior: clicking the header avatar for a workflow chat will navigate to workflow details, not show a config sidebar. This is consistent with the group-chat code path and the existing `handleAvatarClick` logic, but must be verified against the workflow chat scenario in the test.
- `assistantDisplayName` is computed from `currentChat?.assistantData[0]?.name`, meaning it is `undefined` when `assistantData` is empty. The Avatar in the fix should use the same guard condition — it should only render when `assistantData` has exactly 1 entry, using `currentChat?.assistantData[0]?.iconUrl` and `assistantDisplayName` as `name`. This prevents a blank avatar from appearing for empty-data chats.
- `SharedChatPage.tsx` renders avatars for all assistants including single-assistant chats via the generic loop, so it is **not** affected by this bug. No regression risk there.
- `ChatAiMessage.tsx` (message area) is also not affected — it uses per-message `message.assistant?.iconUrl`, which is independent of the header rendering. No regression risk.

---

## 7. Summary for Complexity Assessment

The task touches a single architectural layer — the UI component layer — specifically `src/pages/chat/components/ChatHeader/ChatHeader.tsx`. The root cause is a rendering gap: the `Avatar` component is imported and used in the group-chat branch of `ChatHeader` but is entirely absent from the single-assistant branch. The fix requires adding one `<Avatar>` element inside an already-guarded conditional block, wiring the already-defined `handleAvatarClick` and using props (`iconUrl`, `name`, `type`, `onClick`, `withTooltip`) that are all already in scope. No new imports are needed in `ChatHeader.tsx`. Total file change surface: 1 source file (ChatHeader.tsx, ~5–8 line addition) and 1 test file (ChatHeader.test.tsx, ~20–30 lines of new test cases). No store changes, no type changes, no API changes.

The pattern is well-established and followed consistently in three other places: the group-chat avatar block in `ChatHeader.tsx` itself, `SharedChatPage.tsx`, and `ChatAiMessage.tsx`. The `Avatar` component's fallback behavior (feature-flagged generated icon vs. static image) is fully self-contained, so the fix requires zero fallback logic at the call site. Technical novelty is minimal — this is a straightforward rendering omission fix following an existing pattern.

Test coverage for `ChatHeader` is good overall, but the mock fixture for non-group chats (`assistantData: []`) is too sparse to have caught this regression. The fix should be accompanied by new unit tests in `ChatHeader.test.tsx` that use a mock chat with a populated single-entry `assistantData` array, asserting that the Avatar renders with the correct icon URL and that `handleAvatarClick` fires on click. The key risk factor is the `assistantData: []` fixture gap — it means existing tests will not break, but the absence of data-bearing single-assistant fixtures has masked the bug throughout the test suite's lifetime.
