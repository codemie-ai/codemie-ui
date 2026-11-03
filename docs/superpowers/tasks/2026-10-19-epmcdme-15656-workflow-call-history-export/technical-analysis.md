# Technical Research

**Task**: workflow execution call-history download clipboard
**Generated**: 2026-10-19
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-15656 — Enable export and clipboard copy of workflow call history from the Workflow tab

Description: Users need convenient ways to extract a workflow's call history directly from the Workflow tab for offline analysis, troubleshooting, and sharing information about potential problems. The Workflow tab should provide options to download call-history records as a file or copy the current call-history data to the clipboard. Both options should respect the user's access permissions and the current view, including any applied filters or date ranges.

Scenarios of Use: A user opens a workflow and navigates to the Workflow tab containing Execution history. Selects an execution-history record. Selects an executed node in the workflow execution and opens its Call history. Selects either Download or Copy to clipboard. Download generates and downloads a file with the current call-history records. Copy to clipboard copies the current records in a structured, readable format.

Affected Areas: Workflow tab UI; Workflow call-history view; execution and call-history data retrieval; export-file generation, clipboard integration, user feedback; access-control/permission enforcement; error handling for download and copy.

Acceptance Criteria:
- Users with access to a workflow can initiate a call-history download from the Workflow tab.
- Users with access can copy the current call-history data to the clipboard from the Workflow tab.
- Both actions include all call-history records available in the current view and respect applied filters or date ranges.
- Downloaded and copied data includes available info for analysis: call/execution identifier, timestamp, status, workflow step/node where available, duration, error details where available and permitted.
- Copied data uses a structured, readable format suitable for pasting into text editors, docs, collaboration tools.
- Both actions respect existing access permissions and do not expose information unavailable to the user in the UI.
- UI confirms successful download or copy and gives clear, actionable feedback on failure.
- If no records match the current view, inform the user and do not create a misleading empty download or clipboard entry.
- Existing Workflow tab and call-history functionality continues to work without regression.

---

## 2. Codebase Findings

### Existing Implementations
- `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerHeader/WorkflowDrawerHeader.tsx` — "Call history" button (hidden for start node) sets `activePopup='call-history'`; renders a `Popup` (`hideFooter`, header `Calls history for ${state.name}`) containing `WorkflowStateCallHistory`.
- `.../WorkflowDrawerHeader/WorkflowStateCallHistory.tsx` — the call-history view. Loads thoughts for `state.thoughts` ids via `workflowExecutionsStore.loadWorkflowExecutionOutput`, then renders each via `getStateThought(id)` into `WorkflowExecutionStateThought` (`details/states/`). Empty state text: "No call history available". It has no filter, date range, or toolbar.
- `src/store/workflowExecutions.ts` — `loadWorkflowExecutionOutput` (POST `v1/workflows/{wf}/executions/{ex}/thoughts` with ids, cached in `executionStatesThoughts`), `loadWorkflowExecutionOutputAll`, `getStateThought`. Throws on error.
- `src/types/entity/workflow.ts` `WorkflowExecutionState`: id, name, status, started_at, completed_at, date, update_date, output, error, thoughts, iteration_number, execution_id.
- `src/types/entity/conversation.ts` `Thought`: id, author_name, tool_name, author_type, message, input_text, children, in_progress, error (bool|string), interrupted, aborted, parent_id, content, routing. It has NO timestamp or duration field; timestamp and duration exist only at the state level (started_at/completed_at).
- Reusable helpers:
  - `copyToClipboard(message, notification?)` in `src/utils/helpers.ts` (re-exported via `utils/utils`). It shows a `toaster.info` on success and `toaster.error('Could not copy text')` on failure. It is a silent no-op when `navigator.clipboard` is missing, and it returns void, so the caller cannot know the outcome.
  - `downloadCodeAsFile(code, language, filename)` in `src/components/CodeBlock/fileExtensions.ts` — Blob + anchor download, text/plain only, returns the filename. A separate private `downloadFile(blob, filename)` exists in `markdown/tokens/MermaidDiagram.tsx`.
  - `api.downloadFileStream` in `src/utils/api.ts:257` is for server-side file downloads.
  - `CodeBlock.tsx` combines copy and download buttons, which is a UI precedent.

### Architecture and Layers Affected
Page component layer (WorkflowDrawerHeader / WorkflowStateCallHistory), Valtio store (`workflowExecutions`), shared utils (clipboard/download, toaster), and types. No dedicated backend export endpoint was found in the UI; the data already lives client-side in the store after the thoughts fetch.

### Integration Points
`useExecutionsContext` (workflowId, executionId, interruptedStateId); `toaster` util; backend `v1/workflows/{id}/executions/{id}/thoughts`. Parent `WorkflowDrawer.tsx` supplies `states` and `executionStatus`.

### Patterns and Conventions
Valtio store + `useSnapshot`; `Button variant="secondary"` with SVG icons; toasts for feedback; Apache license header on each file; the tests directory sits next to the component (`__tests__`).

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/` exists. Relevant: `components/component-patterns.md`, `patterns/state-management.md`, `development/error-handling-patterns.md`, `development/api-integration.md`, `patterns/accessibility-patterns.md`, `development/security-patterns.md`, `testing/testing-patterns.md`. I did not read them in depth; they were located only by listing.

### Architectural Decisions
None found specific to call-history export.

### Derived Conventions
Client-side Blob download and the shared `copyToClipboard` util are the existing approaches. Accessibility tests (`*.accessibility.test.tsx`) accompany action components.

---

## 4. Testing Landscape

### Existing Coverage
- `src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx` (lines ~647-741) — Call history button visibility and popup opening.
- `WorkflowDrawerListItem.test.tsx`, `WorkflowExecutions*.test.tsx` — adjacent.
- `src/utils/__tests__/toaster.test.ts`.

### Testing Framework and Patterns
Vitest + React Testing Library, projects `unit` and `integration`, user-event; `*.accessibility.test.tsx` convention.

### Coverage Gaps
No unit test for `WorkflowStateCallHistory` or `WorkflowDrawerHeader`. No test found for `copyToClipboard` in helpers (not exhaustively verified).

---

## 5. Configuration and Environment

### Environment Variables
None relevant found.

### Configuration Files
None relevant. `vite.config.ts` governs the test projects.

### Feature Flags and Deployment Concerns
None found for the workflow area. I did not check whether any flag gates the call-history UI.

---

## 6. Risk Indicators

- Speculative: "filters or date ranges" are mentioned in the ticket, but the call-history view has no filter or date-range UI (a grep of the WorkflowDrawer directory found none). The requirement may need a scope clarification, or it may mean the selected execution/node context.
- Speculative: `Thought` has no timestamp or duration, so the export may only carry state-level started_at/completed_at, or may need a backend change.
- `copyToClipboard` returns void and silently does nothing when `navigator.clipboard` is absent (non-secure contexts). This conflicts with the "clear actionable failure feedback" criterion.
- Thoughts are fetched lazily and cached; `loadWorkflowExecutionOutput` throws and the component does not catch it, so a failed load leaves the spinner state inconsistent. An export triggered during loading or after a failure needs guarding.
- Permissions: the data comes from the same store as the UI, so exporting from rendered/store data avoids over-exposure. Thought `children` and `error` fields may hold sensitive content, which is the same exposure as the UI.
- Thought `message`/`content` may be large; clipboard or file size is untested.
- Regression surface: the existing integration test drives the Call history popup.

---

## 7. Summary for Complexity Assessment

The change is concentrated in the frontend presentation layer: the call-history popup (`WorkflowStateCallHistory` / `WorkflowDrawerHeader`), with small additions to the shared util and type layers. The data is already available client-side via the `workflowExecutions` store. No backend export endpoint was found, and the primary file change surface is probably 2-4 source files plus a formatter util and tests. Existing copy and Blob download helpers can be reused, so technical novelty is low.

Test posture: the popup is only covered indirectly by one integration test, and the call-history component has no unit tests. The main uncertainties are requirement mismatches: the absence of filters/date ranges in the view, and the absence of per-call timestamp/duration in the `Thought` type. These affect scope more than the amount of code. There are no config, env, or deployment concerns.

---

## 8. External References

None named by the task.
