# Technical Research

**Task**: workflow chat assistant description intro
**Generated**: 2026-08-17
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-12922 — Display workflow description in workflow chat similarly to assistant description shown in assistant chat.

Problem / context:
- There is a UX inconsistency between assistant chat and workflow chat in CodeMie.
- In assistant chat, the assistant description is shown in the intro/start area (e.g., AI/Run Chatbot), helping users understand purpose/usage before first message.
- In workflow chat, even if the workflow has a configured description, it is NOT shown when starting the workflow in chat mode.
- Identified via customer feedback requesting workflow description be displayed similarly to assistant chat.

Related tickets: EPMCDME-9876, EPMCDME-10187

Preconditions:
- User authenticated in CodeMie
- Workflow exists with a configured description
- Workflow can be run in chat mode
- Assistant chat already supports displaying assistant description in intro/start area

Steps to reproduce:
1. Open CodeMie
2. Open an assistant with configured description and start chat
3. Observe assistant description shown in intro/start area
4. Open a workflow with configured description and run it in chat mode
5. Observe workflow chat intro/start area — description is missing

Expected result: If workflow has a configured description, it is displayed in workflow chat, consistent with assistant chat behavior.

Acceptance Criteria:
- Workflow chat displays the workflow description when the workflow has a configured description.
- Description shown in a consistent location/style relative to assistant chat behavior.
- If no workflow description is configured, workflow chat shows no empty placeholders/broken layout.
- Existing assistant chat behavior remains unchanged.
- Works for both existing and newly created workflows with descriptions.
- Validated in supported browsers.

Affected areas: Workflow chat UI, workflow metadata rendering in chat mode, UX consistency between assistants and workflows, frontend chat intro/start screen.

---

## 2. Codebase Findings

### Existing Implementations

- **`src/pages/chat/components/ChatPrompt/ChatPromptStarters.tsx`** — the single shared intro/welcome component rendered for *both* assistant chats and workflow chats. Props: `{ onStarterClick: (prompt: string) => void }` — no `description` prop is threaded in from the parent; the component derives description itself.
  - Reads `currentChat` and `assistants` via `useSnapshot(chatsStore)` / `useSnapshot(assistantsStore)`.
  - `lastAssistant = currentChat?.assistantData.find(({ id }) => id === currentChat.assistantIds[0])` — for a workflow chat this resolves to the **workflow's** id/name/icon (workflow chats reuse the `assistantData`/`assistantIds` shape).
  - `useEffect` (lines ~41-57) unconditionally calls `assistantsStore.getAssistant(lastAssistant.id, true)` to populate a local `description` state, with `skipErrorHandling: true` and `.catch(() => setDescription(null))`.
  - Renders description at lines ~101-108:
    ```tsx
    {lastAssistant && description ? (
      <p
        data-tooltip-id="react-tooltip"
        data-tooltip-content={description}
        className="max-w-sm mt-2 leading-5 text-text-quaternary text-sm line-clamp-3"
      >
        {description}
      </p>
    ) : ( ... )}
    ```
- **`src/pages/chat/ChatPage.tsx`** (lines ~130-138) — mounts `ChatPromptStarters` when `!currentChat?.history.length`, for both new assistant chats and new workflow chats. There is no separate `WorkflowChatPage`; one container serves both flows.
- **`src/pages/chat/components/ChatHeader/ChatHeader.tsx`** — already has the precedent pattern this fix should follow: branches on `currentChat?.isWorkflow` (lines 65, 80, 180) and uses `currentChat.initialAssistantId` as the workflow id for routing to `view-workflow`. Shows the `Conversation` type already carries everything needed to add an equivalent branch in `ChatPromptStarters.tsx`.
- **`src/pages/chat/components/ChatConfig/ChatConfigAssistants.tsx`** (line ~35) — explicitly special-cases `currentChat?.isWorkflow` to skip fetching assistant data ("Don't fetch assistants for workflow chats"), confirming this is an established pattern elsewhere in the chat feature — just not yet applied in `ChatPromptStarters.tsx`.
- **`src/store/workflows.ts`** — `getWorkflow(id): Promise<Workflow>` (lines ~209-228) calls `GET v1/workflows/id/${id}` and returns the full `Workflow` object including `description`, cast straight from the JSON response with no field allow-listing. This is the correct call to reuse in `ChatPromptStarters.tsx` for workflow chats — it is not currently imported/used there.
- **`src/store/assistants.ts`** — `getAssistant(id, skipErrorHandling)` (lines ~431-439) calls `GET v1/assistants/id/${id}`. When invoked with a workflow's id (as happens today), this 404s silently because of `skipErrorHandling: true` + `.catch()`.
- Workflow-chat start call sites all pass the workflow id through the same `assistantId` parameter of `chatsStore.startNewChat`:
  - `src/pages/workflows/components/WorkflowsList.tsx:156`
  - `src/pages/workflows/components/RunChatButton.tsx:43`
  - `src/pages/workflows/components/ViewWorkflowHeader.tsx:84`
  - `src/pages/chat/components/ChatSidebar/ChatSidebarWorkflows.tsx:47-50`
  - All call `chatsStore.startNewChat(workflowId, workflow.name, true)` (third arg = `isWorkflow`).
- **`src/store/chats.ts:295-315`** — `startNewChat` sends `initial_assistant_id=<workflowId>&is_workflow=true` to `GET v1/conversations/new`; response transformed by `transformChatBEtoFE`.
- **`src/utils/chatHelpers.ts:25-57`** — `transformChatBEtoFE` builds `Conversation.assistantData` from `AssistantDataBackend` regardless of whether the chat is an assistant chat or workflow chat, and sets `isWorkflow` from `chatBE.is_workflow_conversation ?? chatBE.is_workflow`.

### Architecture and Layers Affected

- **Presentation / feature-component layer**: `ChatPromptStarters.tsx` (the only file that needs the primary fix) — under `src/pages/chat/components/ChatPrompt/`.
- **State/store layer (Valtio)**: `assistantsStore` (`src/store/assistants.ts`) already used; `workflowsStore` (`src/store/workflows.ts`) needs to be imported into `ChatPromptStarters.tsx` (not currently imported there).
- **Type layer**: `src/types/entity/workflow.ts` (`Workflow.description?: string`) and `src/types/entity/assistant.ts` (`Assistant.description: string`) — both already model `description`; no type changes required.
- **Type layer (chat-session wire shape)**: `src/types/entity/conversation.ts` — `AssistantDataBackend` (lines ~238-246) and derived `AssistantData` (lines ~170-178) do **not** carry `description` for either entity type; this is why a component-level fetch (not a prop) is the existing pattern and should remain the pattern for the fix.
- No API/backend changes are indicated — `GET v1/workflows/id/${id}` already returns `description`.

### Integration Points

- `ChatPromptStarters.tsx` → `assistantsStore.getAssistant()` (existing) and needs → `workflowsStore.getWorkflow()` (to add), gated on `currentChat?.isWorkflow`.
- `currentChat.isWorkflow` (boolean, on `Conversation`/`chatsStore`) is the existing discriminator used elsewhere (`ChatHeader.tsx`, `ChatConfigAssistants.tsx`) and should be reused here for consistency.
- `currentChat.assistantIds[0]` / `currentChat.initialAssistantId` — for workflow chats this holds the workflow's id; same field is reused across the codebase as the "entity id regardless of type" pointer.
- Both `v1/workflows` (list) and `v1/workflows/id/{id}` (detail) endpoints already return `description` in practice (confirmed via `WorkflowCard.tsx:239-246` and `ViewWorkflowConfiguration.tsx:66` both rendering `workflow.description` directly from store data with no extra normalization stripping it).

### Patterns and Conventions

- Conditional branching on chat type: `currentChat?.isWorkflow` boolean check — already the established idiom (`ChatHeader.tsx`, `ChatConfigAssistants.tsx`). The fix should add the same check inside `ChatPromptStarters.tsx`'s description-fetch `useEffect`.
- Local component state + cache-then-fetch pattern: check an in-memory store cache first (`assistants.find(...)`), fall back to an async store method, with graceful fallback to `null` on failure. The workflow branch should mirror this exact shape using `workflowsStore` (check `workflowsStore.workflows`/cache equivalent, else `workflowsStore.getWorkflow(id)`).
- Styling: Tailwind-only utility classes, semantic color tokens (`text-text-quaternary` for "metadata/hints", `text-text-tertiary` for "descriptions/helper text" per `.ai-run/guides/styling/styling-guide.md`), `cn()` utility for conditional class merging, `??` (never `||`) for defaults. The existing description `<p>` markup/class list should be reused verbatim (or extracted into a small shared render helper) rather than introducing new styling for the workflow case.
- Tooltip pattern: `data-tooltip-id="react-tooltip"` + `data-tooltip-content={description}` (shared app-wide `react-tooltip` instance) — reused elsewhere (`ChatHeader.tsx:130-131`) and should be kept for the workflow description too.
- Component conventions per `.ai-run/guides/components/component-patterns.md`: store access only via `useSnapshot(store)` (never call API methods directly outside effects/handlers — current code already follows this), 300-line file limit, standard import → props → hooks → handlers → render → JSX ordering.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/` exists at repo root. Relevant files read:
  - `.ai-run/guides/components/component-patterns.md` — component structure/ordering conventions, conditional-rendering rules (`&&` vs ternary, `!!items.length &&` guard against rendering `"0"`), store-access-only-via-`useSnapshot` rule, 300-line file cap, `??` over `||`.
  - `.ai-run/guides/styling/styling-guide.md` — Tailwind-only mandate (no custom CSS/inline styles/arbitrary bracket values), semantic theme tokens only (`text-text-*`, `bg-surface-*`, `border-border-*`, never raw palette classes), `cn()` for conditional class merging. Confirms `text-text-quaternary` = "metadata, timestamps, hints" and `text-text-tertiary` = "descriptions, helper text" — the assistant description currently uses `text-text-quaternary`, which is one tier off the guide's own "descriptions" token; worth flagging but out of scope to silently "fix" without a decision (see Risk Indicators).
- No guide specifically documents "chat feature" architecture beyond the general Valtio-proxy-store/`useSnapshot` pattern and feature-folder co-location under `src/pages/<feature>/`.
- No guide mentions "assistant description" or "workflow description" specifically.

### Architectural Decisions

- No ADRs, design docs, or dated decision records found anywhere in `docs/` referencing assistant/workflow chat intro or description UX.
- `docs/superpowers/specs/decisions.jsonl` has no entries mentioning workflow/assistant/description/chat.
- Related tickets EPMCDME-9876 and EPMCDME-10187 have zero references anywhere in the repository (code, docs, changelog) — no historical context recoverable from the codebase itself.
- `CHANGELOG.md` (7 lines) does not mention this feature area.
- No `TODO`/`FIXME`/`HACK`/`NOTE:`/`ADR:`/`DECISION:` markers found in or around `ChatPromptStarters.tsx`, `src/store/workflows.ts`, or `src/store/assistants.ts` explaining the omission — it is an undocumented gap, not a deliberate deferral.

### Derived Conventions

- Chat-type discrimination is done via `currentChat.isWorkflow` throughout the chat feature (`ChatHeader.tsx`, `ChatConfigAssistants.tsx`, `useChatConfiguration.tsx`) — this is the convention to extend into `ChatPromptStarters.tsx`.
- The chat-session wire/state shape (`AssistantData`/`AssistantDataBackend`) intentionally stays minimal (id/name/icon/starters/context/tools/type) and additional per-entity detail (like `description`) is fetched on-demand at the component level via the relevant entity store, cached in that store's in-memory list. New workflow logic should follow this same on-demand-fetch-and-cache shape rather than trying to extend the wire/session type.

---

## 4. Testing Landscape

### Existing Coverage

- **No dedicated test file exists for `ChatPromptStarters.tsx`** anywhere in the repo (checked for `ChatPromptStarters.test.tsx` and equivalents — none found).
- The parent test, `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx:95`, fully stubs the component out: `vi.mock('../ChatPromptStarters', () => ({ default: () => null }))` — so no coverage flows through from the parent either.
- `src/pages/chat/ChatPage.integration.test.tsx` only exercises fixtures with `isWorkflow: false` / `assistantData: []` (lines ~118-135) — the workflow chat intro rendering path is not exercised at all.
- `src/pages/chat/components/ChatSidebar/__tests__/ChatSidebarWorkflows.test.tsx` is the closest existing "workflow in chat" test, but it covers the sidebar's recent-workflows list, not the chat intro/description area. Its inline `mockWorkflow` fixture (`{ id: 42, name: 'Deploy Pipeline', icon_url: null }`) does not include `description` — would need to be extended for a description-specific test.

### Testing Framework and Patterns

- Vitest 1.6.1 + React Testing Library, two workspace projects: `unit` (`*.test.tsx`) and `integration` (`*.integration.test.tsx`).
- Co-located `__tests__/` folders next to source (e.g. `src/pages/chat/components/ChatPrompt/__tests__/ChatPrompt.test.tsx`).
- AAA pattern, `cleanup` in `afterEach`, `vi.mock()` always at module level.
- Valtio store mocking pattern (seen in `ChatPrompt.test.tsx:25-59`):
  ```tsx
  const { mockChatsStore } = vi.hoisted(() => ({
    mockChatsStore: { currentChat: { id: 'chat-1', assistantIds: ['assistant-1'], isWorkflow: false, ... } },
  }))
  vi.mock('valtio', () => ({
    proxy: <T extends object>(obj: T): T => obj,
    useSnapshot: vi.fn((store) => store),
    subscribe: vi.fn(),
    ref: vi.fn((v) => v),
  }))
  vi.mock('@/store/chats', () => ({ chatsStore: mockChatsStore }))
  ```
- Explicit assertions (`getByText`/`getByRole`/`queryByText`), no `toMatchSnapshot()` usage observed in chat/assistant test files.
- Established naming idiom for this exact kind of test elsewhere in the repo: "shows X when present" / "does not show X when absent" (e.g. `AwsAgentCoreEndpointDetailsPopup.test.tsx:202,215`; `RemoteAssistantFormAccordion.test.tsx:220,227`) — this is the convention to follow for new description tests.
- No shared mock-factory files for `Assistant`/`Workflow` entities (e.g. no `mockAssistant.ts`/`mockWorkflow.ts`); every test inlines its own object literal (`ChatConfigAssistantCard.test.tsx:44-54`, `ChatSidebarWorkflows.test.tsx:84`).
- Test utilities available: `src/test-utils/integration.tsx` (`renderPage(path)`, `mockAPI(method, url, data, statusOrParams?)`, `navigate` spy) and `src/test-utils/component-interactions/` (widget interaction helpers).

### Coverage Gaps

- No test at all for `ChatPromptStarters.tsx` (assistant description rendering, present/absent branches).
- No test for the workflow-chat variant of the intro screen.
- No test asserting the `data-tooltip-content` tooltip wiring for the description text.
- A new test file (e.g. `src/pages/chat/components/ChatPrompt/__tests__/ChatPromptStarters.test.tsx`) will need to be created from scratch, covering both the assistant-description branch (new coverage for existing behavior) and the workflow-description branch (new feature), plus the "no description configured → no empty placeholder" acceptance criterion.

---

## 5. Configuration and Environment

### Environment Variables

- None identified specific to this feature. Description fetching relies on standard `api` HTTP client (`src/utils/api`) hitting `v1/assistants/id/${id}` and `v1/workflows/id/${id}` — no feature-flag-gated behavior found for either.

### Configuration Files

- No configuration files govern this feature area specifically. Standard app-wide API base URL configuration applies (outside this feature's scope).

### Feature Flags and Deployment Concerns

- No feature flags found gating assistant or workflow description display.
- No deployment manifests or CI/CD config reference this feature area.
- No secrets/credential concerns — this is a pure frontend read-path fix against already-existing, already-authorized endpoints.

---

## 6. Risk Indicators

- **Silent failure pattern already in production**: `ChatPromptStarters.tsx`'s current `assistantsStore.getAssistant(lastAssistant.id, true)` call uses `skipErrorHandling: true` and a bare `.catch(() => setDescription(null))`. When extending with a workflow branch, ensure the equivalent `workflowsStore.getWorkflow()` failure path also degrades gracefully (no error toast, no broken layout) per acceptance criteria — but avoid copying the "swallow everything silently" pattern without at least considering whether unexpected errors should be visible in dev/telemetry.
- **Zero existing test coverage for the exact component being changed** (`ChatPromptStarters.tsx`) — any regression risk in the assistant-description path (which must remain unchanged per acceptance criteria) is currently unguarded by tests. New tests must cover both the pre-existing assistant behavior and the new workflow behavior to avoid a silent regression.
- **No shared mock/fixture factory for `Assistant`/`Workflow`** — every test inlines its own literal; a new test will likely need a `description` field added inline, with no established shared fixture to reduce duplication risk across tests.
- **`currentChat.assistantData`/`assistantIds` naming is workflow-agnostic and reused for both entity types** — this is a subtle spot for future bugs; any fix must be careful to only branch on `currentChat.isWorkflow`, not on entity shape, since the shape is identical for both cases (only the fetched detail-object type differs).
- **No documentation or ADR explains the current omission** — this was not a deliberate scoping decision recorded anywhere; treat it as a straightforward bug/gap, not a constraint to preserve.
- **Styling token slightly inconsistent with the guide's own taxonomy**: the assistant description currently uses `text-text-quaternary` ("metadata, timestamps, hints") rather than `text-text-tertiary` ("descriptions, helper text") per `.ai-run/guides/styling/styling-guide.md`. Recommend keeping `text-text-quaternary` for consistency with existing assistant behavior (acceptance criterion: "Existing assistant chat behavior remains unchanged") rather than silently changing it as a side effect of this ticket — flag as a possible separate follow-up, not part of this fix.
- **Related tickets (EPMCDME-9876, EPMCDME-10187) have zero traceable context in the repo** — if they contain relevant prior decisions, that context is not recoverable from code/docs and would need to be pulled from the ticket tracker directly if needed.
- **Filesystem fallback path used (no codegraph MCP tool available in this environment)** — findings rely on Explore-agent grep/glob/read passes rather than a semantic call graph; file/line references should be spot-checked if used to anchor an implementation plan, though multiple independent research threads corroborated the same root cause and file locations.

---

## 7. Summary for Complexity Assessment

This is a small, well-localized frontend-only fix. The root cause is fully isolated to a single file, `src/pages/chat/components/ChatPrompt/ChatPromptStarters.tsx`: its description-fetching `useEffect` unconditionally calls `assistantsStore.getAssistant(id, true)` regardless of chat type, so for workflow chats it queries the wrong endpoint (using the workflow's id against the assistants API), fails, and the failure is silently swallowed, leaving the description empty. No backend changes are needed — `Workflow.description` already exists in the type model (`src/types/entity/workflow.ts:38`) and is already returned by the existing `GET v1/workflows/id/${id}` endpoint (`workflowsStore.getWorkflow`). The fix is to branch on the already-established `currentChat?.isWorkflow` discriminator (precedent exists in `ChatHeader.tsx` and `ChatConfigAssistants.tsx`) and call `workflowsStore.getWorkflow()` instead of/in addition to `assistantsStore.getAssistant()`, reusing the identical rendering markup, Tailwind classes, and tooltip pattern already in place. Estimated change surface: one primary component file, plus a new test file; no new types, no new endpoints, no new store methods (workflowsStore.getWorkflow already exists).

Technical novelty is low — the branching pattern (`currentChat.isWorkflow`) and the fetch-then-cache pattern are both already established idioms elsewhere in the same feature area, so this is a "copy an existing pattern into a new spot" change rather than something requiring new architecture. The main judgment call is where exactly to source the cached workflow list (mirroring the `assistants` cache-check pattern) and whether to extract a small shared helper for the fetch-or-fallback logic to avoid duplicating it across two branches.

Test coverage posture is the primary risk factor: there is currently zero test coverage for the component being modified, for either the assistant or workflow path, and the parent test fully stubs it out. This means the acceptance criterion "existing assistant chat behavior remains unchanged" cannot be verified by existing tests — new tests must be written from scratch covering: description present/absent for assistants, description present/absent for workflows, and no-broken-layout when no description is configured. This raises the effective effort somewhat above what the code-change size alone would suggest, but the overall risk remains low-to-moderate given the isolated blast radius and lack of backend/API/type changes required.
