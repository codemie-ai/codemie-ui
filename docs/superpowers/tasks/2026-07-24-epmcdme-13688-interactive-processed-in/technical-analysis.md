# Technical Research

**Task**: chat message metadata, interactive response rendering, "Processed in" duration/timestamp, chat state synchronization
**Generated**: 2026-07-24
**Research path**: filesystem (codegraph MCP not available in this environment)

---

## 1. Original Context

task_context (verbatim from Jira EPMCDME-13688, Bug, Major):

Summary: Chat: "Processed in" metadata is not shown immediately for interactive-only responses until page refresh

## Summary
The CodeMie chat UI does not display the **"Processed in"** metadata immediately for an interactive-only response. After refreshing the page, the missing metadata becomes visible.

## Description
When a user interacts with an interactive response in the chat, such as selecting checkbox options and submitting the response, the newly rendered follow-up response does not immediately show the expected **"Processed in"** text with processing duration and timestamp.

The same metadata appears correctly after the page is refreshed, which indicates that the response metadata is persisted but is not rendered correctly in the live chat UI state.

This creates an inconsistent chat output experience and may confuse users because response completion metadata is visible for regular responses but missing for interactive-only responses until reload.

## Preconditions
- User is authenticated in the CodeMie web application.
- User has an active chat session.
- The chat response contains an interactive UI surface, such as checkbox options and a submit button.
- The response produces an interactive-only follow-up message after user input is submitted.

## Steps to Reproduce
1. Open a CodeMie chat session.
2. Trigger a response that renders an interactive checkbox UI.
3. Select one or more checkbox options.
4. Click Submit.
5. Observe the newly rendered follow-up response immediately after submission.
6. Refresh the page.
7. Observe the same follow-up response after the page reloads.

## Expected Result
- The "Processed in" metadata is displayed immediately for the interactive-only response after it is rendered.
- The metadata includes the processing duration and timestamp, consistent with other chat responses.
- The metadata remains visible after page refresh.

## Actual Result
- The "Processed in" metadata is not displayed immediately for the interactive-only response.
- After refreshing the page, the missing "Processed in" metadata becomes visible.
- Screenshot shows a previous response displaying "Processed in: 3.20s / Jul 24, 10:08", while the interactive-only follow-up response does not show equivalent metadata immediately.

## Affected Areas
- CodeMie chat UI
- Interactive response rendering
- Chat message metadata rendering
- Frontend state synchronization after interactive input submission
- Conversation history rendering after page refresh

## Acceptance Criteria
- The "Processed in" metadata is displayed immediately for interactive-only responses after user submission.
- The metadata display behavior is consistent between regular assistant responses and interactive-only responses.
- Refreshing the page does not change whether the "Processed in" metadata is visible.
- The fix is validated for checkbox-based interactive responses.
- No regression is introduced for existing chat message rendering, tool call display, or message action buttons.

---

## 2. Codebase Findings

### Existing Implementations

**Render site of "Processed in"** — single occurrence in the whole repo:
- `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessage.tsx` — component `ChatAiMessage`, props `{ indexes: ChatIndexes; message: ChatMessage; totalMessages: number; onChangeMessageIndex }`.
  - Metadata row, lines 199–205:
    ```tsx
    {!isInProgress && (
      <div className="flex gap-2 text-xs items-center text-text-quaternary">
        <ProcessingCompleteSvg />
        {processingTime && <>Processed in: {processingTime}s / </>}
        <span>{formatDateTime(message.createdAt, 'short')} </span>
      </div>
    )}
    ```
  - Duration source, lines 165–167: `message.processingTime ? message.processingTime.toFixed(2) : null` (memoized). Note `0` is falsy, so a sub-10 ms duration would also hide the label.
  - Timestamp source: `message.createdAt` via `formatDateTime(..., 'short')`.
  - `isInProgress = message.inProgress`; while in progress the whole row is replaced by `<ThinkingLoader />`.
  - The string is hardcoded English — there is no app-level i18n layer (only a Keycloak-theme `i18n.ts`).

**Message model**
- `src/types/entity/conversation.ts:137-162` — `ChatMessage`: `role`, `request?`, `requestRaw?`, `response?`, `message?`, `createdAt: string`, `assistantId?`, `assistant`, `inProgress?: boolean`, `processingTime?: number` (line 147), `thoughts?`, `fileNames?`, `userMark?`, `debug?`, `loginUrl?`, `workflowExecution?`, `historyIndex?`, `messageIndex?`, `stream?: Stream | null`, `mcpAuthPromptRows?`, `executionId`, `stateId?`, `interactiveRequest?`, `interactiveResponse?`.
- Backend counterpart `HistoryItemBackend` (lines 259–273) carries `date` and `responseTime?: number`.
- `StreamChunk` (lines 292–299): `generated_chunk?`, `thought?`, `last?`, `generated?`, `debug?`, `interactive_request?`.
- Important structural note: one FE `ChatMessage` represents a **user+assistant turn pair** (`request` and `response` on the same object); `currentChat.history` is `ChatMessage[][]` where the inner array holds regenerated variants of the same turn.

**Live streaming path (where duration is written)**
- `src/store/chatGeneration.ts`:
  - `_sendRequest` (~line 837) captures `const startTime = new Date()`, then `api.stream(...)` (`src/utils/api.ts`) → `_handleStreamResponse`, or `_handleNonStreamResponse` if a plain `Response` comes back.
  - `_handleGenerationStream` (~1003) loops `reader.read()` and feeds `_handleChunk` (~1071); `_handleChunk` returns a `finalChunk` **only** from the `chunk.last` branch.
  - `_handleStreamResponse` (976–1001) — the finalize step:
    ```ts
    if (response?.generated) {
      historyItem.response = response.generated
      historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
      historyItem.debug = response.debug
    } else if (response?.capturedStreamText) {
      historyItem.response = response.capturedStreamText
      historyItem.processingTime = (endTime.getTime() - startTime.getTime()) / 1000
    }
    historyItem.inProgress = false
    historyItem.stream = null
    ```
  - By contrast `_handleNonStreamResponse` (~966) and `finalizeFailedRequest` (~206) set `processingTime` **unconditionally**.

**History (refresh) path — why the value appears after reload**
- `src/store/chats.ts` `getChat` (198–212): `GET v1/conversations/${id}` → `transformChatBEtoFE` → `setOpenChat`.
- `src/utils/chatHelpers.ts` `transformHistoryGroup` (110–165) pairs `group[2i]` (user) with `group[2i+1]` (assistant) and maps `createdAt: userItem.date`, **`processingTime: assistantItem.responseTime` (line 155)**, `interactiveRequest`, `interactiveResponse`, `inProgress: false`, `stream: null`. The server persists `responseTime` regardless of whether the assistant produced text — hence the metadata materializes on refresh.

**Interactive submit path — ROOT CAUSE**
- UI entry: `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiInteractiveBlock.tsx` → `InteractiveSurface.onSubmit` → `chatGenerationStore.submitInteractiveResponse({ request_id, kind, payload }, displayText, replaceHistoryIndex?)`.
- `src/store/chatGeneration.ts` `submitInteractiveResponse` (560–586) delegates to `createChatGeneration({ message: displayText, interactiveResponse, ... })`. **The append path is identical to a normal turn**: `_createHistoryItem` (415–439; sets `createdAt: new Date().toISOString()`, `inProgress: true`, no `processingTime`) → `_addMessageToHistory` (441) → `_sendRequest` → `_handleStreamResponse`.
- The divergence is at **finalize**, not at append. Two contributing mechanisms:
  1. An interactive-only follow-up carries no assistant text, so `response.generated` is empty/undefined and `capturedStreamText` is `''` (nothing was pushed into the `Stream` buffer). Both branches in `_handleStreamResponse` are skipped, so `processingTime` is never assigned; only `inProgress = false` and `stream = null` run. `createdAt` is present, so the timestamp half renders but `{processingTime && ...}` renders nothing.
  2. `_handleChunk` (1077–1096) is an `if / else if` chain:
     ```ts
     if (chunk.interactive_request) {
       historyItem.interactiveRequest = chunk.interactive_request
     } else if (chunk.thought) { ... } else { ... if (chunk.last) { return { finalChunk... } } }
     ```
     A terminal chunk carrying both `interactive_request` and `last: true` therefore never yields a `finalChunk`; the read loop exits on `done` with `response = {}` — again no `processingTime`.
- Fix surface: assign `processingTime` unconditionally in `_handleStreamResponse` before/independently of the text branches (mirroring `_handleNonStreamResponse` and `finalizeFailedRequest`), and consider the `_handleChunk` `interactive_request` + `last` interaction. Also beware the truthiness guard at `ChatAiMessage.tsx:202` (a `0` duration still hides the label).

### Architecture and Layers Affected

- **Presentation**: `src/pages/chat/components/ChatHistory/**` (`ChatAiMessage`, `ChatAiInteractiveBlock`, `ChatHistory`, `ChatHistoryGroup`, `ChatAiMessageActions`), `src/components/InteractiveElements/**`, `src/components/Thought/Thought.tsx`.
- **State (valtio)**: `src/store/chatGeneration.ts` (generation lifecycle, chunk handling, finalize — **primary change site**), `src/store/chats.ts` (conversation/messages container).
- **Transport/streaming**: `src/utils/api.ts` (`api.stream` returns a `ReadableStreamDefaultReader` — custom NDJSON, not SSE/EventSource) + `src/utils/stream.ts` (`Stream` buffer, `streamChunkToObject`).
- **Mapping/adapters**: `src/utils/chatHelpers.ts` (BE↔FE transform, `responseTime` → `processingTime`).
- **Types/contracts**: `src/types/entity/conversation.ts`, `src/types/entity/interactive.ts`, `src/types/chatGeneration.ts`.

Likely change surface is narrow: 1–2 source files (`src/store/chatGeneration.ts`, possibly `ChatAiMessage.tsx` for the falsy-`0` guard) plus tests.

### Integration Points

- `ChatAiMessage.tsx` → `chatsStore`, `chatGenerationStore`, `utils/helpers.formatDateTime`
- `ChatAiInteractiveBlock.tsx` → `chatGenerationStore.submitInteractiveResponse` → `createChatGeneration` → `_sendRequest` → `_handleStreamResponse`
- `chatGenerationStore` → `utils/api.stream` → `utils/stream.streamChunkToObject` → `_handleChunk` → mutates `historyItem` inside `chatsStore.currentChat.history`
- `chatsStore.getChat` → `utils/chatHelpers.transformChatBEtoFE` → `transformHistoryGroup`
- `InteractiveSurface` → `components/InteractiveElements/registry.ts` → `elementHandlers/*`
- External: backend `GET /v1/conversations/{id}` supplies `responseTime`; the streaming endpoint returns `application/x-ndjson`.

### Patterns and Conventions

- Valtio `proxy` singleton stores; components read via `useSnapshot` and **never mutate the snapshot** — mutations belong in store actions (`.ai-run/guides/patterns/state-management.md`).
- `historyItem` object identity is held for the whole request, so streaming and finalize mutate the same object the UI subscribes to (optimistic append → in-place finalize).
- Snake_case BE → camelCase FE conversion centralized in `chatHelpers.ts`.
- Interactive submits are modeled as ordinary chat turns with an extra `interactiveResponse` payload plus a display "chip"; re-answers reuse the edit path via `historyIndex`.
- Error/abort paths always finalize duration; the success stream path does so only conditionally — this inconsistency is the bug.
- Dates must always go through `formatDateTime` from `@/utils/helpers` — never native `Date` methods (`.ai-run/guides/development/code-organization.md`). `SHORT_DATE_FORMAT = 'MMM dd, HH:mm'` in `src/utils/helpers.ts:31-35` produces the "Jul 24, 10:08" form; duration is a plain `toFixed(2)` seconds float, no luxon.
- Style rules: TS strict, single quotes, no semicolons, `??` over `||`, Tailwind only, components < 300 lines, stores < 500 lines, function < 50 lines, cognitive complexity < 15.

---

## 3. Documentation Findings

### Guides and Architecture Docs

`.ai-run/guides/` exists and is the authoritative source (the repo's `AGENTS.md`/`CLAUDE.md` are stale copies from the backend repo — recorded in the EPMCDME-13259 analysis).

- `.ai-run/guides/patterns/state-management.md` — most binding guide for this fix: Component → Store → API, never skip layers; stores in `src/store/<domain>.ts` as a single named `proxy<T>`; components never mutate snapshots.
- `.ai-run/guides/development/api-integration.md` — `api.stream()` + manual reader loop convention; custom fetch wrapper (not Axios); §"Backend Semantic Contracts": when a field's absence is meaningful server-side, read the `codemie` backend handler and record the contract as a comment.
- `.ai-run/guides/development/code-organization.md` — `formatDateTime` mandate, size caps, no magic numbers.
- `.ai-run/guides/components/component-organization.md` / `component-patterns.md` — placement, internal ordering, explicit props interfaces, never `&&` on a numeric operand (directly relevant to the `{processingTime && ...}` guard).
- `.ai-run/guides/architecture/architecture.md` — layer responsibilities and boundaries.
- `.ai-run/guides/testing/testing-patterns.md`, `qa-strategy.md`, `qa-health.md` — see Section 4.
- `.ai-run/guides/quality-gates.md` — mandatory pre-MR order: `npm run lint` → `npm run typecheck` → `npm run test:unit` → `npm run test:integration`, all four must exit 0. Husky pre-commit runs lint-staged, license headers, secrets check, `sonar-local`; never `--no-verify`.
- `.ai-run/guides/standards/git-workflow.md` — branch `EPMCDME-XXXX_short-description` off `main`; commit/MR title `EPMCDME-XXXX: Capital sentence` (Tekton-enforced regex, no trailing period); squash merge.
- `.ai-run/guides/project.md` — prefix `EPMCDME`, project `codemie-ui-next`, MR target `main`.

`.claude/skills/`: `taf-regression-advisor` (relevant — regression scope), `sonarqube-mcp-analyzer` (relevant — quality gate/coverage), `integration-tester` v0.5.0 (relevant — page-level Store→UI flows belong in `ChatPage.integration.test.tsx`), `codemie-jira-assistant` (partly), `codemie-onboarding` (no). `.claude/agents/` is absent.

### Architectural Decisions

No formal ADR directory. Design decisions live in prior SDLC run artifacts:

- `docs/superpowers/tasks/2026-07-16-epmcdme-13259-interactive-chat-input/spec.md` (Status: Implemented) — the canonical decision record for interactive chat input. Key points bearing on this bug: the structured answer is sent as a **normal chat turn** via `submitInteractiveResponse(response, displayText, replaceHistoryIndex)` with optimistic chip + rollback on error; messages are immutable and "submitted" state is derived by `request_id`; block states are active / submitted / stale; `interactive_request` is handled in `_handleChunk`; `ChatAiMessage` renders the block after the markdown body inside `InteractiveErrorBoundary`.
- `.../2026-07-16-epmcdme-13259-.../technical-analysis.md` — records the NDJSON stream protocol (not SSE), the `_handleGenerationStream → _handleChunk → _handleThought` pipeline, and the "all API incl. streaming lives in valtio stores; element-state updates = direct proxy mutation on `historyItem`" convention.
- `docs/superpowers/tasks/2026-07-23-add-submit-button-spacing/spec.md` (EPMCDME-13673) — `InteractiveSurface` root is rendered in exactly one place (`ChatAiInteractiveBlock`); `ChatAiMessageActions` (`mt-1`) sits under **every** AI message and must not be disturbed — the "Processed in" row lives in that same footer region.
- `docs/superpowers/specs/2026-05-26-hitl-file-upload-design.md` (EPMCDME-12393) — earlier pause/resume plumbing (`resumeWorkflowExecution`, `isInterrupted`).

Run artifact convention for this task: `docs/superpowers/tasks/2026-07-24-epmcdme-13688-interactive-processed-in/` (already scaffolded with `.state.json`: flow `sdlc-task`, branch `EPMCDME-13688_fix-interactive-processed-in`). Prior full runs contain `technical-analysis.md`, `spec.md`, `plan.md`, `complexity-assessment.json`, `actual-complexity.json`, `gate-plan.json`, `code-review-final.json`, `decisions.jsonl`, `events.jsonl`, `qa-report.md`.

### Derived Conventions

- Precedent for post-stream metadata reconciliation already exists: `chatsStore.refreshWorkflowExecutionIds` (`src/store/chats.ts:218-239`) copies `executionId`/`stateId` from a fresh fetch onto live messages. If a client-measured duration is judged unacceptable, this is the established pattern for pulling server truth onto a live message.
- `ref()` is used to keep `AbortController` out of the valtio proxy; `Stream` instances are stored on the message and nulled at finalize.

---

## 4. Testing Landscape

### Existing Coverage

- `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiInteractiveBlock.test.tsx` — closest file to the bug. Renders `ChatAiMessage` with an `interactiveRequest`; asserts surface render, submit via `chatGenerationStore.submitInteractiveResponse`, locked/answered state, edit-unlock, stale-turn disabling. **Mocks `formatDateTime` but never asserts "Processed in" / `processingTime`.** Covers only `button`-type surfaces, not checkbox.
- `src/store/__tests__/chatGeneration.interactive.test.ts` — store-level interactive flow: `_handleChunk` storing `interactive_request`, `submitInteractiveResponse` chip + payload, assistantId resolution, optimistic rollback. No `processingTime` assertions. Natural home for the store regression test.
- `src/store/__tests__/chatGeneration.test.ts` (618 lines) — main store suite (create/edit/delete generation, stream handling); no `processingTime` assertions.
- `src/components/InteractiveElements/__tests__/InteractiveSurface.test.tsx` (551 lines) — checkbox/select/date surfaces, checkbox-only surface renders a Submit button, max-select disabling, validation. Pure component.
- `src/pages/chat/components/ChatHistory/__tests__/ChatMessageAction.test.tsx` — message action buttons (regression surface named in the AC).
- `src/pages/chat/components/ChatHistory/ChatAiMessage/__tests__/ChatAiAuthPrompt.test.tsx`, `src/pages/chat/__tests__/ChatPage.test.tsx`, `src/utils/__tests__/chatHelpers.test.ts`, plus chat sidebar/header/configuration/prompt suites and `chatGeneration.{prepareRequestData,storageGuards,resumeWorkflowExecution}.test.ts`.
- ~300 test files total, all in co-located `__tests__/`; ~20 `*.integration.test.*`.

### Testing Framework and Patterns

- Vitest **1.6.1** + @testing-library/react 16.3.0, jest-dom 6.6.3, user-event 14.6.1, jsdom 24.1.3, `@vitest/coverage-istanbul`.
- Config: `vite.config.ts` (`environment: 'jsdom'`, `globals: true`, `retry: 1`, `sequence.shuffle.files: true`, **no coverage thresholds**) and `vitest.workspace.ts` with two projects:
  - `unit` — `**/__tests__/**/*.{test,spec}.*` minus `*.integration.test.*`; setupFiles `./src/setupTests`, `./src/setupTests.unit`.
  - `integration` — `**/__tests__/**/*.integration.test.*`; env `./vitest-env-integration.ts`; setupFiles `./src/setupTests`, `./src/setupTests.integration`; `testTimeout: 15000`.
- **Unit tests globally mock valtio** in `src/setupTests.unit.ts` (`useSnapshot` returns the store object, `subscribe` is a no-op). Integration tests skip that file and use real proxies with real reactivity — so a true store→UI sync regression is only genuinely caught at integration level.
- Canonical chat component boilerplate (from `ChatAiInteractiveBlock.test.tsx`): `vi.hoisted` mutable store doubles, per-file `vi.mock('valtio')` override, `vi.mock('@/store/chatGeneration')`, `vi.mock('@/store/chats')`, `vi.mock('@/utils/helpers', () => ({ formatDateTime: vi.fn(() => 'Apr 30') }))`, heavy children stubbed (Avatar, Markdown, Thought, ChatAiMessageActions, ThinkingLoader, EditMessageModal), a local `createMessage()` factory and a local `renderMessage()` helper, `beforeEach` clearing mocks and resetting history.
- Store test pattern: plain-object store doubles at module scope, `vi.mock('@/utils/api')` exposing `stream/post/put/delete`, store **dynamically imported inside each test** so mocks apply, manual field reset in `beforeEach`.
- `src/test-utils/`: `integration.tsx` (`renderPage(path)`, `mockAPI(method, url, data, status?)`, `navigate` spy), `_mock-state.ts`, `component-interactions/` helpers. There is **no** shared chat render wrapper and **no** shared message fixture factory — each test defines its own.
- Guide rules: co-located `__tests__/`; `vi.mock()` at module level only; `cleanup` in `afterEach`; query priority `getByRole` > `findByRole` > … > `getByTestId` (last resort); do not re-mock `SettingsLayout`/`useVueRouter`; **explicit warning against `vi.useFakeTimers()`** (relevant since the fix concerns duration timing); coverage targets "not configured".
- Scripts: `test`, `test:unit`, `test:integration`, `test:coverage`, `lint`, `lint:fix`, `typecheck`, `check:pre-commit`, `sonar-local`, `license-headers:check`, `secrets:check`, `test-harness` (external Playwright sanity suite).
- No TDD/test-first mandate is stated in any guide.

### Coverage Gaps

- **"Processed in" / `processingTime` rendering in `ChatAiMessage` — zero tests anywhere.** Grep across all test files for `processingTime|Processed in` returns no hits in chat tests.
- No test asserts the metadata row at all (`formatDateTime(message.createdAt, 'short')`, `ProcessingCompleteSvg`, or the `!isInProgress` branch). `formatDateTime` is stubbed but never asserted.
- No test asserts `processingTime` after an interactive submit — the assignment sites `chatGeneration.ts:206`, `:966`, `:983`, `:987` are all unasserted.
- No end-to-end checkbox+submit-through-chat-state test: `InteractiveSurface.test.tsx` covers checkboxes in isolation, `ChatAiInteractiveBlock.test.tsx` covers only button surfaces.
- No test for `chatHelpers.ts:155` (`processingTime: assistantItem.responseTime`) — the refresh path that currently makes the value appear.
- **No chat integration test exists** (`src/pages/chat/**/*.integration.test.tsx` is absent). Every chat test mocks valtio, so real-reactivity re-render after a store mutation — the exact failure mode — is untestable with existing suites without adding one.
- `src/store/chats.ts` has no direct tests (`qa-health.md` lists it at 0%: "Core chat state, streaming, history management").
- No chunk-level stream-parsing tests (gap carried forward from the EPMCDME-13259 analysis).

---

## 5. Configuration and Environment

### Environment Variables

From `.env`; none gate chat, streaming, or interactive responses.
- `VITE_API_URL` — API base (`/api`); resolved as `window._env_?.VITE_API_URL || import.meta.env.VITE_API_URL` (`src/utils/api.ts:126`).
- `VITE_ENV` — environment name (`src/utils/utils.ts:62`).
- `VITE_SUFFIX` — host suffix for generated links.
- `VITE_APP_VERSION` — runtime only, via `config.js`.
- `VITE_ONBOARDING_ASSISTANT_SLUG`, `VITE_FEEDBACK_ASSISTANT_SLUG`, `VITE_CHATBOT_ASSISTANT_SLUG`, `VITE_PROMPT_ENGINEER_SLUG`.
- `VITE_ENTRY` (keycloakify build switch), `KC_ENTRA_*` (local Keycloak SSO only).

### Configuration Files

- `src/constants/chats.ts` — chat constants (`CHAT_MESSAGE_MARK`, `GENERATION_CANCELLED_MESSAGE`, recent-chat storage). No metadata/duration constants.
- `src/constants/configKeys.ts` — runtime config IDs from `GET /v1/config`; nothing chat-metadata related.
- `src/utils/helpers.ts:31-35` — `DEFAULT_DATE_FORMAT = 'MM/dd/yyyy, HH:mm'`, **`SHORT_DATE_FORMAT = 'MMM dd, HH:mm'`** (the "Jul 24, 10:08" form), `FILE_DATE_FORMAT`; `formatDateTime()` at line 76.
- `config.js` — runtime `window._env_` injection (Docker/nginx), overrides build-time env.
- `src/configs/` — only `releaseNotes.json` and `onboarding/`.

### Feature Flags and Deployment Concerns

- `src/constants/featureFlags.ts` + `src/utils/featureFlags.ts` (`isFeatureEnabled`, backed by `GET /v1/config`) + `src/components/FeatureGuard.tsx`. Flags: enterpriseEdition, userManagement, budgetManagement, favorites, pinnedAssistants, favoritesPage, mcpConnect, showAllProjects, requestHedging, teamsBotIntegration. **None gate chat metadata or interactive responses**; no flag usage anywhere under `src/pages/chat`.
- No i18n/translation layer — the "Processed in" literal is hardcoded JSX in `ChatAiMessage.tsx:202`.
- `mock-server/db.json` + `routes.json` (json-server, `npm run mock-server`, port 8080): `/v1/conversations` entries carry only `id, name, folder, pinned, date, assistant_ids, initial_assistant_id` — no history, no `responseTime`, no `interactive_request`. **Not usable to reproduce this bug.**
- CI: no `.gitlab-ci.yml` and no `.github/workflows` — CI is external **Tekton**, which enforces branch/commit-message regex and blocks MRs. `deploy-templates/` holds a Helm chart injecting runtime `VITE_*` into `config.js`.
- Local gates (also husky pre-commit): `lint`, `typecheck`, `test:unit`, `test:integration`, `license-headers:check`, `secrets:check`, `sonar-local`.

---

## 6. Risk Indicators

- **Zero existing test coverage for the affected render path.** `ChatAiMessage.tsx:165-205` (the "Processed in" row) has no assertions anywhere in ~300 test files. Any fix ships without a pre-existing safety net.
- **Zero coverage for the finalize assignments** at `src/store/chatGeneration.ts:206, 966, 983, 987`. A change there is unguarded by regression tests today.
- **Unit tests mock valtio globally** (`src/setupTests.unit.ts` stubs `useSnapshot`/`subscribe`), so a unit test cannot prove the live re-render after a store mutation — the literal failure mode of this bug. Proving AC #1/#2 end-to-end requires the first-ever chat integration test (`src/pages/chat/__tests__/ChatPage.integration.test.tsx`), which is greenfield for this repo.
- **No coverage thresholds configured** (`qa-strategy.md`, `qa-health.md`), so CI will not flag a coverage regression; `src/store/chats.ts` is documented at 0%.
- **Two plausible root-cause mechanisms**, not one. Fixing only the `_handleStreamResponse` conditional may leave the `_handleChunk` `if (interactive_request) / else if / else` chain swallowing a terminal `last: true` chunk. Both need to be reasoned about or the bug may reproduce for a different chunk shape.
- **Truthiness guard bug adjacent to the fix**: `{processingTime && ...}` at `ChatAiMessage.tsx:202` — `message.processingTime === 0` (sub-10 ms turn) also hides the label, and `component-patterns.md` explicitly forbids `&&` on a numeric operand. Touching this is in scope for "consistent behavior" but widens the diff.
- **Client-measured vs. server-persisted duration divergence is undocumented.** Live path computes `(endTime - startTime)/1000` client-side; refresh path takes server `responseTime`. AC #3 ("refreshing does not change whether the metadata is visible") is satisfied by either, but the two values may differ visibly. `api-integration.md` §Backend Semantic Contracts requires checking the `codemie` backend handler before assuming — that check is not recorded anywhere in this repo, and this analysis covered only the frontend repo.
- **Named regression surfaces sit in the same JSX footer region**: `ChatAiMessageActions` / `ChatMessageAction` (message action buttons) and `Thought` (tool call display). EPMCDME-13673 explicitly declared `ChatAiMessageActions` (`mt-1`) untouchable. `ChatMessageAction.test.tsx` exists; `Thought` regression coverage was not confirmed.
- **Checkbox surfaces are the AC-mandated validation case but are the least-covered path**: existing block-level tests use `button` surfaces only.
- **No documentation exists for the "Processed in" feature at all** — no guide, spec, or changelog entry mentions `processingTime`. Ground truth is code-only; `CHANGELOG.md` is stale.
- **No streaming/NDJSON guide** in `.ai-run/guides/`; `_handleChunk`/`_handleThought` merge semantics exist only in a prior run's technical-analysis.
- **`vi.useFakeTimers()` is discouraged by the testing guide**, yet the fix is about elapsed-time measurement — tests must assert "a number was set" rather than an exact duration.
- **Repo `AGENTS.md`/`CLAUDE.md` are stale copies from the backend repo** — only `.ai-run/guides/` is authoritative. Following the wrong file would produce non-conforming code.
- Local environment caveat (from user memory, not the repo): local ESLint alias resolution is known-broken in this checkout, which can make the mandated `npm run lint` gate fail spuriously; CI is the real arbiter.
- **codegraph MCP unavailable** — all findings come from filesystem exploration; line numbers are accurate as of this run but should be re-verified before editing.

---

## 7. Summary for Complexity Assessment

**Layers and change surface.** This is a narrowly-scoped frontend state bug with a precisely identified root cause. The defect lives in one function: `_handleStreamResponse` in `src/store/chatGeneration.ts` (lines 976–1001) assigns `historyItem.processingTime` only inside `if (response?.generated)` / `else if (response?.capturedStreamText)`. An interactive-only follow-up produces neither, so the field stays `undefined` and `ChatAiMessage.tsx:202`'s `{processingTime && ...}` renders nothing; on refresh, `chatHelpers.ts:155` maps the server's persisted `responseTime` onto the message and the label appears. A secondary contributing mechanism sits in `_handleChunk` (1077–1096), whose `if (chunk.interactive_request) / else if / else` chain never returns a `finalChunk` for a terminal chunk that carries both `interactive_request` and `last: true`. The sibling paths `_handleNonStreamResponse` (966) and `finalizeFailedRequest` (206) already set the duration unconditionally, so the fix is an alignment, not a new design. Expected production diff: 1–2 files, roughly 5–20 lines (`chatGeneration.ts`, optionally `ChatAiMessage.tsx` to replace the numeric `&&` guard that also hides a legitimate `0`). No type changes, no API changes, no new components, no config or feature-flag work — the domain has no i18n, no relevant env vars, and no flags.

**Technical novelty.** Low. The change follows established, documented conventions: valtio store actions mutate the retained `historyItem` in place, components never mutate snapshots, dates always go through `formatDateTime(..., 'short')`. A precedent for reconciling post-stream metadata already exists (`chatsStore.refreshWorkflowExecutionIds`) should the team prefer server truth over the client-measured `(endTime - startTime)/1000`. The one genuine open question is contractual rather than architectural: whether the displayed duration should stay client-measured (risking a visible mismatch with the value shown after refresh) or be sourced from the backend's `responseTime`. `api-integration.md` requires reading the `codemie` backend handler before assuming a semantic contract, and that check has not been performed — it is the single most likely source of scope expansion or rework.

**Test posture and risk weighting.** This is where the effort actually lands, and it should dominate the complexity score more than the production diff suggests. The affected code has **no test coverage at all**: no assertion anywhere for `processingTime`, "Processed in", the metadata row, the `!isInProgress` branch, or the `responseTime` → `processingTime` mapping; `chatGeneration.interactive.test.ts` exercises `submitInteractiveResponse` but never checks the finalized message. Worse, unit tests globally stub valtio's `useSnapshot`, so a unit test structurally cannot demonstrate the live re-render that this bug is about — a faithful regression test for AC #1–#3 needs the repo's **first chat integration test** (`src/pages/chat/__tests__/ChatPage.integration.test.tsx`, using `renderPage`/`mockAPI` from `@/test-utils/integration` with a fake NDJSON stream). Existing block-level tests also cover only `button` surfaces, while AC #4 mandates checkbox validation. Add the guide's caution against `vi.useFakeTimers()` (assert "a number is present", not an exact duration), the untested but AC-named regression surfaces in the same footer (`ChatAiMessageActions`, `Thought` tool-call display), the absence of any coverage thresholds in CI, and the fact that the mock-server has no chat history data to reproduce against. Net assessment: **trivial production fix, disproportionate and partly greenfield test work** — treat the test strategy, not the code change, as the risk driver.
