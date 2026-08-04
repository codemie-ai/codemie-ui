# Technical Research

**Task**: chat prompt resize resizable input ui
**Generated**: 2026-07-16T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

As a CodeMie user, I want the ability to resize (increase or decrease) the height of the context window (the chat prompt input area) where prompts are inserted, so that I can tailor the UI for my individual workflow. This means adding a user-draggable resize handle between the chat history messages and the chat prompt input box in the Chat page, so users can make the prompt area taller or shorter.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/ChatPage.tsx` — Composes the chat page. Renders `ChatSidebar`, a `PageLayout` (which itself renders a header and a scrollable children container), and inside the layout children: a flex column containing `ChatHistory` and `ChatPrompt` side by side with `ChatConfiguration`. This is the primary integration point for the resize split.
- `src/pages/chat/components/ChatHistory/ChatHistory.tsx` — Renders the scrollable message list. Root element is a `<div>` with `className="grow w-full pt-8 pb-12 px-6 overflow-y-auto scrollbar-gutter"`. Uses `grow` to fill remaining space, which must be controlled once a resizable split is introduced.
- `src/pages/chat/components/ChatPrompt/ChatPrompt.tsx` — Renders the prompt input box. Inner container at line 199 carries `className="w-full flex flex-col px-6 scrollbar-gutter overflow-y-auto min-h-32 h-fit -translate-y-3 z-10 shrink-0"` and the actual input div at line 215 has hardcoded `min-h-32 max-h-64`. These fixed height constraints are the primary obstruction; they must be removed or delegated to the Panel's size once the resizable split is in place.
- `src/pages/chat/components/ChatPrompt/ChatPrompt.scss` — Only contains animation/border-gradient styles. No height rules. Height is controlled purely via Tailwind classes in the TSX.
- `src/components/ResizableSeparator/ResizableSeparator.tsx` — A thin wrapper around `react-resizable-panels`' `Separator`. Accepts `orientation: 'horizontal' | 'vertical'`. For a vertical stack (ChatHistory on top, ChatPrompt below), `orientation="vertical"` must be used. The component renders an `ns-resize` cursor handle with hover highlight.
- `src/pages/workflows/WorkflowDetailsPage.tsx` — The existing reference implementation: uses `Panel`, `Group` from `react-resizable-panels` with `ResizableSeparator orientation="vertical"` between a top panel and bottom panel inside a `<div className="flex flex-col grow justify-between overflow-hidden">` wrapper.
- `src/pages/workflows/details/WorkflowDrawer/useWorkflowDrawer.tsx` — Encapsulates panel persistence logic using `useDefaultLayout` (from `react-resizable-panels`) with `localStorage`. Stores layout per `userId` via `user?.userId ?? 'default'`. This is the pattern to follow for persisting the prompt panel height across sessions.
- `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowDrawerState.tsx` — Uses `Group orientation="horizontal"` with `ResizableSeparator orientation="horizontal"` for a side-by-side horizontal split inside a drawer. Shows both orientations of the pattern.

### Architecture and Layers Affected

- **UI / Page layer** (`src/pages/chat/ChatPage.tsx`): The flex column wrapping `ChatHistory` + `ChatPrompt` must be converted to a `react-resizable-panels` `Group` with two `Panel` children and a `ResizableSeparator` between them. The outer container `<div className="flex flex-col items-center grow min-w-0 pb-4">` must become the Group's container and `pb-4` removed (panel manages its own sizing).
- **Component layer** (`src/pages/chat/components/ChatPrompt/ChatPrompt.tsx`): The hardcoded `min-h-32 max-h-64` on the inner textarea wrapper, and the `h-fit shrink-0 min-h-32` on the outer scroll container, must be removed or adapted so the component fills its Panel. The component currently renders a `<>` fragment with two parts: `ChatPromptStarters` (shown when no history) and the prompt box. The prompt box's outer relative wrapper (`<div className="relative w-full z-20">`) and the inner scroll div must be changed to fill the available panel height.
- **Component layer** (`src/pages/chat/components/ChatHistory/ChatHistory.tsx`): The root `grow` class causes it to naturally expand. Once inside a Panel, `grow` should be replaced with `h-full overflow-y-auto` as the Panel controls the height.
- **New hook layer** (`src/pages/chat/hooks/` — new file): A `useChatPromptResize` hook, following the `useWorkflowDrawer` pattern, should encapsulate `useDefaultLayout`, min/max pixel sizes, and localStorage persistence keyed to the user.

### Integration Points

- `react-resizable-panels` (version `^4.11.2`) — already installed. Exports used: `Panel`, `Group` (`PanelGroup`), `Separator`, `useDefaultLayout`, `PanelImperativeHandle`, `PanelSize`. Note: `WorkflowDetailsPage` imports `{ Panel, Group }` (aliased), while `WorkflowDrawerState` also imports `{ Panel, Group }`. Both are from `react-resizable-panels`.
- `src/store/user.ts` / `userStore` — provides `user?.userId` for localStorage key namespacing. Pattern established in `useWorkflowDrawer.tsx` line 28–30.
- `PageLayout` (`src/components/Layouts/Layout/PageLayout.tsx`) — the children container has `overflow-y-auto show-scroll h-full`. In `ChatPage`, this is used with `childrenClassName="px-0"`. The children `<div>` inside has `h-full`. This chain must remain intact — the resizable Group must be `h-full` to fill it.
- `useChatScroll` hook (`src/pages/chat/components/ChatHistory/hooks/useChatScroll.tsx`) — attaches scroll listeners to the `scrollContainerRef` on the ChatHistory root div. This hook will continue to work correctly as long as the ChatHistory root div remains the scroll container. Resizing the panel changes the container's clientHeight, triggering scroll recalculation correctly via the existing `scrollHeight - scrollTop - clientHeight` check.

### Patterns and Conventions

- **Panel + Group + ResizableSeparator pattern**: Established in `WorkflowDetailsPage.tsx`. A wrapping `<div className="flex flex-col grow ... overflow-hidden">` contains a `<Group orientation="vertical" defaultLayout={defaultLayout} onLayoutChanged={onLayoutChanged}>`, with `Panel` children and a `ResizableSeparator orientation="vertical"` between them.
- **Layout persistence with `useDefaultLayout`**: Always stored per-user in `localStorage`. Key pattern: `workflow-drawer-${userId}`. For the chat prompt, use a key such as `chat-prompt-height-${userId}`.
- **Panel pixel sizing**: `useWorkflowDrawer` uses `panelRef.current?.getSize().inPixels` and `panelRef.current?.resize(sizeInPixels)` for programmatic resizing. The `minSize` on `Panel` can be specified in pixels (when `Group` uses `unitSystem="pixels"`) or as a percentage (default). WorkflowDrawerState uses `minSize={250}` which is treated as pixels (because the Group defaults).
- **`-translate-y-3` on ChatPrompt**: The prompt box outer container uses `-translate-y-3` to visually overlap the bottom of the chat history area (creating a shadow-beneath effect). This visual trick must be reconsidered when using a panel split — the panel border becomes the boundary and the translate will create a gap. This is a notable UI concern.
- **`promp-shadow` / `prompt-shadow` CSS class**: Used for the shadow pseudo-element above the prompt box. Once the panel resizer is the separator, this shadow may need to be removed or relocated.

---

## 3. Documentation Findings

### Guides and Architecture Docs

No guides found covering the chat UI or resizable panels specifically. The `.ai-run/guides/` directory contains backend-focused guides (FastAPI, LangChain, SQLModel, etc.) — not applicable to this frontend React task. Conventions are derived from code exploration below.

### Architectural Decisions

No recorded ADRs or decision documents found for the chat layout. The use of `react-resizable-panels` is an undocumented but established choice: it was introduced for `WorkflowDetailsPage` and `WorkflowDrawerState` without a corresponding guide entry.

### Derived Conventions

- State management: UI state uses Valtio (`valtio` proxy stores). Layout persistence uses `localStorage` directly (not through the `@/utils/storage` abstraction seen elsewhere — `useWorkflowDrawer` calls `localStorage.getItem/setItem` directly).
- Hook extraction: Complex panel resize logic is always extracted into a dedicated custom hook (see `useWorkflowDrawer`). The same pattern must be followed here — do not inline panel state in `ChatPage`.
- Import aliasing: `WorkflowDetailsPage` imports `{ Panel, Group }` where `Group` is the library's `PanelGroup`. This aliasing is established convention in this repo.
- Component responsibility: The page component (`ChatPage`) owns the layout structure. Child components (`ChatHistory`, `ChatPrompt`) receive their height from the layout container, not from internal hardcoded constraints.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/__tests__/ChatPage.test.tsx` — Unit test for `ChatPage`. Mocks `ChatHistory` and `ChatPrompt` as `<div data-testid="...">` stubs. Tests assert `getByTestId('chat-history')` and `getByTestId('chat-prompt')` are in the document. These tests will continue to pass after the refactor as long as the mocked components are still rendered inside the page. The test does NOT test layout structure or panel presence.
- `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx` — Unit tests for `ChatPrompt` in isolation: tests stop-generation button click, stop button visibility based on history state. No tests for sizing, height constraints, or the scroll container behaviour. Mocks all sub-components. These tests are unaffected by height class changes.
- `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx` — Integration test for the reference implementation of `react-resizable-panels`. Does not mock the panel library (library renders into jsdom directly). Can be used as a reference for writing integration tests for the chat resize feature.

### Testing Framework and Patterns

- Framework: Vitest + React Testing Library (`@testing-library/react`) + `@testing-library/user-event`
- Two test projects: `unit` (mocked Valtio, mocked API) and `integration` (real Valtio, mocked API via fetch)
- Unit tests use `vi.mock` per-file for store dependencies; `setupTests.unit.ts` globally mocks Valtio
- `ResizeObserver` is globally mocked in `setupTests.tsx` (line 79) — needed for `react-resizable-panels` which uses ResizeObserver internally
- `localStorage` is globally mocked in `setupTests.tsx` (line 57–76) — needed for panel layout persistence
- `react-resizable-panels` is NOT globally mocked. In integration tests it renders in jsdom against the mocked ResizeObserver.

### Coverage Gaps

- No test covers the resizable split between ChatHistory and ChatPrompt — this is a net-new feature, zero existing coverage.
- No test covers `localStorage` persistence of the prompt panel height — must be written.
- No test covers that the resize handle is keyboard accessible or draggable.
- `ChatPage.test.tsx` would need updating to mock `react-resizable-panels` imports (Panel, Group) if they are used in ChatPage directly, OR mock the new `useChatPromptResize` hook, depending on implementation approach.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are relevant to this feature. It is a pure UI change.

### Configuration Files

- `tailwind.config.js` / `tailwind.config.ts` (project root) — governs Tailwind class availability. Classes like `min-h-32`, `max-h-64`, `h-fit`, `grow` are standard Tailwind v3 utilities. No custom theme tokens are needed for the resize handle itself; `ResizableSeparator` uses Tailwind colour tokens like `bg-black/20`.
- `vite.config.ts` — no relevance to this feature.

### Feature Flags and Deployment Concerns

- No feature flags are in use for the chat UI.
- No deployment concerns: `react-resizable-panels` is already a production dependency at version `^4.11.2`.

---

## 6. Risk Indicators

- **`-translate-y-3` overlap trick on ChatPrompt**: `ChatPrompt`'s outer container uses `-translate-y-3` to visually float the input box over the bottom of the history area. This CSS trick creates a 12px negative offset that will conflict with the panel separator boundary, causing visual gaps or the handle to appear misaligned. This class must be removed and the shadow-below effect reconsidered.
- **`min-h-32 max-h-64` hardcoded on the textarea wrapper (ChatPrompt.tsx line 215)**: These Tailwind classes resist the Panel's height control. The inner `div` must use `h-full` or `min-h-0 flex-1` instead, and the Panel's `minSize`/`maxSize` should govern the bounds. Removing these classes changes visual behaviour in the no-history (starters) state as well.
- **`h-fit shrink-0` on the ChatPrompt scroll container (line 199)**: `h-fit` makes the outer prompt scroll container wrap its content rather than fill the panel. This must be changed to `h-full` so the panel height drives the prompt area.
- **ChatHistory `grow` class**: Once inside a Panel, `grow` has no effect (flex-grow is only meaningful in a flex parent — but PanelGroup uses its own layout). The Panel itself manages height. Leaving `grow` on the ChatHistory root div is harmless but should be changed to `h-full` for clarity and to prevent unexpected layout behaviour.
- **`ChatPromptStarters` rendered outside the panel**: In the current `ChatPrompt` component, `ChatPromptStarters` is rendered as a sibling above the prompt box inside a `<>` fragment. If `ChatPrompt` becomes the lower Panel's content, `ChatPromptStarters` will compete for panel space. This component is shown only when there is no chat history — at that point there is no ChatHistory to split against. This state (no history) needs careful design: when there is no history, `ChatHistory` is not rendered (`!!currentChat?.history.length`), so the panel split is moot. The simplest handling is: only render the `Group`/`Panel` split when `ChatHistory` is visible; otherwise render `ChatPrompt` alone.
- **`useChatScroll` scroll-to-bottom on panel resize**: When the user drags the resize handle, `ChatHistory`'s `clientHeight` changes. The `useChatScroll` hook checks `shouldStickToBottom` only on `history` change and on manual scroll. A panel resize may need to re-trigger the scroll-to-bottom check if the user was at the bottom. This is a behavioural edge case.
- **No existing tests for the resizable split**: The ChatPage and ChatPrompt unit tests will require updates. Integration tests do not mock `react-resizable-panels`, so an integration test for the chat page would require careful setup (jsdom ResizeObserver mock is already in place from `setupTests.tsx`).
- **`SharedChatPage` is unaffected**: This read-only view renders only `ChatHistory` without `ChatPrompt` — no changes needed there.
- **`PageLayout` `overflow-y-auto` on children container**: `PageLayout` applies `overflow-y-auto show-scroll` to the children wrapper div (line 106). With `childrenClassName="px-0"` and the children being `h-full`, the Panel Group will be constrained to this height correctly. However the `overflow-y-auto` on the layout wrapper conflicts with the Group controlling its own internal scroll — care is needed to ensure the layout children div does not itself scroll, which `h-full` + `overflow-hidden` on the inner flex div (`<div className="flex h-full">`) should address (this div already exists in ChatPage).

---

## 7. Summary for Complexity Assessment

The task requires adding a user-draggable vertical split between ChatHistory and ChatPrompt in `ChatPage.tsx`, using the already-installed `react-resizable-panels` library. The pattern is fully established in `WorkflowDetailsPage.tsx` and `useWorkflowDrawer.tsx`. The primary file changes are: `ChatPage.tsx` (introduce Group/Panel/ResizableSeparator), `ChatPrompt/ChatPrompt.tsx` (remove hardcoded height classes), `ChatHistory/ChatHistory.tsx` (adjust grow to h-full), and a new `useChatPromptResize.ts` hook for localStorage persistence. The estimated change surface is 4–5 files, all within the `src/pages/chat/` module with one shared component (`ResizableSeparator`) already existing and reused without modification.

The technical novelty is low — this follows a pattern already exercised twice in the codebase (`WorkflowDetailsPage`, `WorkflowDrawerState`). There are no new external dependencies, no API changes, no store changes, and no design system additions required. The single novel element is a hook (`useChatPromptResize`) that is a near-copy of `useWorkflowDrawer` with a different storage key and no collapse/expand toggle behaviour needed (the prompt box should always be visible and resizable, not collapsible).

Test coverage posture is mixed: `ChatPage` and `ChatPrompt` have unit tests that test behaviour unrelated to layout, and these tests will need updating to handle the new Panel imports (mocking `react-resizable-panels` in unit tests or adjusting the test approach). The `ResizeObserver` global mock is already in place in `setupTests.tsx`, so integration tests for the resize feature would work out-of-the-box once written. Key risk factors are the `–translate-y-3` visual overlap trick on the prompt container (must be removed and a replacement shadow considered), the `h-fit shrink-0` classes that must become `h-full`, and the conditional rendering logic (the Panel split should only render when ChatHistory is present, matching the existing `!!currentChat?.history.length` guard in ChatPage).
