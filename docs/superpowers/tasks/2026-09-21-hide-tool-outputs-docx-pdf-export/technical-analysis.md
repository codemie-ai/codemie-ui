# Technical Research

**Task**: conversation export docx pdf
**Generated**: 2026-09-21
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-14774: Improve CodeMie conversation DOCX/PDF export by hiding tool outputs by default and preserving assistant response formatting. As a CodeMie user, I want DOCX and PDF conversation exports to be concise, readable, and stable by default, so that I can share conversation results without large technical tool output data and without export failures caused by excessive payload size. Currently, DOCX/PDF export may include large tool outputs, making exported files noisy and causing performance/stability problems including failed exports for large payloads. The default DOCX/PDF export should include only user prompts and assistant responses; tool outputs hidden by default, with a separate export option available for DOCX/PDF that includes tool outputs. JSON export behavior must remain unchanged (still includes tool outputs). The exported DOCX/PDF should preserve assistant response formatting as closely as possible (headings, paragraphs, bullet/numbered lists, tables, links, code blocks). For large exports, the UI should show an in-progress indicator (spinner) so users know export generation is running. Acceptance criteria include: default DOCX/PDF export excludes tool outputs; JSON unchanged; separate 'with tool outputs' export options exist for DOCX/PDF with clear labels; formatting preserved or cleanly rendered; large tool outputs not loaded/processed in the default export path; export more stable for large-tool-output conversations; visible in-progress indicator during export; duplicate-click handling; clear success/failure state after export.

---

## 2. Codebase Findings

### Existing Implementations

- `src/pages/chat/components/ChatHeader/ChatHeaderDownloadConversationButton.tsx` — the conversation export entry point. Renders an `OverlayPanel` menu (JSON / DOCX / PDF) and calls `chatsStore.exportChat(format)` for each `ButtonOverlay` item, then shows a `toaster.info(...)` success message on resolution. No loading/disabled state is applied while the export promise is in flight, and no failure-path toast is shown explicitly here (see below — failure toasts happen inside the API layer).
- `src/store/chats.ts` `exportChat(format)` (line ~466) — builds the request URL `v1/conversations/${chat.id}/export?export_format=${format}` and delegates to `api.downloadFileStream(url, undefined, fileName)`. This is the **only** parameter passed to the export endpoint; there is currently no query parameter or request option that toggles inclusion/exclusion of tool outputs.
- `src/store/chats.ts` `exportConversationAIMessage(chatID, historyIndex, messageIndex, format)` (line ~508) — a second, per-message export entry point hitting `v1/conversations/${chatID}/history/${historyIndex}/${messageIndex}/export?export_format=${format}`, used from `src/pages/chat/components/ChatHistory/ChatAiMessage/ChatAiMessageActions.tsx` (`exportMessage`). This is a related but separate export surface the ticket does not explicitly mention; it is in scope for consistency review but not named in the acceptance criteria.
- `src/utils/api.ts` `downloadFileStream(url, _type?, fileName?)` (line ~258) — the shared fetch-and-save helper for every file download in the app (chats, data sources, files, workflow executions, agent workspace). It performs a `GET`, streams the response body through a `ReadableStream`, builds a `Blob`, and calls `saveAs(blob, fileName)` (from `file-saver`). On a non-`ok` response it calls `this.handleError(body)` and returns `false`; on thrown errors it calls `toaster.error(...)` and returns `false`. It returns `true` on success and has **no progress/streaming callback** — the whole file is buffered into memory before `saveAs` fires, and the caller has no visibility into how long the request is taking beyond awaiting the promise.
- `src/pages/chat/components/ChatConfiguration/ChatConfigHideToolOutputs.tsx` and `src/pages/chat/hooks/useChatConfiguration.tsx` (`hideToolOutputs` / `setHideToolOutputs`, default `false`) — an **existing, unrelated** feature: a per-chat UI toggle that hides `Thought`/tool-output blocks in the live chat transcript display (`ChatAiMessage.tsx` line ~261: `{(!hideToolOutputs || thought.interrupted) && <Thought thought={thought} />}`). This state is persisted via `src/utils/chatStorageUtils.ts` (`chatHideToolOutputsKey`) per user/chat. It governs on-screen rendering only — it is not wired into `exportChat` or the export query string anywhere in the codebase. It is a naming-adjacent precedent (same concept, "hide tool outputs") but a structurally separate concern from the export feature this ticket targets.
- `src/types/chats.ts` — `export type ChatExportFormat = 'docx' | 'pdf' | 'pptx' | 'json'`. `pptx` is a fourth format present in the type and in `exportConversationAIMessage` test coverage, but is not offered in the `ChatHeaderDownloadConversationButton` menu (only json/docx/pdf are rendered there) and is not mentioned in the ticket.
- No DOCX/PDF generation library (no `docx`, `pdfmake`, `jspdf`, `html2pdf`, `puppeteer`, etc.) exists anywhere in `package.json` or `src/`. The only export-adjacent dependency is `file-saver` (`^2.0.5`), used purely to save an already-generated `Blob` returned by the backend. **The actual DOCX/PDF file generation — including any "hide tool outputs" filtering and formatting preservation of headings/lists/tables/links/code blocks — happens server-side**, in the `v1/conversations/{id}/export` endpoint of the separate `codemie` backend repository, not in `codemie-ui`.
- `src/pages/workflows/details/popups/WorkflowExecutionExportPopup.tsx` — an existing "export options" popup pattern (uses `Popup`, `RadioButton`, `Checkbox` from `@/components/form`) that lets a user pick an output format and a boolean option (`combined`) before calling a store export method. This is the closest existing UI pattern in the repo for "export with an extra option," useful as a structural reference for a possible "include tool outputs" choice, though the ticket's phrasing ("separate export option... with clear labels") suggests extra menu items rather than a modal — that decision is left to spec/design.
- `src/pages/skills/components/SkillDetailsActions.tsx` / `SkillDetailsPage.tsx` / `src/pages/settings/components/CustomAppearance/BasicSettings.tsx` — existing local `exporting`/`isExporting` boolean state patterns (`useState`, set `true` before the async export call, `false` in `finally`/after resolution) used to disable an export button and avoid duplicate clicks elsewhere in the app. `ChatHeaderDownloadConversationButton` does **not** currently follow this pattern — it has no local loading/disabled state guarding repeated clicks during an in-flight export.
- `src/components/Spinner/Spinner.tsx` — the shared spinner component (`LoaderSvg` with `animate-spin`), supports `inline` mode for embedding next to content rather than full-screen. Available for an in-progress export indicator; not currently used anywhere in the export flow.
- `src/components/Button/` — the shared `Button` component already supports an `isLoading` prop (renders a loading state and sets `disabled={disabled || isLoading}`), an existing mechanism for both the visible indicator and duplicate-click prevention requirement without needing a new component.

### Architecture and Layers Affected

- **Component layer** (`src/pages/chat/components/ChatHeader/ChatHeaderDownloadConversationButton.tsx`): export trigger UI, menu labels, and (per the ticket) new "with tool outputs" menu entries plus in-progress/duplicate-click UI state.
- **Store layer** (`src/store/chats.ts`): `exportChat` (and possibly `exportConversationAIMessage` for consistency) — the only place from which the export HTTP request is issued, per the repo's "API calls in Valtio stores only" convention (`.ai-run/guides/development/api-integration.md`).
- **HTTP client layer** (`src/utils/api.ts` `downloadFileStream`): shared by many features (chats, dataSources, files, workflowExecutions, agentWorkspace); any signature change here (e.g. adding query params, request options, or a progress callback) is cross-cutting and must not regress the other five call sites.
- **Backend / external service** (outside this repo — the `codemie` API, called via `v1/conversations/{id}/export?export_format=...`): owns the actual DOCX/PDF generation, the default tool-output filtering behavior, and formatting preservation (headings, lists, tables, links, code blocks). Nothing in `codemie-ui` renders or transforms document content for export — this repo only requests a file and saves the returned blob.

### Integration Points

- `ChatHeaderDownloadConversationButton` → `chatsStore.exportChat` → `api.downloadFileStream` → `GET v1/conversations/{chatId}/export?export_format={format}` (backend, external to this repo).
- `ChatAiMessageActions.tsx` → `chatsStore.exportConversationAIMessage` → `api.downloadFileStream` → `GET v1/conversations/{chatId}/history/{historyIndex}/{messageIndex}/export?export_format={format}` (backend, external to this repo). A second, per-message export path using the same downstream mechanics.
- `api.downloadFileStream` → `file-saver`'s `saveAs` (client-side, npm dependency `file-saver@^2.0.5`) to trigger the browser download once the blob is assembled.
- `api.downloadFileStream` → `api.handleError` / `toaster.error` (existing failure-path plumbing) and the caller's own `toaster.info(...)` on success — the two halves of the "clear success/failure state" acceptance criterion already exist but are not unified into one place.

### Patterns and Conventions

- All backend calls happen inside Valtio store methods (`src/store/*.ts`), never directly in components — enforced convention per `.ai-run/guides/development/api-integration.md` and `.ai-run/guides/patterns/state-management.md`.
- Export-with-options UI precedent: `WorkflowExecutionExportPopup.tsx` (`Popup` + `RadioButton`/`Checkbox`, calls a store export method with an options object, e.g. `{ output_format: type, combined: shouldCombine }`).
- Simple multi-format menu precedent: `ChatHeaderDownloadConversationButton.tsx`'s existing `OverlayPanel`/`ButtonOverlay` list — each item calls `handleExport(format)` with a distinct `ChatExportFormat` value and `aria-label`.
- Local `exporting` boolean + `finally` reset precedent: `SkillDetailsPage.tsx`, `BasicSettings.tsx` — `useState` guarding a button's `disabled` state during an async export call.
- Toast conventions: `toaster.info(...)` for export success, `toaster.error(...)` for failure — both already imported via `@/utils/toaster` in the existing export components.

---

## 3. Documentation Findings

### Guides and Architecture Docs

- `.ai-run/guides/development/api-integration.md` — governs where API calls must live (store methods only), the required `loading`/`error` state pattern for store actions, and calls out explicitly: *"When a field's absence or emptiness has meaning on the backend... do not guess from the UI side: read the backend handler in the `codemie` repo first... Adding a `defaultValue` or `required()` to such a field changes backend behavior — treat it as a cross-repo change, not a UI tweak."* This is directly relevant: the default-hide-tool-outputs behavior and the "with tool outputs" export variant are backend semantic contracts (a new/changed `export_format`-adjacent parameter), not something this repo can implement by itself.
- `.ai-run/guides/patterns/state-management.md` — Valtio store conventions (not read in full here; referenced by api-integration.md for store shape).
- `.ai-run/guides/testing/testing-patterns.md` — test file co-location (`__tests__/`), `*.test.tsx` (unit) vs `*.integration.test.tsx` (integration) naming, AAA pattern, `vi.mock()` at module level, `setupTests.unit.ts` auto-mocks `@/utils/api` and `useSnapshot`.
- `.ai-run/guides/architecture/architecture.md` — confirms `src/store/<feature>.ts` as the layer for backend calls; no export-specific architectural guidance found.
- No guide file specifically covers "export," "docx," "pdf," or "tool outputs" by name.

### Architectural Decisions

- No ADR or recorded decision document specific to conversation export or tool-output visibility was found in `docs/` or inline comments.
- No `NOTE:`/`HACK:`/`ADR:`/`DECISION:` markers were found in the export-related files inspected (`ChatHeaderDownloadConversationButton.tsx`, `chats.ts` export methods, `api.ts` `downloadFileStream`).

### Derived Conventions

- Export menu items are rendered as a flat list of `ButtonOverlay` buttons inside one `OverlayPanel`, each with its own `aria-label` describing the format ("Export your conversation as {FORMAT} format..."). Adding "with tool outputs" variants would most naturally extend this same list/labeling pattern unless a design decision moves to a popup (as in `WorkflowExecutionExportPopup`).
- Query-string parameters for export are appended by hand-built template strings (`?export_format=${format}`) rather than via `api.get`'s `{ params }` option, because `downloadFileStream` takes a raw `url` string built by the caller, not a params object.

---

## 4. Testing Landscape

### Existing Coverage

- `src/store/__tests__/chats.export.test.ts` — unit tests for `chatsStore.exportChat` (sanitized filename + format in the URL, fallback name when `chat.name` is undefined) and `chatsStore.exportConversationAIMessage` (derived generic filename). Both spy on `api.downloadFileStream` (mocked to resolve `true`/values) rather than exercising the real fetch/stream logic.
- `src/pages/chat/components/ChatHeader/__tests__/ChatHeaderDownloadConversationButton.test.tsx` — unit tests covering render, tooltip content, and accessibility attributes of the main trigger button. `chatsStore` and `toaster` are both mocked at module level (`vi.mock`). No test currently opens the overlay menu, clicks a specific format item, or asserts on `handleExport`/`toaster.info` behavior, and no test exercises a loading/disabled state (none exists yet) or duplicate-click prevention.
- No test file was found for `api.ts`'s `downloadFileStream` itself (it is mocked, not unit-tested, in `setupTests.unit.ts`).
- No test file was found for `ChatAiMessageActions.tsx`'s `exportMessage` function specifically (file exists but no `__tests__` sibling was located for it in this search).

### Testing Framework and Patterns

- Vitest 1.6.1 (per guide) + React Testing Library, two workspace projects (`unit`, `integration`) defined in `vitest.workspace.ts`.
- `setupTests.unit.ts` globally mocks `@/utils/api` (including binding `downloadFileStream`) and `useSnapshot`; `setupTests.tsx` is shared by both projects.
- AAA style, `vi.mock()` at module scope, `cleanup` in `afterEach`, `vi.hoisted()` used for shared mock objects referenced inside `vi.mock` factory functions (see `ChatHeaderDownloadConversationButton.test.tsx`'s `mockToaster`/`mockChatsStore`).

### Coverage Gaps

- No existing test asserts on the query string / request shape that would need to change to signal "include tool outputs" (e.g., an additional query parameter) — this behavior does not exist yet, so there is nothing to regress-test against, only new tests to write.
- No existing test covers opening the `OverlayPanel` menu and clicking an individual format button end-to-end (current tests only check the trigger button, not menu-item interaction or `handleExport` invocation with a specific format).
- No existing test covers a loading/in-progress indicator or duplicate-click prevention during export, because no such state currently exists in `ChatHeaderDownloadConversationButton.tsx`.
- No test exists for `exportMessage` (`ChatAiMessageActions.tsx`), which shares the tool-output/export-format concern at the per-message level.

---

## 5. Configuration and Environment

### Environment Variables

- No environment variables specific to export, DOCX/PDF generation, or tool-output visibility were found. The only relevant runtime configuration is the general API base URL (`VITE_API_URL`, `window._env_`) used by every `api.ts` call, including `downloadFileStream`.

### Configuration Files

- No dedicated config file governs export behavior. `ChatExportFormat` (in `src/types/chats.ts`) is the sole type-level definition of supported formats (`'docx' | 'pdf' | 'pptx' | 'json'`).

### Feature Flags and Deployment Concerns

- No feature flag or runtime toggle currently gates export behavior or tool-output visibility in export. The unrelated `hideToolOutputs` chat-display toggle (`useChatConfiguration.tsx`) is a per-chat, per-user UI preference stored via `chatStorageUtils.ts`, not a deployment-level flag, and is not wired to export.
- No Dockerfile, CI/CD manifest, or deployment template references "export," "docx," "pdf," or "tool output" — this appears to be a pure application-logic change with no deployment surface in this repo.

---

## 6. Risk Indicators

- Speculative: The core "hide tool outputs by default" and "preserve formatting" behavior is very likely implemented in the backend (`codemie` repo), not `codemie-ui`. If the actual document generation/filtering logic is out of scope for this repository, the ticket may require a coordinated backend change (new/adjusted `export_format`-related parameter) that this repo alone cannot deliver — the frontend piece may be limited to menu labels, a new request parameter, and UI-state (spinner/duplicate-click/success-failure) work. This should be clarified in scoping/spec before estimating.
- Speculative: `api.downloadFileStream` is shared by six call sites across `chats.ts`, `dataSources.ts`, `files.ts`, `workflowExecutions.ts`, and `agentWorkspace.ts`. Any signature change (e.g., adding a query-options parameter, a progress callback, or changing its return contract for a spinner/duplicate-click mechanism) risks touching unrelated download flows and their existing tests.
- The current `ChatHeaderDownloadConversationButton.tsx` has no loading/disabled state at all — the "duplicate-click handling" and "in-progress indicator" acceptance criteria require new state management here that does not exist today (unlike the `exporting` pattern already established in `SkillDetailsPage.tsx`/`BasicSettings.tsx`, which can be reused as a reference).
- `downloadFileStream` buffers the entire response into a `Blob` in memory before saving; for "large exports" this is itself a potential stability/performance concern independent of tool-output filtering, and the ticket's "in-progress indicator" requirement implies a UX affordance rather than a technical fix to this buffering behavior.
- Test coverage for the interactive export menu (opening the panel, clicking a specific format button, verifying `handleExport`/`toaster` calls per format) is currently thin — new "with tool outputs" menu items and new loading state will need net-new tests, not just updates to existing ones.
- `exportConversationAIMessage` (per-message export, used in `ChatAiMessageActions.tsx`) shares the `ChatExportFormat`/export-format concept but is not named in the ticket's acceptance criteria; a decision is needed on whether tool-output visibility should also apply there for consistency, or whether it is explicitly out of scope.
- No architectural or product decision record exists yet for "tool outputs in export" — the only related precedent (`hideToolOutputs` chat-display toggle) is a different feature with a similar name, which risks being confused with or unintentionally reused for the export toggle during implementation.

---

## 7. Summary for Complexity Assessment

This task touches three layers in `codemie-ui`: the export trigger component (`ChatHeaderDownloadConversationButton.tsx`, and possibly `ChatAiMessageActions.tsx` for per-message export), the Valtio store methods that issue the export request (`chatsStore.exportChat` / `exportConversationAIMessage` in `src/store/chats.ts`), and the shared HTTP download helper (`api.downloadFileStream` in `src/utils/api.ts`) that is reused by five other, unrelated download flows. Critically, no DOCX/PDF generation library exists anywhere in this repository — the export endpoint (`v1/conversations/{id}/export?export_format=...`) is served entirely by the separate `codemie` backend, meaning the ticket's core requirements around default tool-output filtering and formatting preservation (headings, lists, tables, links, code blocks) are very likely a backend concern that this repo cannot fully deliver alone; the frontend's realistic scope is the export-format parameter/menu surface, a "with tool outputs" variant, and UI feedback state.

Technical novelty is moderate: the UI patterns needed (a second set of menu items, a loading/disabled state during an async action, duplicate-click guarding, success/failure toasts) all have direct precedent elsewhere in the codebase (`WorkflowExecutionExportPopup.tsx` for options, `SkillDetailsPage.tsx`/`BasicSettings.tsx` for `exporting` boolean state, `Spinner`/`Button`'s `isLoading` prop for the indicator), so no new architectural pattern needs to be invented — but the change to `api.downloadFileStream`'s call contract, if the query-string approach isn't sufficient, has cross-cutting blast radius across `dataSources.ts`, `files.ts`, `workflowExecutions.ts`, and `agentWorkspace.ts`.

Test coverage posture is currently shallow but not absent: `chats.export.test.ts` and `ChatHeaderDownloadConversationButton.test.tsx` exist and mock `api.downloadFileStream`/`chatsStore` cleanly, giving a clear extension point, but neither currently exercises menu-item clicks, per-format URL assertions beyond the existing single-format case, loading state, or duplicate-click prevention — all of that is net-new test-writing, not modification of brittle existing tests. The primary risk factors are (1) the likely need for a coordinated backend change outside this repo, (2) the shared blast radius of `downloadFileStream`, and (3) the absence of any prior product/architecture decision record for tool-output handling in export specifically (as distinct from the similarly-named but unrelated `hideToolOutputs` chat-display toggle).

---

## 8. External References

None named by the task.
