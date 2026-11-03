# Workflow Call History Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Download and Copy to clipboard actions to the workflow node Call history popup (EPMCDME-15656).

**Architecture:** Client-side export from store data already shown in the UI. A pure formatter builds a JSON export; an awaitable clipboard helper makes failures observable; a `useCallHistoryExport` hook holds the handlers and toasts, and a `CallHistoryActions` component renders both buttons in the Call history popup header (next to the title), not inside the scrollable body. Commit per task using the repository's existing convention (ticket key required). Never stage `.codemie/codemie-cli.config.json` or `.env`; `git add` task files explicitly.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + RTL, existing `toaster`.

**Spec:** inline requirements (see Acceptance criteria). Research: `technical-analysis.md`.

## Acceptance criteria

- Call history popup header shows Download and Copy to clipboard buttons, right of the title, once records exist and all of the node's thoughts are loaded into the store.
- Both export all thoughts of the selected node as shown in the view: state id/name/status/started_at/completed_at/duration plus per-thought fields shown in the UI (id, author, tool, message/input, error, children, content); nothing else.
- `content` is exported as parsed JSON when it is a JSON object or array, otherwise `null`; `message` is exported untouched.
- Copy writes formatted JSON (2-space indent); Download saves a `.json` file.
- Success toast on both; actionable error toast on failure (clipboard unavailable or rejected).
- No records (or thoughts not loaded): info toast, no file, no clipboard write.
- Existing Call history popup behavior and integration test unchanged.

## Global Constraints

- Apache license header on every new file (copy from `WorkflowStateCallHistory.tsx:1-14`).
- Reuse `downloadCodeAsFile(code, 'json', filename)` (`src/components/CodeBlock/fileExtensions.ts:131`); do not add another Blob helper.
- Do not change behavior of existing `copyToClipboard`.
- Negative constraints: no backend change; no data beyond what the UI shows; no silent no-op on clipboard failure; no export when empty.

## Review Focus

- Thoughts partially missing from store (`getStateThought` returns undefined): skipped, same as the UI; if none remain, treated as empty.
- `navigator.clipboard` undefined (insecure context): error toast, not silent.
- `error` as boolean vs string and nested `children`: serialized faithfully, no crash.
- Buttons absent until every `state.thoughts` id is present in `executionStatesThoughts` (reactive via `useSnapshot`), since the header renders independently of the body's loading state.
- `content` that is plain text, invalid JSON, a JSON primitive, or missing: exported as `null`, no crash.
- Filename safe for node names with spaces/special characters.

---

### Task 1: Export formatter

**Files:**
- Create: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerHeader/callHistoryExport.ts`
- Test: `src/pages/workflows/details/WorkflowDrawer/WorkflowDrawerHeader/__tests__/callHistoryExport.test.ts`

**Interfaces:**
- Produces: `buildCallHistoryExport(state: WorkflowExecutionState, thoughts: Thought[]): CallHistoryExport | null` (null when `thoughts` is empty); `formatCallHistoryJson(exp: CallHistoryExport): string` (`JSON.stringify(exp, null, 2)`); `getCallHistoryFilename(state): string` (slugified name + execution id, no extension).
- `CallHistoryExport` = `{ execution_id, state_id, node, status, started_at, completed_at, duration_seconds | null, calls: [{ index, id, author_name, tool_name, author_type, input_text, message, error, children, content }] }`. Types from `src/types/entity/workflow.ts` and `conversation.ts`.
- `content` = `tryParseJsonObjectOrArray(thought.content ?? '')` (`src/utils/jsonHelpers`): parsed object/array, else `null`.

- [ ] **Step 1: Failing tests** `Test-first: yes — buildCallHistoryExport returns null for []; maps state fields and one call per thought with 1-based index; duration_seconds null when completed_at missing; keeps error string/boolean and children; keeps message untouched; JSON object/array content exported parsed (not an escaped string); plain text, invalid JSON, primitive or missing content exported as null; getCallHistoryFilename strips special characters.`
- [ ] **Step 2: Run** `npx vitest run --project unit <test path>` — expect FAIL (module missing).
- [ ] **Step 3: Implement** the three functions above; duration = completed_at - started_at in seconds.
- [ ] **Step 4: Run again** — expect PASS.

### Task 2: Awaitable clipboard helper

**Files:**
- Modify: `src/utils/helpers.ts` (after `copyToClipboard`, ~line 164) and re-export wherever `copyToClipboard` is re-exported via `utils/utils`.
- Test: `src/utils/__tests__/helpers.copyText.test.ts`

**Interfaces:**
- Produces: `copyTextToClipboard(text: string): Promise<boolean>` — resolves false if `navigator.clipboard` is missing or `writeText` rejects; true on success; shows no toast itself.

- [ ] **Step 1: Failing tests** `Test-first: yes — resolves true and calls writeText with the text; resolves false when navigator.clipboard undefined; resolves false when writeText rejects.`
- [ ] **Step 2: Run** `npx vitest run --project unit <test path>` — expect FAIL.
- [ ] **Step 3: Implement** `copyTextToClipboard` in `helpers.ts`.
- [ ] **Step 4: Run** — expect PASS.

### Task 3: Export actions in Call history popup header

**Files:**
- Create: `.../WorkflowDrawerHeader/useCallHistoryExport.ts` — hook returning `{ isReady, handleCopy, handleDownload }`.
- Create: `.../WorkflowDrawerHeader/CallHistoryActions.tsx` — renders two `Button variant={ButtonType.SECONDARY}` with icon + text "Download" and "Copy to clipboard" (aria-labels set); returns `null` while `!isReady`.
- Modify: `.../WorkflowDrawerHeader/WorkflowDrawerHeader.tsx` — replace the call-history `Popup` `header` string with `headerContent`: a `flex items-center justify-between` row holding an `<h4>` title (`Calls history for ${state.name}`) and `<CallHistoryActions state={state} />`.
- Modify: `.../WorkflowDrawerHeader/WorkflowStateCallHistory.tsx` — list only; no toolbar, no export imports or handlers.
- Test: `.../WorkflowDrawerHeader/__tests__/CallHistoryActions.test.tsx` (new), `.../WorkflowDrawerHeader/__tests__/WorkflowStateCallHistory.test.tsx` (reduced to rendering).

**Interfaces:**
- Consumes: Task 1 functions, Task 2 `copyTextToClipboard`, `downloadCodeAsFile`, `workflowExecutionsStore.getStateThought`, `useSnapshot(workflowExecutionsStore).executionStatesThoughts`, `toaster` (`success`/`info`/`error` per existing usage in `src/utils/toaster`).

Behavior: `isReady` = `state.thoughts.length > 0` and every `state.thoughts` id is present in `executionStatesThoughts` (the header is outside `WorkflowStateCallHistory`, so readiness comes from the store, not the body's `isLoading`). Handler collects `state.thoughts` -> `getStateThought` (drop undefined) -> `buildCallHistoryExport`. If null: `toaster.info('No call history records to export')`, return. Copy: on true `toaster.success('Call history copied to clipboard')`, on false `toaster.error('Could not copy call history. Clipboard access is unavailable; use Download instead.')`. Download: call `downloadCodeAsFile(json, 'json', getCallHistoryFilename(state))` in try/catch; success toast `Call history downloaded`, failure toast `Could not download call history. Please try again.`

- [ ] **Step 1: Failing tests** `Test-first: yes — CallHistoryActions with mocked (valtio proxy) store and helpers: Copy writes formatted JSON containing node/status/thought ids and shows success toast; Copy with clipboard failure shows error toast; Download calls downloadCodeAsFile with 'json' and shows success toast; Download throwing shows error toast; thoughts all missing from store -> info toast, neither helper called; no buttons when state.thoughts is empty; buttons appear only once thoughts are loaded into executionStatesThoughts. WorkflowStateCallHistory: renders loaded thoughts with no export buttons; shows "No call history available" when empty.`
- [ ] **Step 2: Run** `npx vitest run --project unit <test path>` — expect FAIL.
- [ ] **Step 3: Implement** hook, actions component, popup header and body cleanup as described.
- [ ] **Step 4: Run** the new tests, then `npx vitest run --project integration src/pages/workflows/__tests__/WorkflowDetailsPage.integration.test.tsx` — expect PASS (regression: existing popup test still green).

---

negative-constraints: honored — no backend task (Global Constraints, Tasks 1-3); only UI-visible fields exported (Task 1 fields, `content` parsed or null); clipboard failure observable (Task 2/3 error toast); empty case exports nothing (Task 3 info toast).
