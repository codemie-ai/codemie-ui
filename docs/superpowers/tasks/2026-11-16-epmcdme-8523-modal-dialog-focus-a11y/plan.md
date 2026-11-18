# EPMCDME-8523 Start execution modal a11y Implementation Plan

**Goal:** On "New Workflow Execution" open, initial focus lands on the Close button, and the paperclip button has an accessible name.

**Architecture:** Add an opt-out `autoFocus` prop to the shared `Editor` and use it only in `WorkflowStartExecutionPopup`, so `Popup`'s existing Close-first logic runs unobstructed.

**Conventions:** Commit per task using the repository's existing convention (no git operations are part of the tasks). Tests are written only when asked, so both tasks are `Test-first: no`.

## Fix location decision

Chosen: opt-out prop on `Editor`, not a change to the `Popup` guard.
- Root cause is `Editor.tsx:203-214` `onLoad` focusing Quill unconditionally; `Popup.tsx:141-143` then correctly refuses to steal focus already inside the dialog.
- Loosening the `Popup` guard would change every dialog with an autofocusing field and the `Popup.test.tsx` focus assertions.
- A default-true prop leaves `ChatPrompt`, `ChatUserMessage` and `ContinueWithInputPopup` byte-for-byte unchanged in behavior. `ContinueWithInputPopup` also calls `editorRef.current?.focus()` itself, and the ticket does not name it, so it stays out of scope.

## Task 1: Editor autoFocus opt-out and use it in the Start popup

Files: `src/components/Editor/Editor.tsx`, `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx`

Test-first: no — repo rules write tests only on request; the existing Editor has no focus-on-load test and jsdom mocks Quill, so verify manually in the browser.

- [ ] In `Editor.tsx:70-84` add `autoFocus?: boolean` to `EditorProps`; destructure it at `:88-102` with default `true`.
- [ ] In the `onLoad` handler (`Editor.tsx:203-214`), wrap the `setSelection(length, 0)` and `quill.focus()` calls (`:207-209`) in `if (autoFocus)`. `setSelection` also focuses Quill, so both must be guarded. Keep the innerHTML sanitize, aria attributes and `onEditorLoad` unconditional. Do not touch the imperative `focus()` at `:178-186`.
- [ ] In `WorkflowStartExecutionPopup.tsx:147-156` pass `autoFocus={false}` to `<Editor>`.
- [ ] Manual check: open Start execution, confirm focus is on Close, Tab reaches the prompt field, and chat prompt still autofocuses.

## Task 2: Accessible name for the paperclip button

Files: `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx`

Test-first: no — repo rules write tests only on request; the change is a single attribute matching `ChatPromptFileUpload.tsx:70`.

- [ ] In `WorkflowStartExecutionPopup.tsx:158-169` add `aria-label="Attach files"` to the button, next to the existing `data-tooltip-*` attributes. Use the same string as `ChatPromptFileUpload.tsx:70` for consistency.

## Negative-constraint pass

- Avoid regressing chat Editor autofocus: Task 1 default is `true`, so chat consumers are unchanged.
- Avoid regressing other dialogs using Popup: `Popup.tsx` is not modified.
- No test-writing tasks, no git operations: none planned.
- Minimal and surgical: two files, no new components.
