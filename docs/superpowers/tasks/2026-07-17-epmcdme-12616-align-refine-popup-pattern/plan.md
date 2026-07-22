# Align RefineWorkflowPromptPopup with GenerateWorkflowPopup Pattern

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor `RefineWorkflowPromptPopup` so it manages its own async state and API call internally, matching the `GenerateWorkflowPopup` pattern, and hide "Revert to Previous" until a refinement has been applied.

**Architecture:** Move `workflowsStore.refineWorkflowWithAI` from `EditWorkflowPage` into the popup. The popup gains `workflowId` + `currentYaml` props, manages its own `isLoading` state, and calls `onRefined(result)` on success. `EditWorkflowPage` captures the YAML snapshot at click time, drops `isRefining` state, and reacts to the result in a new `handleRefined` callback. "Revert to Previous" is hidden (`{preRefinementYaml && ...}`) instead of disabled.

**Tech Stack:** React 18, TypeScript, Valtio, Vitest + Testing Library, `@/store/workflows`, `@/components/Popup`, `@/components/Spinner`

## Global Constraints

- Never use `isMagic` prop on `Popup` — use `ButtonType.MAGICAL` on the confirm button only.
- `dismissableMask={false}` on all workflow popups.
- Error behavior: close popup + `toaster.error` (do **not** stay open on error — differs from `GenerateWorkflowPopup`).
- `Cancel` button is always visible; disabled while loading. Refine button hidden while loading.
- Loading UI: centered `<Spinner inline />` replacing form content (textarea + infobox hidden while loading).
- All test files use `vi.hoisted` for store mocks with `vi.mock('@/store/workflows', ...)`.

---

### Task 1: Rewrite `RefineWorkflowPromptPopup`

**Files:**
- Modify: `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx`

**Interfaces:**
- Consumes: `workflowsStore.refineWorkflowWithAI(workflowId: string, fields: WorkflowAIRefineFields): Promise<WorkflowAIRefineResponse>` from `@/store/workflows`
- Produces:
  ```ts
  interface RefineWorkflowPromptPopupProps {
    isVisible: boolean
    workflowId: string
    currentYaml: string
    onHide: () => void
    onRefined: (result: WorkflowAIRefineResponse) => void
  }
  ```

- [ ] **Step 1: Replace the file contents**

  Replace `src/pages/workflows/components/RefineWorkflowPromptPopup.tsx` with:

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
  //
  import { useEffect, useRef, useState } from 'react'

  import Button from '@/components/Button'
  import InfoBox from '@/components/form/InfoBox'
  import Textarea, { TextareaRef } from '@/components/form/Textarea'
  import Popup from '@/components/Popup'
  import Spinner from '@/components/Spinner'
  import { ButtonType } from '@/constants'
  import { workflowsStore } from '@/store/workflows'
  import { WorkflowAIRefineResponse } from '@/types/entity/workflow'
  import toaster from '@/utils/toaster'

  interface RefineWorkflowPromptPopupProps {
    isVisible: boolean
    workflowId: string
    currentYaml: string
    onHide: () => void
    onRefined: (result: WorkflowAIRefineResponse) => void
  }

  const RefineWorkflowPromptPopup = ({
    isVisible,
    workflowId,
    currentYaml,
    onHide,
    onRefined,
  }: RefineWorkflowPromptPopupProps) => {
    const textareaRef = useRef<TextareaRef>(null)
    const [prompt, setPrompt] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleHide = () => {
      setPrompt('')
      onHide()
    }

    const handleRefineClick = async () => {
      setIsLoading(true)
      try {
        const result = await workflowsStore.refineWorkflowWithAI(workflowId, {
          yaml_config: currentYaml,
          refine_prompt: prompt || undefined,
        })
        onRefined(result)
        handleHide()
      } catch (error: any) {
        handleHide()
        toaster.error(
          error?.parsedError?.error?.message ?? error?.message ?? 'Failed to refine workflow'
        )
      } finally {
        setIsLoading(false)
      }
    }

    useEffect(() => {
      if (!isVisible) return

      const focusTimeout = setTimeout(() => {
        textareaRef.current?.focus()
      }, 100)

      // eslint-disable-next-line consistent-return
      return () => clearTimeout(focusTimeout)
    }, [isVisible])

    return (
      <Popup
        hideFooter
        dismissableMask={false}
        visible={isVisible}
        onHide={handleHide}
        className="w-[600px]"
        header="Refine Workflow with AI"
      >
        {isLoading && (
          <div className="flex justify-center mt-4 mb-12">
            <Spinner inline />
          </div>
        )}

        {!isLoading && (
          <div className="flex flex-col gap-4">
            <p className="text-text-quaternary">
              Optionally describe what you&apos;d like to improve or refine about this workflow. AI
              will analyze your configuration and suggest improvements.
            </p>

            <div>
              <p className="mb-2 mx-1">What would you like to improve? (Optional)</p>

              <InfoBox className="my-2 mx-1 items-center">
                Leave it empty or describe specific areas you&apos;d like to refine.
              </InfoBox>

              <Textarea
                ref={textareaRef}
                rows={6}
                placeholder="For example: Add retry logic to the LLM step and improve error handling throughout the workflow."
                aria-label="What would you like to improve? (Optional)"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-end my-4">
          <Button variant={ButtonType.SECONDARY} onClick={handleHide} disabled={isLoading}>
            Cancel
          </Button>
          {!isLoading && (
            <Button variant={ButtonType.MAGICAL} onClick={handleRefineClick}>
              Refine with AI
            </Button>
          )}
        </div>
      </Popup>
    )
  }

  export default RefineWorkflowPromptPopup
  ```

- [ ] **Step 2: Type-check**

  ```bash
  npm run typecheck
  ```
  Expected: silent output, exit code 0. Fix any type errors before continuing.

- [ ] **Step 3: Commit**

  ```bash
  git add src/pages/workflows/components/RefineWorkflowPromptPopup.tsx
  git commit -m "EPMCDME-12616: Align RefineWorkflowPromptPopup with GenerateWorkflowPopup pattern"
  ```

---

### Task 2: Update `EditWorkflowPage`

**Files:**
- Modify: `src/pages/workflows/EditWorkflowPage.tsx`

**Interfaces:**
- Consumes (from Task 1): `RefineWorkflowPromptPopupProps` with `workflowId`, `currentYaml`, `onRefined`
- Produces: `handleRefined(result: WorkflowAIRefineResponse) => void` — applies result to form

- [ ] **Step 1: Remove `isRefining` state**

  Find and delete this line:
  ```ts
  const [isRefining, setIsRefining] = useState(false)
  ```

- [ ] **Step 2: Add `capturedYaml` state and update `handleRefineStart`**

  After the `showPromptPopup` state declaration, add:
  ```ts
  const [capturedYaml, setCapturedYaml] = useState('')
  ```

  Replace `handleRefineStart`:
  ```ts
  // Before:
  const handleRefineStart = () => setShowPromptPopup(true)

  // After:
  const handleRefineStart = () => {
    setCapturedYaml(formRef.current?.getFormValues()?.yaml_config ?? '')
    setShowPromptPopup(true)
  }
  ```

- [ ] **Step 3: Replace `handlePromptSubmit` with `handleRefined`**

  Remove the entire `handlePromptSubmit` function. Add in its place:
  ```ts
  const handleRefined = (result: WorkflowAIRefineResponse) => {
    setPreRefinementYaml(capturedYaml)
    formRef.current?.replaceYamlConfig(result.yaml_config)
    toaster.info('AI refine applied — save to confirm')
  }
  ```

  Make sure `WorkflowAIRefineResponse` is imported from `@/types/entity/workflow`. It is already imported via the existing types if the file uses it — check the import block. If missing, add it:
  ```ts
  import { WorkflowAIRefineFields, WorkflowAIRefineResponse, WorkflowRevertResponse } from '@/types/entity/workflow'
  ```

- [ ] **Step 4: Simplify the header "Refine with AI" button**

  Find the header Refine button and replace its content:
  ```tsx
  // Before:
  <Button
    type="magical"
    onClick={handleRefineStart}
    disabled={currentWorkflowLoading || !currentWorkflow || isRefining}
  >
    {isRefining ? (
      <>
        <Spinner inline rootClassName="pt-0" /> Refining…
      </>
    ) : (
      <>
        <AIGenerateSVG /> Refine with AI
      </>
    )}
  </Button>

  // After:
  <Button
    type="magical"
    onClick={handleRefineStart}
    disabled={currentWorkflowLoading || !currentWorkflow}
  >
    <AIGenerateSVG /> Refine with AI
  </Button>
  ```

  If `Spinner` is no longer used anywhere in the file after this change, remove its import.

- [ ] **Step 5: Hide "Revert to Previous" button by default**

  Find the "Revert to Previous" button and wrap it with a conditional:
  ```tsx
  // Before:
  <Button
    type="secondary"
    onClick={() => setShowRevertConfirm(true)}
    disabled={!preRefinementYaml}
  >
    Revert to Previous
  </Button>

  // After:
  {preRefinementYaml && (
    <Button
      type="secondary"
      onClick={() => setShowRevertConfirm(true)}
    >
      Revert to Previous
    </Button>
  )}
  ```

- [ ] **Step 6: Update the `RefineWorkflowPromptPopup` JSX**

  Find the `<RefineWorkflowPromptPopup ...>` usage and update its props:
  ```tsx
  // Before:
  <RefineWorkflowPromptPopup
    isVisible={showPromptPopup}
    isLoading={isRefining}
    onHide={() => setShowPromptPopup(false)}
    onRefine={handlePromptSubmit}
  />

  // After:
  <RefineWorkflowPromptPopup
    isVisible={showPromptPopup}
    workflowId={id}
    currentYaml={capturedYaml}
    onHide={() => setShowPromptPopup(false)}
    onRefined={handleRefined}
  />
  ```

- [ ] **Step 7: Type-check**

  ```bash
  npm run typecheck
  ```
  Expected: silent, exit code 0. Fix any errors (likely unused import of `WorkflowAIRefineFields` if `handlePromptSubmit` was the only caller — remove it if so).

- [ ] **Step 8: Commit**

  ```bash
  git add src/pages/workflows/EditWorkflowPage.tsx
  git commit -m "EPMCDME-12616: Update EditWorkflowPage — remove isRefining, hide Revert button by default"
  ```

---

### Task 3: Rewrite `RefineWorkflowPromptPopup` unit tests

**Files:**
- Modify: `src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx`

**Interfaces:**
- Consumes (from Task 1): `RefineWorkflowPromptPopupProps` with `workflowId`, `currentYaml`, `onRefined`

- [ ] **Step 1: Replace the test file contents**

  Replace `src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx` with:

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
  //
  import { render, screen, waitFor } from '@testing-library/react'
  import userEvent from '@testing-library/user-event'
  import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

  import RefineWorkflowPromptPopup from '../RefineWorkflowPromptPopup'

  const { mockWorkflowsStore } = vi.hoisted(() => ({
    mockWorkflowsStore: {
      refineWorkflowWithAI: vi.fn(),
    },
  }))

  vi.mock('@/store/workflows', () => ({
    workflowsStore: mockWorkflowsStore,
  }))

  vi.mock('@/utils/toaster', () => ({
    default: { error: vi.fn(), info: vi.fn() },
  }))

  vi.mock('@/components/Popup', () => ({
    default: ({ visible, header, children }: any) =>
      visible ? (
        <div data-testid="refine-popup">
          <h1>{header}</h1>
          {children}
        </div>
      ) : null,
  }))

  vi.mock('@/components/Spinner', () => ({
    default: ({ inline }: any) => <div data-testid={inline ? 'spinner-inline' : 'spinner'} />,
  }))

  const defaultProps = {
    isVisible: true,
    workflowId: 'wf-1',
    currentYaml: 'states: []',
    onHide: vi.fn(),
    onRefined: vi.fn(),
  }

  describe('RefineWorkflowPromptPopup', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    afterEach(() => {
      vi.clearAllMocks()
    })

    it('renders with correct header when visible', () => {
      render(<RefineWorkflowPromptPopup {...defaultProps} />)
      expect(screen.getByText('Refine Workflow with AI')).toBeInTheDocument()
    })

    it('does not render when not visible', () => {
      render(<RefineWorkflowPromptPopup {...defaultProps} isVisible={false} />)
      expect(screen.queryByText('Refine Workflow with AI')).not.toBeInTheDocument()
    })

    it('shows textarea and buttons when not loading', () => {
      render(<RefineWorkflowPromptPopup {...defaultProps} />)
      expect(screen.getByRole('textbox')).toBeInTheDocument()
      expect(screen.getByText('Cancel')).toBeInTheDocument()
      expect(screen.getByText('Refine with AI')).toBeInTheDocument()
    })

    it('shows centered spinner and hides form content while loading', async () => {
      mockWorkflowsStore.refineWorkflowWithAI.mockImplementation(
        () => new Promise(() => {}), // never resolves — simulates in-flight
      )
      const user = userEvent.setup()
      render(<RefineWorkflowPromptPopup {...defaultProps} />)
      await user.click(screen.getByText('Refine with AI'))
      expect(screen.getByTestId('spinner-inline')).toBeInTheDocument()
      expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
      expect(screen.queryByText('Refine with AI')).not.toBeInTheDocument()
    })

    it('Cancel is visible and disabled while loading', async () => {
      mockWorkflowsStore.refineWorkflowWithAI.mockImplementation(() => new Promise(() => {}))
      const user = userEvent.setup()
      render(<RefineWorkflowPromptPopup {...defaultProps} />)
      await user.click(screen.getByText('Refine with AI'))
      const cancelBtn = screen.getByText('Cancel').closest('button')
      expect(cancelBtn).toBeInTheDocument()
      expect(cancelBtn).toBeDisabled()
    })

    it('calls workflowsStore.refineWorkflowWithAI with correct args on submit', async () => {
      mockWorkflowsStore.refineWorkflowWithAI.mockResolvedValue({ yaml_config: 'states: []\n# refined' })
      const user = userEvent.setup()
      render(<RefineWorkflowPromptPopup {...defaultProps} />)
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Add retry logic')
      await user.click(screen.getByText('Refine with AI'))
      await waitFor(() => {
        expect(mockWorkflowsStore.refineWorkflowWithAI).toHaveBeenCalledWith('wf-1', {
          yaml_config: 'states: []',
          refine_prompt: 'Add retry logic',
        })
      })
    })

    it('sends refine_prompt: undefined when prompt is empty', async () => {
      mockWorkflowsStore.refineWorkflowWithAI.mockResolvedValue({ yaml_config: 'states: []' })
      const user = userEvent.setup()
      render(<RefineWorkflowPromptPopup {...defaultProps} />)
      await user.click(screen.getByText('Refine with AI'))
      await waitFor(() => {
        expect(mockWorkflowsStore.refineWorkflowWithAI).toHaveBeenCalledWith('wf-1', {
          yaml_config: 'states: []',
          refine_prompt: undefined,
        })
      })
    })

    it('calls onRefined with result and closes popup on success', async () => {
      const result = { yaml_config: 'states: []\n# refined' }
      mockWorkflowsStore.refineWorkflowWithAI.mockResolvedValue(result)
      const onRefined = vi.fn()
      const onHide = vi.fn()
      const user = userEvent.setup()
      render(
        <RefineWorkflowPromptPopup {...defaultProps} onRefined={onRefined} onHide={onHide} />,
      )
      await user.click(screen.getByText('Refine with AI'))
      await waitFor(() => {
        expect(onRefined).toHaveBeenCalledWith(result)
        expect(onHide).toHaveBeenCalled()
      })
    })

    it('closes popup and shows toaster.error on API error', async () => {
      mockWorkflowsStore.refineWorkflowWithAI.mockRejectedValue(new Error('Network error'))
      const onHide = vi.fn()
      const user = userEvent.setup()
      render(<RefineWorkflowPromptPopup {...defaultProps} onHide={onHide} />)
      await user.click(screen.getByText('Refine with AI'))
      const toaster = (await import('@/utils/toaster')).default
      await waitFor(() => {
        expect(onHide).toHaveBeenCalled()
        expect(toaster.error).toHaveBeenCalled()
      })
    })

    it('calls onHide when Cancel is clicked', async () => {
      const onHide = vi.fn()
      const user = userEvent.setup()
      render(<RefineWorkflowPromptPopup {...defaultProps} onHide={onHide} />)
      await user.click(screen.getByText('Cancel'))
      expect(onHide).toHaveBeenCalled()
    })
  })
  ```

- [ ] **Step 2: Run the unit tests for this file**

  ```bash
  npm run test:unit -- RefineWorkflowPromptPopup
  ```
  Expected: All tests pass. If any fail, fix them before continuing.

- [ ] **Step 3: Commit**

  ```bash
  git add src/pages/workflows/components/__tests__/RefineWorkflowPromptPopup.test.tsx
  git commit -m "EPMCDME-12616: Rewrite RefineWorkflowPromptPopup tests for new async-internal pattern"
  ```

---

### Task 4: Update `EditWorkflowPage` integration tests

**Files:**
- Modify: `src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx`

**Context:** "Revert to Previous" is now hidden by default (not rendered until `preRefinementYaml !== null`). Tests that previously checked the button is disabled on load must now check it is absent from the DOM. Tests that checked it was enabled after refinement must now check it is present. The "disables after save" test becomes "disappears after save."

- [ ] **Step 1: Update the "renders both buttons" test**

  Find and replace the test at line 57:
  ```ts
  // Before:
  it('renders "Refine with AI" and "Revert to Previous" buttons', async () => {
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => {
      expect(screen.getByText('Refine with AI')).toBeInTheDocument()
      expect(screen.getByText('Revert to Previous')).toBeInTheDocument()
    })
  })

  // After:
  it('renders "Refine with AI" button and hides "Revert to Previous" by default', async () => {
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => {
      expect(screen.getByText('Refine with AI')).toBeInTheDocument()
      expect(screen.queryByText('Revert to Previous')).not.toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 2: Update the "Revert is disabled on load" test**

  Find and replace the test at line 65:
  ```ts
  // Before:
  it('"Revert to Previous" is disabled on page load', async () => {
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => {
      const revertBtn = screen.getByText('Revert to Previous').closest('button')
      expect(revertBtn).toBeDisabled()
    })
  })

  // After:
  it('"Revert to Previous" is not shown on page load', async () => {
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    expect(screen.queryByText('Revert to Previous')).not.toBeInTheDocument()
  })
  ```

- [ ] **Step 3: Update the "Revert is enabled after refinement" test**

  Find and replace the test at line 73:
  ```ts
  // Before:
  it('"Revert to Previous" is enabled after an AI refinement is applied', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', {
      yaml_config: 'states: []\n# refined',
    })
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => {
      const revertBtn = screen.getByText('Revert to Previous').closest('button')
      expect(revertBtn).not.toBeDisabled()
    })
  })

  // After:
  it('"Revert to Previous" appears after an AI refinement is applied', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', {
      yaml_config: 'states: []\n# refined',
    })
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => {
      expect(screen.getByText('Revert to Previous')).toBeInTheDocument()
    })
  })
  ```

- [ ] **Step 4: Update the "disables Revert after save" test**

  Find and replace the test at line 162:
  ```ts
  // Before:
  it('disables "Revert to Previous" after a successful save', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', { yaml_config: 'states: []\n# refined' })
    mockAPI('PUT', 'v1/workflows/wf-edit-1', createWorkflowFixture())
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => {
      expect(screen.getByText('Revert to Previous').closest('button')).not.toBeDisabled()
    })
    await user.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(toaster.info).toHaveBeenCalledWith('Workflow has been updated successfully!')
    })
    expect(screen.getByText('Revert to Previous').closest('button')).toBeDisabled()
  })

  // After:
  it('"Revert to Previous" disappears after a successful save', async () => {
    mockAPI('POST', 'v1/workflows/wf-edit-1/refine', { yaml_config: 'states: []\n# refined' })
    mockAPI('PUT', 'v1/workflows/wf-edit-1', createWorkflowFixture())
    renderPage('/workflows/wf-edit-1/edit')
    await waitFor(() => screen.getByText('Refine with AI'))
    await user.click(screen.getByText('Refine with AI'))
    await waitFor(() => screen.getByText('Refine Workflow with AI'))
    const refineButtons = screen.getAllByText('Refine with AI')
    await user.click(refineButtons[refineButtons.length - 1])
    await waitFor(() => {
      expect(screen.getByText('Revert to Previous')).toBeInTheDocument()
    })
    await user.click(screen.getByText('Save'))
    await waitFor(() => {
      expect(toaster.info).toHaveBeenCalledWith('Workflow has been updated successfully!')
    })
    expect(screen.queryByText('Revert to Previous')).not.toBeInTheDocument()
  })
  ```

- [ ] **Step 5: Run the integration tests**

  ```bash
  npm run test:unit -- EditWorkflowPage.integration
  ```
  Expected: All tests pass. Fix any failures before continuing.

- [ ] **Step 6: Commit**

  ```bash
  git add src/pages/workflows/__tests__/EditWorkflowPage.integration.test.tsx
  git commit -m "EPMCDME-12616: Update integration tests for hidden Revert button and new popup pattern"
  ```

---

### Task 5: Full quality gate

- [ ] **Step 1: Lint**

  ```bash
  npm run lint
  ```
  Expected: no errors, exit code 0. Run `npm run lint:fix` to auto-fix minor issues.

- [ ] **Step 2: Type-check**

  ```bash
  npm run typecheck
  ```
  Expected: silent, exit code 0.

- [ ] **Step 3: Run all workflow-related unit tests**

  ```bash
  npm run test:unit -- workflows
  ```
  Expected: all pass. Fix any regressions.

- [ ] **Step 4: Commit if any lint/typecheck fixes were needed**

  ```bash
  git add -p
  git commit -m "EPMCDME-12616: Lint and typecheck fixes"
  ```
  Skip if no changes.
