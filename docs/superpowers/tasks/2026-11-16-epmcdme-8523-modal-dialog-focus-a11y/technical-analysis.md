# Technical Research

**Task**: modal accessibility workflow execution focus
**Generated**: 2026-11-16
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8523 [4.1.2, 2.4.3] Incorrect implementation of modal dialog (Bug, accessibility, Frontend Workflows).
Steps: On /workflows/my, click "Start execution" on a workflow -> "New Workflow Execution" modal opens. Expected: on open, focus moves to the "Close" button; screen reader announces role Dialog and name "New Workflow Execution"; focus trapped in modal; on close focus returns to invoking "Start execution" button.
Test results (NVDA): PASS dialog announced as "New Workflow Execution dialog"; FAIL initial focus goes to the "Enter a starting prompt" field instead of the "Close" button; PASS focus trapped; PASS focus returns to Start Execution button after Close/Cancel. Remaining problem: incorrect initial focus placement. Also FAIL: the attachment (paperclip) button is announced only as "button" with no accessible name.
Ticket: https://jiraeu.epam.com/browse/EPMCDME-8523. Branch EPMCDME-8523_fix-modal-accessibility.
Repo guides are under .ai-run/guides/ (see AGENTS.md); check patterns/modal-patterns.md and patterns/accessibility-patterns.md. Focus on: the shared Modal component (initial focus handling, autofocus), the workflow "Start execution"/New Workflow Execution modal, and the paperclip attachment button (file upload component, aria-label).

---

## 2. Codebase Findings

### Existing Implementations

Purpose A: focus enters a dialog on open, on the Close button.
- `src/components/Popup/Popup.tsx:137-157` `focusFirstElement`, wired as `onShow` (:227) with `focusOnShow={false}` (:225). Rules: returns early if `document.activeElement` is already inside the dialog (:143); else focuses PrimeReact close button unless `hideClose`; else first focusable (excluding PrimeReact sentinels); else content.
- Covered by `src/components/Popup/__tests__/Popup.test.tsx:162-` (close button focus on open, hideClose, trigger restore, stacked dialogs).
- Focus trap: `useFocusTrap` (`Popup.tsx:106`); focus restore to trigger: PrimeReact `focusElementOnHide` (Popup.test.tsx:214 comment). NVDA reported both PASS.

Purpose B: something inside the dialog takes focus before Popup's handler runs.
- `src/components/Editor/Editor.tsx:203-214` `onLoad` calls `quill.setSelection(length,0)` and `quill.focus()` unconditionally on every mount. No `autoFocus` prop or opt-out exists (`EditorProps`, :70-84). The imperative `focus()` on `EditorRef` is at :178-186.
- Consumers of Editor (non-test): `WorkflowStartExecutionPopup.tsx:147`, `ContinueWithInputPopup.tsx:138` (also calls `editorRef.current?.focus()` at :83 when visible), `ChatPrompt.tsx` (focus at :252,257,268), `ChatUserMessage.tsx`.
- The Popup's "do not steal focus already inside" guard (:141-143) is therefore what leaves focus in the prompt field when Editor loads first. This is the mechanism matching the NVDA FAIL. (Order of Quill load vs. Dialog `onShow` not runtime-verified.)

Purpose C: icon-only attachment button has an accessible name.
- Failing: `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx:158-169` button has only `data-tooltip-*` (tooltip text `WF_FILE_UPLOAD_MESSAGE`, `@/constants/chats`) and an `AttachmentSvg` child; no `aria-label`.
- Already named: `src/pages/chat/components/ChatPrompt/ChatPromptFileUpload.tsx:67-72` uses `aria-label="Attach files"` plus the same tooltip attributes; used by `ChatPrompt.tsx:347` and `ContinueWithInputPopup.tsx:154` (sibling workflow popup).
- Unnamed sibling: `ChatUserMessage.tsx:219-225` has visible text "Attach File" (named; not a defect).

Other touched code
- `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx` (opened from `RunWorkflowButton.tsx`, `WorkflowCard.tsx`, `WorkflowsList.tsx`, `ViewWorkflowHeader.tsx`, `EditWorkflowPage.tsx`, `NewWorkflowPage.tsx`): renders `Popup` with header "New Workflow Execution", `dismissableMask={false}`; body is replaced by `<Spinner inline />` while `isLoading`. Header gives `aria-labelledby` (Popup.tsx:258).

### Decisions Already in the Code
- Focus ownership: Popup owns initial focus (`focusOnShow={false}`, avoids double trap with `useFocusTrap`) - `Popup.tsx:133-136` comment. Alternative: PrimeReact focusOnShow; reason recorded in that comment.
- "Never steal focus already inside" - `Popup.tsx:141-143`; reason recorded (autofocused field, user typing). Alternative: always focus Close.
- modal-patterns.md "Focus & Keyboard" documents `useFocusOnVisible(inputRef, visible)` for auto-focusing the first input (guide :186), which conflicts with the ticket's Close-first expectation; Popup tests assert Close-first.
- Convention for icon-only buttons: `aria-label` (modal-patterns checklist :237, accessibility-patterns :13, :29); tooltip via `data-tooltip-id="react-tooltip"` alone is not a name.

### Task Statements Checked Against the Code
- "Dialog announced with name New Workflow Execution": holds (`header` -> `aria-labelledby`, Popup.tsx:258; h4 id at :169).
- "Focus trapped": holds (`useFocusTrap`, Popup.tsx:106).
- "Focus returns to invoker": holds (PrimeReact restore; Popup.test.tsx:190-).
- "Initial focus goes to prompt field": consistent with Editor.tsx:209 unconditional `quill.focus()` plus Popup.tsx:143 guard; not run in a browser.
- "Paperclip has no accessible name": holds (WorkflowStartExecutionPopup.tsx:158-169).
- Expected behavior "focus moves to Close" for a dialog whose Editor focuses on load keeps in place the Editor auto-focus mechanism (Editor.tsx:203-214), relied on by ChatPrompt/ChatUserMessage/ContinueWithInputPopup (see below).

### Consumers of Changed Contracts
Contract: Editor's focus-on-load behavior (if touched).
- `ChatPrompt.tsx` (252/257/268 also focus explicitly; whether it relies on onLoad focus for first render not verified).
- `ChatUserMessage.tsx` (edit-in-place; likely relies on load focus, unverified).
- `ContinueWithInputPopup.tsx:83` focuses explicitly on `visible`; this popup also sits in `Popup`, so it currently has the same Close-vs-editor ordering and the same mechanism (Popup default + Editor load focus + own focus call).
- `WorkflowStartExecutionPopup.tsx` - no explicit focus call.
Contract: Popup `focusFirstElement` (if touched): all `Popup` users (shared; ConfirmationModal and many pages), tests `Popup.test.tsx`.
Contract: `useFocusOnVisible` is mentioned in the guide; searched components only by guide text, not usages.

### Architecture and Layers Affected
Shared component (`components/Popup`, `components/Editor`), page-level popup (`pages/workflows/details/popups`), shared constants.

### Integration Points
PrimeReact `Dialog`/`Editor` (Quill), `useFileUpload` (`src/hooks/useFileUpload.tsx:226` `openFilePicker` clicks a hidden input), react-tooltip.

### Patterns and Conventions
Popup-only modals (guide rule); icon-only buttons `aria-label`; tests co-located in `__tests__`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/patterns/modal-patterns.md`, `.ai-run/guides/patterns/accessibility-patterns.md` (auto-focus section ~:109, restore focus ~:118).

### Architectural Decisions
Inline comment Popup.tsx:133-136 (focus/trap). No ADR found.

### Derived Conventions
Aria-label on icon buttons, as in `ChatPromptFileUpload.tsx:70`.

---

## 4. Testing Landscape

### Existing Coverage
- `src/components/Popup/__tests__/Popup.test.tsx` (focus management block :162-).
- `src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.accessibility.test.tsx`: mocks Popup, Editor, `useFileUpload`; asserts only the prompt label. Mocked Popup/Editor means no focus-order coverage here.
- `ContinueWithInputPopup.test.tsx` mocks an `aria-label="Attach files"` button.
- Integration: `WorkflowDetailsPage.integration.test.tsx`, `WorkflowsListPage.integration.test.tsx` mention the modal.

### Testing Framework and Patterns
Vitest + Testing Library (`vite.config.ts` `test.projects`), `vi.mock` of heavy children.

### Coverage Gaps
- No test of Editor focus-on-load (`src/components/Editor/__tests__` has only font tests).
- No test of the paperclip button's name in WorkflowStartExecutionPopup.
- No test of Close-vs-Editor focus order with real Popup + real Editor.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
None relevant.

### Feature Flags and Deployment Concerns
None found.

---

## 6. Risk Indicators

- Editor.tsx:209 unconditional `quill.focus()` is shared by four consumers; Speculative: changing it affects chat prompt autofocus (ChatPrompt, ChatUserMessage) - see Consumers.
- Popup.tsx:141-143 guard is shared by all Popups; Speculative: changing it affects every dialog with an autofocusing field and `Popup.test.tsx`.
- `ContinueWithInputPopup` shares the same focus pattern (explicit focus at :83); the ticket names only the Start popup. Keeps an existing mechanism in place (see Task Statements).
- Guide modal-patterns.md :186 (`useFocusOnVisible`) contradicts the Close-first expectation.
- Focus order Quill load vs. Dialog onShow is not runtime-verified; jsdom tests mock Quill.
- Pre-commit/gates per AGENTS.md: tests only when requested.

---

## 7. Summary for Complexity Assessment

The defect touches two layers: the shared `Popup` (already implements Close-first focus with a deliberate "don't steal focus already inside" guard) and the shared `Editor`, which unconditionally focuses itself on load (`Editor.tsx:209`). That combination is the likely cause of focus landing on the prompt field. The paperclip name defect is local to `WorkflowStartExecutionPopup.tsx:158-169`, where an identical, already-named button exists in `ChatPromptFileUpload.tsx:70`.

Surface: one page-level file for the label; one or two shared components if the focus fix lives there. Editor is used by four consumers, Popup by many. No new libraries, config, or backend. Existing tests cover Popup focus well but mock Popup and Editor in the workflow popup tests, and Editor focus has none.

Main risks are regression of chat prompt autofocus via Editor, and the unverified load-order assumption. The sibling `ContinueWithInputPopup` has the same pattern.

---

## 8. External References

None named by the task (Jira ticket URL not fetched; its content is quoted in the task context).
