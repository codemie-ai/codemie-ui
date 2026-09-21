# EPMCDME-8534: Workflow Execution Prompt Field Label Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a visible, accessible label to the "Enter a starting prompt" editor field in WorkflowStartExecutionPopup and guard it with an accessibility test.

**Architecture:** `Editor.tsx` gains one optional prop (`ariaLabelledBy`) and one `useEffect` that writes the attribute to `quill.root` — mirroring the existing `data-placeholder` effect. `WorkflowStartExecutionPopup.tsx` renders a `<label>` with a stable `id` and passes that id to the Editor.

**Tech Stack:** React 18, TypeScript 5, PrimeReact Editor (Quill), Vitest + Testing Library.

**Spec:** Inline requirements — see Acceptance criteria below.

Commit per task using the repository's existing convention.

## Acceptance criteria

- [ ] A visible "Enter a starting prompt" label element appears before the editor in the New Workflow Execution dialog.
- [ ] The editor's `contenteditable` surface carries `aria-labelledby` referencing that label's `id`.
- [ ] A dedicated `WorkflowStartExecutionPopup.accessibility.test.tsx` file prevents regression.

## Global Constraints

- No new runtime dependencies.
- New `useEffect` follows the identical guard pattern as the existing `data-placeholder` effect in `Editor.tsx:128-133`.
- Accessibility test file follows the `*.accessibility.test.tsx` naming convention established under `src/pages/workflows/`.

---

### Task 1: Add `ariaLabelledBy` prop to `Editor.tsx`

**Files:**
- Modify: `src/components/Editor/Editor.tsx:68-97, 128-133`

**Interfaces:**
- Produces: `EditorProps.ariaLabelledBy?: string` — consumed by Task 2

**Test-first: no** — the prop follows the identical `data-placeholder` useEffect pattern already in the file; the ARIA wiring is exercised end-to-end by Task 2's accessibility test. TypeScript compile is the gate here.

- [ ] **Step 1: Add prop to `EditorProps` interface**

  In `src/components/Editor/Editor.tsx` at line ~78 (after `onFocusChange?`), add:

  ```ts
  ariaLabelledBy?: string
  ```

- [ ] **Step 2: Destructure the prop**

  In the destructuring at line ~83–96 (alongside `onEditorLoad`), add `ariaLabelledBy`.

- [ ] **Step 3: Add useEffect after the existing `data-placeholder` effect (line ~133)**

  ```tsx
  useEffect(() => {
    const quill = editorRef.current?.getQuill()
    if (quill && ariaLabelledBy) {
      quill.root.setAttribute('aria-labelledby', ariaLabelledBy)
    }
  }, [ariaLabelledBy])
  ```

- [ ] **Step 4: Verify TypeScript compiles**

  Run: `npm run type-check`
  Expected: no new errors.

- [ ] **Step 5: Commit**

---

### Task 2: Add visible label in popup and accessibility test

**Files:**
- Modify: `src/pages/workflows/details/popups/WorkflowStartExecutionPopup.tsx:136-145`
- Create: `src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.accessibility.test.tsx`

**Interfaces:**
- Consumes: `EditorProps.ariaLabelledBy?: string` from Task 1

**Test-first: yes** — write the accessibility test first; both assertions fail because the label element does not exist and `ariaLabelledBy` is not passed.

- [ ] **Step 1: Write the failing accessibility test**

  Create `src/pages/workflows/details/popups/__tests__/WorkflowStartExecutionPopup.accessibility.test.tsx`:

  ```tsx
  // Copyright 2026 EPAM Systems, Inc. ("EPAM")
  //
  // Licensed under the Apache License, Version 2.0 (the "License");
  // you may not use this file except in compliance with the License.
  // You may obtain a copy of the License at
  //
  //     http://www.apache.org/licenses/LICENSE-2.0
  //
  // Unless required by applicable law or agreed to in writing, software
  // distributed under the License is distributed on an "AS IS" BASIS,
  // WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  // See the License for the specific language governing permissions and
  // limitations under the License.

  import { render, screen } from '@testing-library/react'
  import { describe, expect, it, vi } from 'vitest'

  import WorkflowStartExecutionPopup from '../WorkflowStartExecutionPopup'

  // Expose ariaLabelledBy on a div[role=textbox] so we can assert the association.
  vi.mock('@/components/Editor/Editor', () => ({
    default: ({ ariaLabelledBy }: any) => (
      <div role="textbox" aria-labelledby={ariaLabelledBy ?? ''} />
    ),
  }))

  vi.mock('@/components/Popup', () => ({
    default: ({ children, visible }: any) =>
      visible ? <dialog open>{children}</dialog> : null,
  }))

  vi.mock('@/hooks/useFileUpload', () => ({
    useFileUpload: () => ({
      inputProps: {},
      addFiles: vi.fn(),
      removeFile: vi.fn(),
      openFilePicker: vi.fn(),
      hasActiveUploads: false,
    }),
    createFileMetadata: vi.fn((url: string) => ({ fileName: url, fileId: url, isUploading: false })),
  }))

  vi.mock('@/hooks/useUnsavedChangesWarning', () => ({
    useUnsavedChanges: vi.fn(() => ({ unblockTransition: vi.fn(), blockTransition: vi.fn() })),
  }))

  vi.mock('@/hooks/useVueRouter', () => ({
    useVueRouter: vi.fn(() => ({ name: 'some-route', push: vi.fn(), replace: vi.fn() })),
  }))

  vi.mock('@/store/workflowExecutions', () => ({
    workflowExecutionsStore: { createWorkflowExecution: vi.fn() },
  }))

  vi.mock('@/utils/toaster', () => ({ default: { error: vi.fn() } }))
  vi.mock('@/assets/icons/attachment.svg?react', () => ({ default: () => <span /> }))
  vi.mock('@/components/Spinner', () => ({ default: () => <div>loading...</div> }))

  const defaultProps = { workflowId: 'wf-1', isVisible: true, onHide: vi.fn() }

  describe('WorkflowStartExecutionPopup accessibility — prompt field label', () => {
    it('renders a visible label with text "Enter a starting prompt"', () => {
      render(<WorkflowStartExecutionPopup {...defaultProps} />)
      expect(screen.getByText('Enter a starting prompt')).toBeVisible()
    })

    it('prompt editor textbox is labelled by the visible label element', () => {
      render(<WorkflowStartExecutionPopup {...defaultProps} />)
      const labelEl = screen.getByText('Enter a starting prompt')
      const textbox = screen.getByRole('textbox')
      expect(labelEl).toHaveAttribute('id')
      expect(textbox).toHaveAttribute('aria-labelledby', labelEl.getAttribute('id'))
    })
  })
  ```

- [ ] **Step 2: Run test to confirm it fails**

  Run: `npm run test -- --project unit WorkflowStartExecutionPopup.accessibility`
  Expected: FAIL — "Unable to find an element with the text: Enter a starting prompt"

- [ ] **Step 3: Add the visible label and wire `ariaLabelledBy` in the popup**

  In `WorkflowStartExecutionPopup.tsx`, replace the `<div className="pt-1 mb-2 relative">` block at lines 136–145 so it reads:

  ```tsx
  <div className="pt-1 mb-2 relative">
    <label
      id="workflow-execution-prompt-label"
      className="block mb-1 text-sm font-medium text-text-secondary"
    >
      Enter a starting prompt
    </label>
    <Editor
      value={prompt}
      withMentions={false}
      className="workflow-execution-editor"
      placeholder="Enter a starting prompt"
      ariaLabelledBy="workflow-execution-prompt-label"
      onChange={setPrompt}
      onAddFiles={addFiles}
      onSubmit={handleSubmit}
    />
    ...
  ```

  The rest of the block (`<button>` for attachment, `<input {...inputProps} />`, etc.) is unchanged.

- [ ] **Step 4: Run test to confirm it passes**

  Run: `npm run test -- --project unit WorkflowStartExecutionPopup.accessibility`
  Expected: PASS — 2 tests pass.

- [ ] **Step 5: Verify TypeScript compiles**

  Run: `npm run type-check`
  Expected: no errors.

- [ ] **Step 6: Commit**

---

## Self-review

**Spec coverage:**
- Visible label before the Editor — Task 2, Step 3. ✓
- `ariaLabelledBy` prop on Editor, wired via `useEffect` to `quill.root` — Task 1. ✓
- Follow existing `data-placeholder` `useEffect` pattern — Task 1, Step 3 mirrors lines 128-133 exactly. ✓
- Accessibility test following workflows convention — Task 2, Step 1. ✓

**Negative constraints:** none stated in the requirements.

**Placeholder scan:** no TBD, no "similar to", no "handle edge cases" stubs — code shown in full for every step.

**Type consistency:** `ariaLabelledBy` is the name in both `EditorProps` (Task 1) and the JSX prop at Task 2 Step 3.
