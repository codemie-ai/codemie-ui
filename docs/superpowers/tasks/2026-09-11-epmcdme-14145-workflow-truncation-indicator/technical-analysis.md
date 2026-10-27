# Technical Research

**Task**: workflow execution state truncation chat drawer output
**Generated**: 2026-09-11T00:00:00Z
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14145: Workflow state output can be silently truncated without finish reason or truncated flag

## Context

- The backend (already shipped) now exposes `finish_reason` (`string | null`) and `truncated` (`boolean`) on every workflow execution state object — the state list/detail endpoints, the dedicated output endpoint, and the real-time stream event fired when a state finishes. A `SUCCEEDED` state can now carry `truncated: true`, meaning the final answer was cut off by a token limit; today the frontend renders that output as if it were complete, with no visual signal.
- Two independent frontend surfaces render workflow execution state output today and both are in scope for this story: the execution-detail drawer and the chat/thread view. Neither surface today has any concept of a truncation state.
- The frontend's hand-maintained response types for workflow execution states do not yet model `finish_reason`/`truncated` on any surface, and the code path behind the dedicated output endpoint currently narrows the response to just the output text, discarding any sibling fields — both will need updating regardless of visual design.
- The chat/thread view's live-update path has no confirmed equivalent of a 'state finished' stream event today; per user direction, live-update of the indicator on an in-progress execution is out of scope for this story — the indicator only needs to appear once a surface does its normal fetch of the state/output data.
- An existing warning-badge-with-tooltip pattern is used elsewhere in the app for similar 'extra detail on inspection' UI, but per user direction this story does not mandate reusing it — visual treatment is left to implementation-time design judgment.
- Both fields are additive and default to absent/false; a state persisted before the backend change, or any state where the answer wasn't truncated, must render exactly as it does today.

## Story

As a user viewing a workflow execution's output, I want a visible signal when the answer was cut off by a token limit, so that I don't mistake an incomplete answer for a finished one.

## Acceptance Criteria

- Given a workflow execution state with `truncated: true`, when the user views that state's output in the execution-detail drawer, then a visible indicator communicates the output may be incomplete.
- Given a workflow execution state with `truncated: true`, when the user views that state's output in the chat/thread view, then the same kind of visible indicator appears.
- Given a workflow execution state with `truncated: false`, or the field absent, when the user views that state's output on either surface, then rendering is unchanged from today.
- Given a truncation indicator is shown on either surface, when the user inspects it, then the raw `finish_reason` value is visible for debugging/support purposes.
- The frontend's workflow execution state response types must include `finish_reason` and `truncated` and not be discarded by any code path.

## Out of Scope

- No live-update of the indicator while an execution is in progress
- No retry/auto-continue logic
- No new execution status (truncated states remain SUCCEEDED)

---

## 2. Codebase Findings

### Existing Implementations

**Type definitions:**
- `src/types/entity/workflow.ts` (lines 95–111) — defines `WorkflowExecutionState` with `output: string | null`, `status`, `error`, `thoughts`; missing `finish_reason?: string | null` and `truncated?: boolean`; also defines `WorkflowExecution` (line 74) which similarly lacks truncation fields
- `src/types/entity/conversation.ts` — defines `ChatMessage` (line 153) with `executionId`, `executionStatus`, `stateId`; defines `HistoryItemBackend` (line 290) with same workflow fields; neither carries `finish_reason` or `truncated`

**Store / API layer:**
- `src/store/workflowExecutions.ts` — primary store; `getWorkflowExecutionStateOutput` (lines 591–603) hits `v1/workflows/.../states/${stateId}/output`, types response inline as `{ output: string | null }`, and returns only `data.output` — this is the root data-loss point where `finish_reason` and `truncated` are silently discarded
- `src/store/chats.ts` — `refreshWorkflowExecutionIds` (line 235) polls `v1/conversations/{id}` and hydrates `ChatMessage` fields; no provision for truncation signal in this pipeline

**Execution-detail drawer (surface 1):**
- `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx` — calls `getWorkflowExecutionStateOutput`, holds only `string` state, renders output inside a `CodeBlock` component using a `headerActionsTemplate` prop (already used for the expand button); **no truncation conditional rendering**
- `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowDrawerState.tsx` — layout shell hosting `WorkflowStateOutput` and `WorkflowStateInput` in a resizable panel pair; passes `stateId`, `stateUpdatedDate`, `stateCompletedDate`, `refreshKey`
- `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawer.tsx` — drawer root; passes `state: WorkflowExecutionState | null` and `refreshOutputKey` down through the component tree

**Chat/thread view (surface 2):**
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — renders `message.response` (the workflow final output) as Markdown; **no truncation check**; message data originates from the conversation poll pipeline
- `src/pages/chat/hooks/useWorkflowExecutionPoll.ts` — polls `refreshWorkflowExecutionIds` while any execution is in progress; drives chat-side state updates

**Other callers of `getWorkflowExecutionStateOutput` (affected by any signature change):**
- `src/pages/workflows/details/states/WorkflowExecutionEditOutputForm.tsx` — calls it to pre-populate the edit form; only uses `output`, not harmed by the narrowing but must remain compatible
- `src/pages/workflows/details/states/ContinueWithInputPopup.tsx` — calls it for pre-fill; same situation

**Shared components relevant to the indicator:**
- `src/components/StatusBadge/StatusBadge.tsx` — has a `Warning` status variant with aborted-color design tokens; directly reusable as the truncation badge
- `src/components/Tooltip/Tooltip.tsx` — thin PrimeReact tooltip wrapper
- `src/components/TooltipButton/TooltipButton.tsx` — canonical "info icon + tooltip" idiom using `InfoSvg`; existing pattern for "extra detail on inspection" UI
- `src/assets/icons/status-warning.svg` — warning SVG icon available

### Architecture and Layers Affected

1. **Type layer** — `src/types/entity/workflow.ts` and `src/types/entity/conversation.ts`: must add `finish_reason?: string | null` and `truncated?: boolean` to `WorkflowExecutionState`; `ChatMessage`/`HistoryItemBackend` may also need them depending on the chat surface data path chosen (see Integration Points)
2. **Store / API layer** — `src/store/workflowExecutions.ts`: must widen the inline response type of `getWorkflowExecutionStateOutput` and return all three fields; `src/store/chats.ts` may need updating if the chat surface uses the conversation poll to carry truncation
3. **Drawer UI layer** — `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/WorkflowStateOutput.tsx`: add conditional rendering for the truncation indicator, injected via `headerActionsTemplate` or adjacent to the output block
4. **Chat UI layer** — `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx`: add conditional rendering for the truncation indicator, conditional on a `truncated` field reaching the component via the `ChatMessage` shape

### Integration Points

**Internal module dependencies:**
- `WorkflowStateOutput` → `workflowExecutionsStore.getWorkflowExecutionStateOutput` → inline type `{ output: string | null }` (data-loss point to fix)
- `WorkflowDrawerState` → `WorkflowStateOutput` (prop chain: `stateId`, `stateUpdatedDate`, `stateCompletedDate`, `refreshKey`)
- `WorkflowDrawer` → `WorkflowDrawerState` (passes `state: WorkflowExecutionState | null`; fixing the type propagates here automatically)
- `ChatAiMessage` → `message.response` (from `chatsStore.openedChatsHistory`)
- `useWorkflowExecutionPoll` → `chatsStore.refreshWorkflowExecutionIds` → `HistoryItemBackend` → `transformChatBEtoFE` → `ChatMessage`

**Critical unresolved integration question — chat surface data path:**
The task context states "the backend now exposes `finish_reason`/`truncated` on the state list/detail endpoints and the dedicated output endpoint." The chat surface gets its data through the conversation endpoint (`v1/conversations/{id}`), not the execution-state endpoint. Whether the conversation endpoint also returns `truncated` on each history item is not confirmed from code inspection alone. Two implementation options exist:
- Option A: The conversation endpoint already includes `truncated` in `HistoryItemBackend` — extend the frontend type and propagate through `transformChatBEtoFE` and `ChatMessage`
- Option B: `ChatAiMessage` makes a secondary targeted fetch to the output or state endpoint using `message.stateId` to retrieve truncation status — new fetch pattern in the chat surface, higher cost

**External service:**
- Backend REST API at `v1/workflows/{workflowId}/executions/{executionId}/states/{stateId}/output` — this is the endpoint that already returns `finish_reason` and `truncated`; the frontend type must match what the backend now returns

### Patterns and Conventions

- Inline tooltip: `data-tooltip-id="react-tooltip"` + `data-tooltip-content="…"` attributes on any element — used throughout codebase including in `WorkflowStateOutput.tsx`
- Component tooltip: `<TooltipButton content="…" />` — canonical pattern for "info on inspection" (exact fit for exposing `finish_reason`)
- Warning badge: `<StatusBadge status="warning" text="…" />` — existing warning visual; uses design-system tokens, not raw Tailwind colors
- `CodeBlock` `headerActionsTemplate` prop — natural injection point for the drawer surface; already used in `WorkflowStateOutput` for the expand button
- Valtio store pattern: `proxy` with typed interface; async store methods; consumers call `useSnapshot(store)` — never read raw proxy in JSX
- Response parsing: `const data = await response.json()` — never `.data`; result mapped onto store fields
- Conditional render guard: boolean check `{isTruncated && <Indicator />}`, not ternary or numeric
- No magic strings: constants extracted to `src/constants/`
- `cn()` from `@/utils/utils` for all conditional class merges

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/architecture/architecture.md` — defines the 3-layer architecture (Page → Store → API via Valtio + custom fetch client); directly governs where `finish_reason`/`truncated` state must live (store layer) and how components consume it (`useSnapshot`)
- `.ai-run/guides/development/workflow-editor-patterns.md` — covers `WorkflowExecutionPage`, store structure (`editorState` vs `currentWorkflow`); clarifies that `finish_reason`/`truncated` belong on execution result objects, not editor canvas state
- `.ai-run/guides/components/component-patterns.md` — component construction rules: named `React.FC<Props>` interface, `className?: string` on presentational components, 300-line file limit, extract sub-component when complexity warrants
- `.ai-run/guides/patterns/state-management.md` — Valtio store template and async method pattern; governs how new fields are added to store shape and surfaced to components
- `.ai-run/guides/development/api-integration.md` — custom fetch wrapper rules; confirms `await response.json()` not `.data`; governs parsing the new backend fields
- `.ai-run/guides/styling/styling-guide.md` — Tailwind semantic tokens only; `cn()` for conditional class merges; no arbitrary values or inline styles

### Architectural Decisions

- No ADR directory or decision records found for the workflow execution domain.
- No CHANGELOG entries for "workflow" or "truncat" in the first 100 lines — this feature has no recorded prior art.
- The 3-layer Page → Store → API boundary is the governing structural decision; all new state must flow through the store, not be fetched inside components.

### Derived Conventions

- `finish_reason` and `truncated` must be optional fields (`?: `) on `WorkflowExecutionState`; absence must be treated as non-truncated (preserves backward compatibility for pre-backend-change states)
- Derived computed value (e.g., `isTruncated = !!state.truncated`) belongs in a store getter or utility, not inline in a component
- Any new constant (e.g., a `FINISH_REASON` namespace) goes in `src/constants/`
- Sub-component extraction: if the truncation indicator grows beyond a simple badge + tooltip inline, extract it as a named component under the surface's local directory
- The `headerActionsTemplate` injection point in `WorkflowStateOutput` is the correct placement for the drawer surface rather than modifying the `CodeBlock` component itself

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/__tests__/WorkflowStateOutput.test.tsx` — covers output fetching, display, expand popup, Raw/Markdown tabs, re-fetch on `stateId`/`refreshKey` change; does **not** cover `finish_reason` or `truncated`
- `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerState/__tests__/WorkflowCodeBlock.test.tsx` — covers the code-block-with-expand-popup primitive; no truncation concept
- `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerList/__tests__/WorkflowDrawerListItem.test.tsx` — covers list-item status labels (Failed/Aborted/Interrupted/Succeeded/Not Started); no truncation indicator
- `src/pages/workflows/details/states/__tests__/WorkflowExecutionStateControls.test.tsx` — covers Abort/Edit/Continue controls; no truncation
- `src/pages/chat/hooks/__tests__/useWorkflowExecutionPoll.test.ts` — polling hook start/stop; no truncation
- `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiMessage.test.tsx` — chat AI message rendering; workflow flag used only as `isWorkflow: false`; no truncation
- `src/store/__tests__/workflowExecutions.resumeWorkflowExecution.test.ts` — store resume method; no state output shape tests
- `src/utils/workflowEditor/helpers/executions/__tests__/applyExecutionStates.test.ts` — state-map building utilities; no rendering

### Testing Framework and Patterns

- Vitest with two projects: `unit` (jsdom + mocked Valtio/stores) and `integration` (real Valtio + real stores + mocked API via global fetch mock)
- `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`
- `vi.hoisted()` for hoisting store mocks before imports — used in every workflow test
- `vi.mock('@/store/workflowExecutions', ...)` with a `mockWorkflowExecutionsStore` object containing `vi.fn()` methods
- `ExecutionContext.Provider` wrapper helper (`renderWithContext`) used in `WorkflowStateOutput` and `WorkflowExecutionStateControls` tests — passes `workflowId`, `executionId`, `executionStatus`, `interruptedStateId`, `isResuming`, `resume`, `resumeWithMessage`, `refreshOutput`
- Inline component mocks for shared components using `data-testid` attributes for assertion
- SVG icon mocks returning `<svg data-testid="...">` stubs
- Global fetch mock in `setupTests.tsx` with a `requestRegistry` map for per-test overrides
- `waitFor` for async effects triggered by `useEffect` (store call + `setState`)
- `renderHook` + `vi.useFakeTimers()` / `vi.advanceTimersByTimeAsync()` for polling hooks

### Coverage Gaps

- `finish_reason` on `WorkflowExecutionState` — absent from type definition and has zero test coverage
- `truncated` flag on `WorkflowExecutionState` — same: absent from type and zero coverage
- Truncation indicator in `WorkflowStateOutput` (drawer surface) — no test verifies banner/badge/warning when `truncated: true`
- Truncation indicator in `ChatAiMessage` (chat surface) — no test in any chat component covers truncated workflow output
- `getWorkflowExecutionStateOutput` store method — no unit test for this method's response mapping; the fix to preserve `finish_reason`/`truncated` will be entirely untested without new tests
- `WorkflowDrawer.tsx` and `useWorkflowDrawer.tsx` — no test files at all
- Store-level handling of `finish_reason`/`truncated` in `workflowExecutions` store

---

## 5. Configuration and Environment

### Environment Variables

- `VITE_API_URL` — backend API base URL; default `/api`; runtime-overridable via `window._env_` from `config.js`; no change needed for this story
- `VITE_ENV` — environment label (`local`, `development`, `production`); drives mode checks
- `VITE_APP_VERSION` — displayed app version string
- `VITE_SUFFIX` — appended to WebSocket/protocol URL construction

### Configuration Files

- `config.js` — runtime config injected into `window._env_`; governs API base URL, environment label, app version; served from nginx and overrides build-time Vite env values; no changes needed for this story
- `src/utils/api.ts` — HTTP layer; `API.BASE_URL` resolved as `window._env_.VITE_API_URL || import.meta.env.VITE_API_URL`; the workflow output endpoint is already routed through this layer
- `src/constants/featureFlags.ts` — central feature flag registry; no existing flag for truncation; a new flag is not required by the acceptance criteria

### Feature Flags and Deployment Concerns

- No feature flag gates the truncation indicator — the acceptance criteria do not require one, and the fields are additive/backward-compatible
- `WORKFLOW_AI` (`features:workflowAI`) and `SUB_WORKFLOW` (`features:subWorkflow`) are the existing workflow-related flags; neither is relevant to this story
- No deployment manifest changes required — the API URL is runtime-configurable; the backend is already shipping the new fields; no environment variable additions needed
- The four Dockerfiles in the project serve different purposes; the root `Dockerfile` copies a prebuilt `dist/` and runs no `npm` — a rebuild (`npm ci && npm run build:prod`) is needed before deploying UI changes but requires no manifest edits

---

## 6. Risk Indicators

- **Chat surface data path is unresolved**: `ChatAiMessage` renders `message.response` populated by the conversation poll (`v1/conversations/{id}` → `HistoryItemBackend`). Whether the conversation endpoint exposes `truncated` on each history item is not confirmed from frontend code alone. If it does not, Option B (secondary fetch from `ChatAiMessage` using `message.stateId`) introduces a new fetch pattern in the chat surface that does not exist today and would add latency and complexity. This must be confirmed with backend team before implementation begins.
- **`getWorkflowExecutionStateOutput` has three callers** (`WorkflowStateOutput`, `WorkflowExecutionEditOutputForm`, `ContinueWithInputPopup`): any return-type change cascades to all three; `EditOutputForm` and `ContinueWithInputPopup` only consume `output` but must remain type-compatible after the widening
- **No store-level tests for `getWorkflowExecutionStateOutput`**: the fix to preserve `finish_reason`/`truncated` will be written without a regression safety net; new unit tests are required to cover the response mapping
- **`WorkflowDrawer.tsx` and `useWorkflowDrawer.tsx` have no tests at all**: changes that propagate `truncated` through the prop chain here are unverified at the drawer-root level
- **`ChatMessage` and `HistoryItemBackend` types lack `finish_reason`/`truncated`**: if the chat surface requires these fields on the conversation poll response, both types must be extended and `transformChatBEtoFE` must be updated — a broader change than the drawer surface alone
- **No existing UI precedent for "SUCCEEDED but incomplete" state**: the existing status indicators in `WorkflowDrawerListItem` cover Failed/Aborted/Interrupted/Succeeded/Not Started; truncated output sits in a new semantic category (Succeeded + degraded quality) that has no prior visual treatment to clone from
- **Tooltip for `finish_reason` debug info**: the acceptance criteria require the raw `finish_reason` value to be visible on inspection; `finish_reason` values are backend-defined strings with no documentation in this repo — the UI must render whatever value the backend sends without translating it

---

## 7. Summary for Complexity Assessment

The task touches five architectural layers: Type Definitions, Store/API, Drawer UI, Chat UI, and potentially Chat Store. The drawer surface is well-understood and low-risk — the change set is: extend `WorkflowExecutionState` with two optional fields, widen the inline response type in `getWorkflowExecutionStateOutput` to stop discarding them, and add conditional rendering (a badge or tooltip-button) inside `WorkflowStateOutput.tsx` using the existing `headerActionsTemplate` injection point or an adjacent slot. Existing patterns (`TooltipButton`, `StatusBadge`) map directly onto the acceptance criteria. Estimated file delta for the drawer surface alone: 3 files (`workflow.ts`, `workflowExecutions.ts`, `WorkflowStateOutput.tsx`).

The chat surface introduces meaningful uncertainty. `ChatAiMessage.tsx` renders data that flows through the conversation polling pipeline (`chatsStore` → `HistoryItemBackend` → `transformChatBEtoFE` → `ChatMessage`), not through the execution-state endpoint that now carries `finish_reason`/`truncated`. Whether the conversation endpoint already returns `truncated` on each history item must be confirmed before implementation. If it does, the chat surface adds ~3 more files (`conversation.ts`, `chats.ts` transform, `ChatAiMessage.tsx`). If it does not, a secondary fetch pattern must be introduced in `ChatAiMessage`, adding latency and architectural novelty to the chat surface — raising the total file count and introducing a pattern that does not exist today.

Test coverage posture is mixed. The drawer surface has a well-established test file (`WorkflowStateOutput.test.tsx`) with mature fixture and mock infrastructure (`ExecutionContext.Provider` wrapper, `vi.hoisted()` store mocks) — adding coverage for the new branch follows a clear template. The chat surface has `ChatAiMessage.test.tsx` but no truncation-aware cases. The store method `getWorkflowExecutionStateOutput` has no tests at all; any fix to the response narrowing is currently unguarded and must be covered from scratch. The unresolved chat data-path question and the lack of store tests for the method being modified are the primary risk factors for complexity scoring.
