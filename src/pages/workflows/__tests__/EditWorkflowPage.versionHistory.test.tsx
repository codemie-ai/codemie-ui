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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { workflowsStore } from '@/store/workflows'
import type { Workflow } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

vi.mock('@/router', () => ({ router: {} }))

const {
  mockReplaceYamlConfig,
  mockOpenIssuesPanel,
  mockCloseIssuesPanel,
  mockClearAllResolvedFields,
} = vi.hoisted(() => ({
  mockReplaceYamlConfig: vi.fn(),
  mockOpenIssuesPanel: vi.fn(),
  mockCloseIssuesPanel: vi.fn(),
  mockClearAllResolvedFields: vi.fn(),
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useWorkflowAIEnabled: () => [true],
}))

vi.mock('../components/WorkflowsNavigation', () => ({
  default: () => null,
}))

vi.mock('../details/popups/WorkflowStartExecutionPopup', () => ({
  default: () => null,
}))

vi.mock('../components/RefineWorkflowPromptPopup', () => ({
  default: ({
    isVisible,
    onRefined,
  }: {
    isVisible: boolean
    onRefined?: (result: { yaml_config: string }) => void
  }) =>
    isVisible ? (
      <button type="button" onClick={() => onRefined?.({ yaml_config: 'states: []\n# refined' })}>
        Apply Refine
      </button>
    ) : null,
}))

vi.mock('../components/WorkflowForm', async () => {
  const { forwardRef, useImperativeHandle, useRef } = await import('react')
  return {
    default: forwardRef(
      (
        {
          onShowVersionHistory,
          onShowVisualVersionHistory,
          onSubmit,
          issues,
          disableCanvasShortcuts,
        }: {
          onShowVersionHistory?: (yaml: string) => void
          onShowVisualVersionHistory?: (yaml: string) => void
          onSubmit?: (values: unknown, shouldOpenExecution?: boolean) => Promise<void>
          issues?: Array<{ message?: string }> | null
          disableCanvasShortcuts?: boolean
        },
        ref
      ) => {
        const yamlRef = useRef('states: []')
        useImperativeHandle(ref, () => ({
          replaceYamlConfig: (next: string) => {
            yamlRef.current = next
            mockReplaceYamlConfig(next)
          },
          getFormValues: () => ({ yaml_config: yamlRef.current }),
          clearAllResolvedFields: mockClearAllResolvedFields,
          openIssuesPanel: mockOpenIssuesPanel,
          closeIssuesPanel: mockCloseIssuesPanel,
          validateWorkflow: () => ({ isValid: true }),
          triggerValidation: vi.fn(),
          save: async (shouldOpenExecution: boolean) => {
            await onSubmit?.({ yaml_config: yamlRef.current }, shouldOpenExecution)
          },
        }))
        return (
          <>
            {issues?.map((issue, index) => (
              <div key={`${issue.message}-${index}`} data-testid="workflow-issue">
                {issue.message}
              </div>
            ))}
            <span data-testid="canvas-shortcuts-disabled">{String(!!disableCanvasShortcuts)}</span>
            <button type="button" onClick={() => onShowVersionHistory?.(yamlRef.current)}>
              Open YAML History
            </button>
            <button type="button" onClick={() => onShowVisualVersionHistory?.(yamlRef.current)}>
              Open Visual History
            </button>
            <button
              type="button"
              onClick={() => {
                yamlRef.current = 'states: []\n# edited-after-restore'
              }}
            >
              Edit YAML
            </button>
            <button
              type="button"
              onClick={() => {
                yamlRef.current = 'states: []\n# v1'
              }}
            >
              Revert YAML text
            </button>
          </>
        )
      }
    ),
  }
})

const historyPopupMock = ({
  visible,
  history,
  onRestore,
  onHide,
  testId,
}: {
  visible: boolean
  history?: Array<{ yaml_config: string }>
  onRestore?: (yaml: string) => void
  onHide?: () => void
  testId: string
}) =>
  visible ? (
    <div data-testid={testId}>
      <h2>Version History</h2>
      <span data-testid="history-count">{history?.length ?? 0}</span>
      <button type="button" onClick={() => onRestore?.(history?.[0]?.yaml_config ?? '')}>
        Restore
      </button>
      <button type="button" onClick={() => onHide?.()}>
        Close history
      </button>
    </div>
  ) : null

vi.mock('../components/WorkflowVersionHistoryPopup', () => ({
  default: (props: {
    visible: boolean
    history?: Array<{ yaml_config: string }>
    onRestore?: (yaml: string) => void
    onHide?: () => void
  }) => historyPopupMock({ ...props, testId: 'yaml-history-popup' }),
}))

vi.mock('../components/WorkflowVisualVersionHistoryPopup', () => ({
  default: (props: {
    visible: boolean
    history?: Array<{ yaml_config: string }>
    onRestore?: (yaml: string) => void
    onHide?: () => void
  }) => historyPopupMock({ ...props, testId: 'visual-history-popup' }),
}))

const workflowFixture: Workflow = {
  id: 'wf-edit-1',
  slug: 'edit-workflow',
  name: 'Edit Workflow',
  yaml_config: 'states: []',
  yaml_config_history: [
    {
      date: '2026-01-01T00:00:00Z',
      yaml_config: 'states: []\n# v1',
      created_by: { user_id: 'u1', username: 'alice', name: 'Alice' },
    },
  ],
  update_date: '2026-01-02T00:00:00Z',
  user_abilities: ['read', 'write', 'delete'],
}

const resourceValidationError = {
  parsedError: {
    message: 'Validation failed',
    details: {
      error_type: 'resource_validation',
      message: '',
      errors: [{ state_id: 's1', message: 'bad', config_line: 1 }],
    },
  },
}

describe('EditWorkflowPage version history restore', () => {
  beforeEach(() => {
    mockReplaceYamlConfig.mockClear()
    mockOpenIssuesPanel.mockClear()
    mockCloseIssuesPanel.mockClear()
    mockClearAllResolvedFields.mockClear()
    ;(mockRouterState as { params: Record<string, string> }).params = { id: 'wf-edit-1' }
    workflowsStore.currentWorkflow = workflowFixture
    workflowsStore.currentWorkflowLoading = false
    workflowsStore.currentWorkflowError = null
    workflowsStore.fetchWorkflow = vi
      .fn()
      .mockResolvedValue(workflowFixture) as typeof workflowsStore.fetchWorkflow
    workflowsStore.clearCurrentWorkflow = vi.fn() as typeof workflowsStore.clearCurrentWorkflow
    workflowsStore.validateWorkflow = vi.fn().mockResolvedValue(undefined) as any
    workflowsStore.updateWorkflow = vi.fn() as any
    vi.mocked(toaster.info).mockClear()
    vi.mocked(toaster.success).mockClear()
    vi.mocked(toaster.error).mockClear()
  })

  it('writes selected history YAML into the form without a server rollback', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))

    expect(screen.getByTestId('history-count')).toHaveTextContent('1')
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    expect(mockReplaceYamlConfig).toHaveBeenCalledWith('states: []\n# v1')
    expect(toaster.info).toHaveBeenCalledWith('Workflow YAML restored — checking for issues…')
    expect(toaster.success).not.toHaveBeenCalled()
  })

  it('clears an active AI refine snapshot when restoring history YAML', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    fireEvent.click(screen.getByRole('button', { name: /Refine with AI/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply Refine' }))
    expect(screen.getByRole('button', { name: 'Revert to Previous' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    expect(mockReplaceYamlConfig).toHaveBeenCalledWith('states: []\n# v1')
    expect(screen.queryByRole('button', { name: 'Revert to Previous' })).not.toBeInTheDocument()
  })

  it('calls validateWorkflow after restore', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() =>
      expect(workflowsStore.validateWorkflow).toHaveBeenCalledWith(
        'wf-edit-1',
        expect.objectContaining({ yaml_config: 'states: []\n# v1' }),
        'json'
      )
    )
  })

  it('opens issues panel when validateWorkflow returns 400', async () => {
    ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>).mockRejectedValue(
      resourceValidationError
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(mockOpenIssuesPanel).toHaveBeenCalled())
    expect(screen.getByTestId('workflow-issue')).toHaveTextContent('bad')
    expect(mockClearAllResolvedFields).toHaveBeenCalled()
    expect(mockCloseIssuesPanel).toHaveBeenCalled()
    expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled()
  })

  it('clears prior issues when restore validate returns 200', async () => {
    ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(resourceValidationError)
      .mockResolvedValueOnce(undefined)
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(screen.getByTestId('workflow-issue')).toHaveTextContent('bad'))
    expect(mockOpenIssuesPanel).toHaveBeenCalled()

    mockOpenIssuesPanel.mockClear()
    mockCloseIssuesPanel.mockClear()

    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(workflowsStore.validateWorkflow).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByTestId('workflow-issue')).not.toBeInTheDocument())
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    expect(mockCloseIssuesPanel).toHaveBeenCalled()
    expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled()
  })

  it('does not open issues panel or PUT on 200 validate', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(workflowsStore.validateWorkflow).toHaveBeenCalled())
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    expect(mockClearAllResolvedFields).toHaveBeenCalled()
    expect(mockCloseIssuesPanel).toHaveBeenCalled()
    expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled()
  })

  it('shows error toast and restore toast when validateWorkflow returns 400 with empty errors', async () => {
    ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>).mockRejectedValue({
      parsedError: {
        message: 'fail',
        details: { error_type: 'resource_validation', message: '', errors: [] },
      },
    })
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith('Validation returned no issue details')
    )
    expect(toaster.info).toHaveBeenCalledWith('Workflow YAML restored — checking for issues…')
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
  })

  it('shows restore-validation error toast when validateWorkflow rejects without parsedError', async () => {
    ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network')
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() =>
      expect(toaster.error).toHaveBeenCalledWith('Failed to validate the restored workflow')
    )
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
  })

  it('does not throw and shows a save error toast when updateWorkflow rejects without parsedError', async () => {
    ;(workflowsStore.updateWorkflow as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error('network')
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })

    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Failed to save the workflow'))
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
  })

  it('does not apply restore validation issues after the editor YAML has changed', async () => {
    let rejectValidate!: (reason: unknown) => void
    ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectValidate = reject
        })
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(workflowsStore.validateWorkflow).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Edit YAML' }))
    await act(async () => {
      rejectValidate(resourceValidationError)
    })

    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    expect(mockClearAllResolvedFields).toHaveBeenCalled()
    expect(screen.queryByTestId('workflow-issue')).not.toBeInTheDocument()
  })

  it('ignores a late 400 from an earlier restore of the same YAML', async () => {
    const validateCalls: Array<{
      resolve: (value?: unknown) => void
      reject: (reason?: unknown) => void
    }> = []
    ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((resolve, reject) => {
          validateCalls.push({ resolve, reject })
        })
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(validateCalls).toHaveLength(1))

    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(validateCalls).toHaveLength(2))

    await act(async () => {
      validateCalls[1].resolve()
    })
    await waitFor(() => expect(screen.queryByTestId('workflow-issue')).not.toBeInTheDocument())

    await act(async () => {
      validateCalls[0].reject(resourceValidationError)
    })

    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    expect(screen.queryByTestId('workflow-issue')).not.toBeInTheDocument()
  })

  it('opens visual history from the page and restores through it', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open Visual History' }))
    expect(screen.getByTestId('visual-history-popup')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    expect(mockReplaceYamlConfig).toHaveBeenCalledWith('states: []\n# v1')
    await waitFor(() =>
      expect(workflowsStore.validateWorkflow).toHaveBeenCalledWith(
        'wf-edit-1',
        expect.objectContaining({ yaml_config: 'states: []\n# v1' }),
        'json'
      )
    )
  })

  it('disables canvas shortcuts while version history is open', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    expect(screen.getByTestId('canvas-shortcuts-disabled')).toHaveTextContent('false')
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    expect(screen.getByTestId('canvas-shortcuts-disabled')).toHaveTextContent('true')
    fireEvent.click(screen.getByRole('button', { name: 'Close history' }))
    expect(screen.getByTestId('canvas-shortcuts-disabled')).toHaveTextContent('false')
  })

  it('does not apply a stale 400 after the user edits away and back to the restored YAML', async () => {
    let rejectValidate!: (reason: unknown) => void
    ;(workflowsStore.validateWorkflow as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectValidate = reject
        })
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(workflowsStore.validateWorkflow).toHaveBeenCalled())

    fireEvent.click(screen.getByRole('button', { name: 'Edit YAML' }))
    await act(async () => {
      await new Promise((resolve) => {
        window.setTimeout(resolve, 20)
      })
    })
    fireEvent.click(screen.getByRole('button', { name: 'Revert YAML text' }))
    await act(async () => {
      rejectValidate(resourceValidationError)
    })

    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    expect(screen.queryByTestId('workflow-issue')).not.toBeInTheDocument()
  })
})
