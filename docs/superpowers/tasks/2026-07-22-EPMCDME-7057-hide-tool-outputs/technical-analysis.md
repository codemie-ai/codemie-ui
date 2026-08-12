# Technical Research

**Task**: chat tool-output message rendering hide-toggle
**Generated**: 2026-07-22T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-7057 — Option to hide technical tool outputs (e.g., SQL tools) from chat-bot responses for end users. In the chat-bot interface, technical outputs from tools such as SQL tools are displayed by default. This detailed information is often too technical and lengthy for non-technical users, making it challenging to focus on the final answer. Users should have the option to hide tool outputs and view only the concise final response, improving usability and user experience for audiences uninterested in backend processes. Acceptance criteria: (1) Users can enable/disable display of technical tool outputs (e.g., SQL results) in the chat-bot. (2) When disabled, only the final answer is shown in the response. (3) The setting is persistent for the session or user preferences. (4) Option is accessible and clearly labeled for end users. Affected areas: Chat-bot UI/UX, Output rendering logic.

---

## 2. Codebase Findings

### Existing Implementations

**Message rendering pipeline (top to bottom):**

```
ChatPage.tsx
  └── ChatHistory.tsx
        └── ChatHistoryGroup.tsx   (one per conversation turn)
              ├── ChatUserMessage
              └── ChatAiMessage.tsx  ← renders tool outputs + final answer
                    ├── thoughts.map → <Thought />   (tool output blocks — no hide guard)
                    │     ├── ThoughtHeader.tsx        (tool name, status badge, expand/collapse)
                    │     └── ThoughtMessage.tsx       (result content: text, markdown, code, image, document)
                    └── <Markdown />                   (final answer text)
```

Key files:
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/ChatPage.tsx` — top-level page component; wraps everything in `ChatContext.Provider`; renders `ChatSidebar`, `ChatHeader`, `ChatHistory`, `ChatPrompt`, `ChatConfiguration`
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/SharedChatPage.tsx` — read-only shared chat view; uses the same `ChatHistory` with a minimal `ChatContext`; must be accounted for in the toggle implementation
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatHistory/ChatHistory.tsx` — iterates messages, delegates to `ChatHistoryGroup`
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatHistory/ChatHistoryGroup.tsx` — renders user + AI message pair per turn
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — **primary gating point**: currently renders `message.thoughts` array unconditionally (lines 198–203); also renders `message.response` as `<Markdown>`
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/components/Thought/Thought.tsx` — renders one tool-call block; has **per-item** expand/collapse via `useState(false)` and a `defaultExpanded` prop; exposes imperative `expand()`/`collapse()` via `ThoughtRef`
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/components/Thought/ThoughtHeader.tsx` — clickable header with tool icon, tool name, and status badge
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/components/Thought/ThoughtMessage.tsx` — renders tool result as `<Markdown>`, `<TextBlock>`, `<CodeBlock language="json">`, `<img>`, or `<ThoughtDocument>`
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/components/Thought/ThoughtDocument.tsx` — collapsible document segment renderer

**Chat-level configuration and context:**
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/hooks/useChatConfiguration.tsx` — central hook for all chat-level state; already manages `isConfigVisible`, `dynamicToolsConfig`, `selectedSkills`; **the correct place to add `hideToolOutputs` state**
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/hooks/useChatContext.tsx` — exposes `ChatContext` and `useChatContext` hook consumed throughout the chat subtree

**Existing configuration UI (established patterns):**
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatConfiguration/ChatConfiguration.tsx` — right-side config sidebar panel opened from `ChatHeader`; has a "General" section with `ChatConfigLlmSelector`, `ChatConfigSkillsSelector`, `ChatConfigImageGeneration` — **the correct placement for the new toggle**
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatConfiguration/ChatConfigImageGeneration.tsx` — the exact pattern to follow: uses `Switch` from `@/components/form/Switch`, reads/writes a boolean via `useChatContext()`, persists via `chatsStore.updateChat`
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatPrompt/DynamicToolsSettings.tsx` — alternative placement; uses `Switch` in an `OverlayPanel` for per-chat tool enable/disable; persists via `storage.put(userId, key, value)` (localStorage)

**Storage utilities:**
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/utils/chatStorageUtils.ts` — contains `saveChatTools`, `saveChatSkills`, compound localStorage keys `chat-skills` and `chat-tools-config`; **the correct place to add a new `CHAT_HIDE_TOOL_OUTPUT_KEY`**
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/utils/storage.ts` — localStorage utility: `put(userId, key, value)`, `getObject(userId, key, default)`, `remove(userId, key)`

### Architecture and Layers Affected

| Layer | Components/Modules Touched |
|---|---|
| **UI / Presentation** | `ChatAiMessage.tsx` (rendering gate), `ChatConfiguration.tsx` (settings panel host), new `ChatConfigHideToolOutputs.tsx` component |
| **Shared UI** | `Switch` component (already exists at `@/components/form/Switch`) |
| **Chat Configuration Context** | `useChatConfiguration.tsx` (add state + setter), `useChatContext.tsx` (no changes; propagated automatically) |
| **Persistence / Storage** | `chatStorageUtils.ts` (add storage key + helpers), `storage.ts` (no changes) |
| **Type Definitions** | `UseChatConfigReturn` type in `useChatConfiguration.tsx` (add `hideToolOutputs: boolean` + setter signature) |

The `Thought`, `ThoughtHeader`, `ThoughtMessage`, and `ThoughtDocument` components do **not** need to change — the hide is applied at the `ChatAiMessage` level by conditionally skipping the `thoughts.map(...)` block entirely.

### Integration Points

- **`ChatContext`** — the existing React context mechanism that connects `useChatConfiguration` state to all components in the chat subtree. No new context entry points needed; the new `hideToolOutputs` value is added to `UseChatConfigReturn` and will flow automatically.
- **`ChatHistory` → `ChatHistoryGroup` → `ChatAiMessage`** — `useChatContext()` is called inside `ChatAiMessage.tsx`, so the toggle state will be available at the rendering gate without prop-drilling through intermediate components.
- **`SharedChatPage.tsx`** — shares `ChatHistory` and therefore `ChatAiMessage`. The toggle must behave correctly in shared/read-only mode (either inherit the default `true`/show value from the minimal `ChatContext`, or be explicitly disabled for shared views).
- **State management (Valtio)** — `appInfoStore` at `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/store/appInfo.ts` is the established home for global reactive UI prefs (e.g., `navigationExpanded`). If a truly global (non-per-chat) preference is preferred over per-chat storage, the toggle could live here instead.

### Patterns and Conventions

1. **`ChatConfigImageGeneration.tsx` pattern** — the canonical model for a new chat-level boolean toggle. It uses `<Switch>`, reads/writes through `useChatContext()`, and persists via `chatsStore.updateChat`. Follow this for the new `ChatConfigHideToolOutputs` component.

2. **Per-chat localStorage persistence** — `dynamicToolsConfig` in `useChatConfiguration.tsx` is loaded via `storage.getObject(userId, CHAT_TOOLS_CONFIG_KEY + chatId, DEFAULT)` and saved on change. This pattern is appropriate if the preference should be per-chat.

3. **Global localStorage persistence** — `appInfoStore.toggleNavigationExpanded()` pattern (`localStorage.getItem/setItem` inside a Valtio proxy method) is appropriate if the preference should be global across all chats.

4. **Component placement** — `ChatConfiguration.tsx` "General" section is the correct home for display preferences. No new settings routes or modals are needed.

5. **`Switch` import** — `import Switch from '@/components/form/Switch'` (already used in `ChatConfigImageGeneration.tsx` and `DynamicToolsSettings.tsx`).

6. **No i18n** — all user-facing strings are hardcoded inline. The toggle label string goes directly in the component JSX.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists and is populated. Relevant guides:

- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/.ai-run/guides/architecture/architecture.md` — full layered architecture: React 18.3.1 / TypeScript 5.8.3 / Vite 5.4.21 SPA; Valtio proxy stores for global state; feature folder convention; three-layer flow (Component → Store → API).
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/.ai-run/guides/patterns/state-management.md` — Valtio proxy template, CRUD patterns, `useSnapshot` usage rules, persistence conventions.
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/.ai-run/guides/components/component-organization.md` — directory placement rules, 300-line cap, naming conventions, index file pattern.
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/.ai-run/guides/components/reusable-components.md` — reusable component patterns.
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/.ai-run/guides/patterns/custom-hooks.md` — hook conventions.
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/.ai-run/guides/project.md` — Work Item Key Prefix: EPMCDME, Project: codemie-ui-next, MR Target: main.

### Architectural Decisions

- **EPMCDME-11637** (`EPMCDME-11637_tool-output-token-limits` branch, already merged): Added `tokens_size_limit` field to the workflow editor tool node config form (`/src/pages/workflows/editor/configPanels/components/ToolForm.tsx`). This is **workflow editor** scope only — it limits how many tokens a tool output consumes before truncation. It is unrelated to the chat display toggle requested here. Its existence confirms that tool output management is an active area of the product.
- Valtio is the mandated state manager. No Redux, Zustand, or Context-only state patterns are used for feature state.
- Per-chat settings are stored with compound localStorage keys (`${userId}_${key}`) via the `storage` utility. Server-synced preferences (`preferences.ts`) currently hold only pinned assistants and favorites; extending them would require a backend schema change.

### Derived Conventions

- Boolean chat display settings follow the `ChatConfigImageGeneration` component shape: a labelled `Switch` in the `ChatConfiguration` sidebar "General" section, reading from and writing to `useChatContext()`.
- `useChatConfiguration.tsx` accumulates all chat-level state; all new chat settings state belongs there.
- Component files in `ChatConfiguration/` are named `ChatConfig<FeatureName>.tsx`.
- There is no i18n layer — labels are hardcoded string literals in JSX.

---

## 4. Testing Landscape

### Existing Coverage

| Test File | What It Covers |
|---|---|
| `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/components/Thought/__tests__/Thought.test.tsx` | Per-item expand/collapse, children recursion, status badges, `input_text` display |
| `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/components/Thought/__tests__/ThoughtHeader.test.tsx` | Tool name display (author_name / tool_name fallback), icon type, expand callback, badge states |
| `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/components/Thought/__tests__/ThoughtDocument.test.tsx` | Document expand/collapse, ReactNode content, event propagation |
| `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/workflows/details/states/__tests__/WorkflowExecutionStateThought.test.tsx` | WorkflowExecutionStateThought wrapper (mocks Thought; covers content→message transform) |
| `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/__tests__/ChatPage.test.tsx` | ChatPage mount, auth callback handling |
| `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiAuthPrompt.test.tsx` | MCP auth prompt inside AI message |
| `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/utils/__tests__/chatHelpers.test.ts` | `transformChatBEtoFE` utility |

Factory pattern `createMockThought()` exists and is available for test fixtures.

### Testing Framework and Patterns

- **Framework**: Vitest 1.6.1 with two projects: `unit` (jsdom, Valtio mocked via `useSnapshot` returning store directly) and `integration` (real Valtio reactivity, real stores, global `fetch` mock, 15 s timeout)
- **Libraries**: `@testing-library/react` 16.3.0, `@testing-library/user-event` 14.6.1, `@testing-library/jest-dom` 6.6.3
- **Test location**: `__tests__/` subdirectory colocated with source, named `*.test.tsx` (unit) or `*.integration.test.tsx` (integration)
- **Fixtures**: `createMockThought()` factory; `vi.fn()` / `vi.mock()` for isolation

### Coverage Gaps

The following files that will be touched or created by this task have **no existing test file**:

- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — **no test file**. This is the primary rendering gate and the most critical component to test.
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/components/Thought/ThoughtMessage.tsx` — **no test file**. Indirectly relevant.
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatHistory/ChatHistory.tsx` — **no test file**.
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/src/pages/chat/components/ChatHistory/ChatHistoryGroup.tsx` — **no test file**.
- `ChatConfigHideToolOutputs.tsx` (new file) — will need a test covering the `Switch` render and toggle interaction.
- `useChatConfiguration.tsx` — not tested directly.

---

## 5. Configuration and Environment

### Environment Variables

No environment variables are used in or adjacent to the tool-output rendering or chat configuration paths. The `FEATURE_RENDER_STATE_AS_MARKDOWN` feature flag referenced inside `ThoughtMessage.tsx` is a **compile-time constant** (not an env var) and does not affect the hide-toggle feature.

### Configuration Files

- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/vitest.workspace.ts` — Vitest workspace defining `unit` and `integration` test projects. No changes needed.
- `/Users/Leonid_Kovalov/Developer/codemie-dev02/codemie-ui/package.json` — relevant deps: `primereact` 10.9.5 (OverlayPanel, Switch wrapper source), `valtio` 2.1.5, `react` 18.3.1, `tailwindcss` 3.4.17. All needed dependencies are already present.

### Feature Flags and Deployment Concerns

- `FEATURE_RENDER_STATE_AS_MARKDOWN` — a compile-time boolean constant in `ThoughtMessage.tsx` controlling whether certain tool results render as markdown. Not a deployment concern for this feature.
- No Docker/CI config changes are expected — this is a pure frontend UI feature with localStorage persistence.
- No backend schema changes are required if localStorage-based persistence is used (the simplest path). A backend change would only be needed if cross-device preference sync is required (which is not listed in acceptance criteria).

---

## 6. Risk Indicators

- **No test file for `ChatAiMessage.tsx`** — this is the primary rendering gate for the new toggle. A new test file `ChatAiMessage/__tests__/ChatAiMessage.test.tsx` must be created as part of this task. The `createMockThought()` factory is available to facilitate this.
- **No test file for `ThoughtMessage.tsx`** — indirectly affected; not required by this task but represents pre-existing coverage debt.
- **`SharedChatPage.tsx` must be handled** — this read-only page uses the same `ChatHistory` → `ChatAiMessage` pipeline. The `ChatContext` value it provides is minimal. The toggle should default to `true` (show tool outputs) in shared mode, and the `ChatConfiguration` panel button should not appear. If the toggle state is read from `useChatContext()` inside `ChatAiMessage`, the shared page's minimal context must supply a sensible default to avoid a crash or unexpected hide behavior.
- **Per-chat vs. global persistence decision** — the acceptance criteria say "persistent for the session or user preferences." Two distinct patterns exist: (a) per-chat localStorage via `chatStorageUtils` (like `dynamicToolsConfig`), or (b) global localStorage in `appInfoStore` (like `navigationExpanded`). The correct choice is ambiguous. Per-chat is closer to the existing chat-configuration pattern; global is closer to what a "preference" implies. This must be decided before implementation.
- **`ChatConfiguration` panel is only accessible when a chat is active** — if the toggle is placed in `ChatConfiguration.tsx`, it is not accessible from an empty/new chat screen. Verify whether this is acceptable UX.
- **`ThoughtRef` imperative API exists but is not needed** — `Thought.tsx` exposes `expand()`/`collapse()` refs. These are not needed for the hide feature (skipping rendering entirely at `ChatAiMessage` level is simpler), but care must be taken not to call these refs on unmounted components if they are used elsewhere.
- **No i18n layer** — the toggle label string will be hardcoded. If i18n is ever added, this label will need retroactive extraction.
- **`EPMCDME-11637` is a red herring** — the branch added a workflow editor token-limit field, not a chat display toggle. No patterns or utilities from that branch apply here.

---

## 7. Summary for Complexity Assessment

This task requires adding a persistent boolean toggle that hides/shows all tool output blocks (`Thought` components) in the chat message rendering pipeline. The affected architectural layers are: UI/Presentation (`ChatAiMessage.tsx`, new `ChatConfigHideToolOutputs.tsx`, `ChatConfiguration.tsx`), Chat Configuration Context (`useChatConfiguration.tsx`), and Persistence/Storage (`chatStorageUtils.ts`). The rendering gate is a single conditional guard at lines 198–203 of `ChatAiMessage.tsx`. Based on the existing `ChatConfigImageGeneration` pattern, the implementation involves approximately 5–6 files: one new component, three modified files (hook, config panel host, AI message renderer), one storage utility update, and at minimum one new test file.

The task follows a strongly established pattern. `ChatConfigImageGeneration.tsx` is a near-identical existing feature (a boolean Switch in the config sidebar that controls a chat-level display setting). The `Switch` component, `useChatContext()` hook, `ChatConfiguration` panel structure, and `chatStorageUtils` storage helpers are all already in place. Technical novelty is low — no new architectural patterns need to be introduced. The main judgment call is per-chat versus global localStorage persistence, which is a product-level decision rather than a technical difficulty.

Test coverage for the primary rendering gate (`ChatAiMessage.tsx`) is entirely absent, meaning new unit tests must be written as part of this task (a TDD-first deliverable). `Thought.tsx`, `ThoughtHeader.tsx`, and `ThoughtDocument.tsx` are well-tested and do not need modification. The key risk factors are: ensuring `SharedChatPage` handles a missing toggle state gracefully, choosing the right persistence scope (per-chat vs. global), and the test authoring effort for `ChatAiMessage` which has no prior test baseline.
