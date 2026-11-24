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
import { CHECK_TIMEOUT_MS } from '@/pages/workflows/editor/hooks/useContractCheck'
import { goBackFromWorkflowEdit } from '@/pages/workflows/utils/goBackWorkflows'
import { contractOutcomeStore } from '@/store/contractOutcome'
import { workflowsStore } from '@/store/workflows'
import type { Workflow } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

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

vi.mock('@/pages/workflows/utils/goBackWorkflows', () => ({
  goBackFromWorkflowEdit: vi.fn(),
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

// A 200 validation that found nothing.
const cleanResponse = () => ({ json: async () => ({ message: 'valid', warnings: [] }) })

const UNREADABLE_RESTORE_MESSAGE =
  "The restored workflow's validation result couldn't be read. Run Check to review it."

const warningsResponse = {
  json: async () => ({
    message: 'Workflow configuration is valid',
    warnings: [
      { kind: 'consumer_slot', assistant_ref: 'a1', tool_name: 'Jira', credential_type: 'Jira' },
      {
        id: 'w1',
        kind: 'contract_validation',
        outcome: 'WARNING',
        state_id: 'c1',
        path: 'x',
        message: 'x may be missing',
        config_path: 'task',
        config_section: 'states',
        config_line: 14,
        meta: { label: 'not guaranteed by the contracts' },
      },
    ],
    coverage: {
      validated_states: 3,
      total_states: 3,
      uncovered_state_ids: [],
      analysed: true,
      cap_reached: false,
    },
  }),
}

describe('EditWorkflowPage version history restore', () => {
  beforeEach(() => {
    mockReplaceYamlConfig.mockClear()
    mockOpenIssuesPanel.mockClear()
    mockCloseIssuesPanel.mockClear()
    mockClearAllResolvedFields.mockClear()
    vi.mocked(goBackFromWorkflowEdit).mockClear()
    ;(mockRouterState as { params: Record<string, string> }).params = { id: 'wf-edit-1' }
    workflowsStore.currentWorkflow = workflowFixture
    workflowsStore.currentWorkflowLoading = false
    workflowsStore.currentWorkflowError = null
    workflowsStore.fetchWorkflow = vi
      .fn()
      .mockResolvedValue(workflowFixture) as typeof workflowsStore.fetchWorkflow
    workflowsStore.clearCurrentWorkflow = vi.fn() as typeof workflowsStore.clearCurrentWorkflow
    workflowsStore.validateWorkflowConfig = vi.fn().mockResolvedValue(cleanResponse()) as any
    workflowsStore.updateWorkflow = vi.fn() as any
    vi.mocked(toaster.info).mockClear()
    vi.mocked(toaster.success).mockClear()
    vi.mocked(toaster.error).mockClear()
    vi.mocked(toaster.warning).mockClear()
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
      expect(workflowsStore.validateWorkflowConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wf-edit-1',
          body: expect.objectContaining({ yaml_config: 'states: []\n# v1' }),
        })
      )
    )
  })

  it('opens issues panel when validateWorkflow returns 400', async () => {
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockRejectedValue(
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
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>)
      .mockRejectedValueOnce(resourceValidationError)
      .mockResolvedValueOnce(cleanResponse())
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
    await waitFor(() => expect(workflowsStore.validateWorkflowConfig).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.queryByTestId('workflow-issue')).not.toBeInTheDocument())
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    expect(mockCloseIssuesPanel).toHaveBeenCalled()
    expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled()
  })

  it('routes contract warnings from a restore to the panel as not saved yet and keeps it open', async () => {
    ;(contractOutcomeStore as { outcome: unknown }).outcome = null
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockResolvedValue(
      warningsResponse
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    await waitFor(() => expect(mockOpenIssuesPanel).toHaveBeenCalled())
    expect(screen.getByTestId('workflow-issue')).toHaveTextContent('x may be missing')
    expect(contractOutcomeStore.outcome).toMatchObject({ key: 'wf-edit-1', context: 'not-saved' })
    // the reset at the start of the restore closes the panel; nothing closes it after the warnings land
    const lastClose = Math.max(...mockCloseIssuesPanel.mock.invocationCallOrder)
    expect(lastClose).toBeLessThan(mockOpenIssuesPanel.mock.invocationCallOrder[0])
    // consumer_slot is not a contract warning and still toasts
    expect(toaster.warning).toHaveBeenCalledWith(expect.stringContaining('Jira (Jira)'))
    expect(toaster.warning).not.toHaveBeenCalledWith(expect.stringContaining('x may be missing'))
  })

  it('routes a strict contract rejection from a restore to the panel with its warnings as not saved yet', async () => {
    ;(contractOutcomeStore as { outcome: unknown }).outcome = null
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockRejectedValue({
      status: 400,
      parsedError: {
        message: 'Workflow Configuration error',
        details: {
          error_type: 'contract_validation',
          message: 'Workflow contracts are not satisfied',
          errors: [
            {
              id: 'e1',
              outcome: 'ERROR',
              state_id: 's1',
              path: 'task',
              message: 'strict break',
              config_section: 'states',
              config_line: 3,
            },
          ],
          warnings: [
            {
              id: 'w1',
              kind: 'contract_validation',
              outcome: 'WARNING',
              state_id: 's2',
              path: 'x',
              message: 'also risky',
              config_section: 'states',
              config_line: 9,
            },
          ],
          coverage: {
            validated_states: 2,
            total_states: 2,
            uncovered_state_ids: [],
            analysed: true,
            cap_reached: false,
          },
        },
      },
    })
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    await waitFor(() => expect(mockOpenIssuesPanel).toHaveBeenCalled())
    const messages = screen.getAllByTestId('workflow-issue').map((node) => node.textContent)
    expect(messages).toEqual(expect.arrayContaining(['strict break', 'also risky']))
    expect(contractOutcomeStore.outcome).toMatchObject({ key: 'wf-edit-1', context: 'not-saved' })
    expect(contractOutcomeStore.outcome?.coverage).toMatchObject({ total_states: 2 })
    expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled()
  })

  it('drops a restore validation that finishes after a save started', async () => {
    ;(contractOutcomeStore as { outcome: unknown }).outcome = null
    let resolveValidation: (value: unknown) => void = () => {}
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockReturnValue(
      new Promise((resolve) => {
        resolveValidation = resolve
      })
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(workflowsStore.validateWorkflowConfig).toHaveBeenCalled())

    // A save starts, so the restore validation is older than the save result.
    ;(workflowsStore.updateWorkflow as ReturnType<typeof vi.fn>).mockResolvedValue({
      json: async () => ({ message: 'ok', warnings: [] }),
    })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Save' }))
    })
    await waitFor(() => expect(workflowsStore.updateWorkflow).toHaveBeenCalled())
    expect(goBackFromWorkflowEdit).toHaveBeenCalledWith({ workflowId: 'wf-edit-1' })
    mockOpenIssuesPanel.mockClear()
    await act(async () => {
      resolveValidation(warningsResponse)
    })

    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    expect(screen.queryByTestId('workflow-issue')).not.toBeInTheDocument()
    expect(contractOutcomeStore.outcome).toBeNull()
  })

  it('clears a stale not-saved outcome when a later restore validates clean', async () => {
    contractOutcomeStore.outcome = {
      key: 'wf-edit-1',
      context: 'not-saved',
    }
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(mockCloseIssuesPanel).toHaveBeenCalled())
    await waitFor(() => expect(contractOutcomeStore.outcome).toBeNull())
  })

  it('toasts a clean restore validation as success', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    await waitFor(() =>
      expect(toaster.success).toHaveBeenCalledWith('No issues found in the restored workflow')
    )
    expect(toaster.error).not.toHaveBeenCalled()
  })

  it.each([
    ['a body that is not JSON', { json: () => Promise.reject(new SyntaxError('bad json')) }],
    ['no response', undefined],
  ])('treats %s as an unknown result, not a clean one', async (_, response) => {
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockResolvedValue(response)
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith(UNREADABLE_RESTORE_MESSAGE))
    expect(toaster.success).not.toHaveBeenCalled()
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
  })

  it('passes an abort signal and reports a restore validation that does not answer in time', async () => {
    vi.useFakeTimers()
    try {
      ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockImplementation(
        ({ signal }: { signal: AbortSignal }) =>
          new Promise((_, reject) => {
            signal.addEventListener('abort', () =>
              reject(new DOMException('aborted', 'AbortError'))
            )
          })
      )
      const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
      render(<EditWorkflowPage />)
      fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
      fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

      expect(workflowsStore.validateWorkflowConfig).toHaveBeenCalledWith(
        expect.objectContaining({ signal: expect.any(AbortSignal) })
      )
      await act(async () => {
        await vi.advanceTimersByTimeAsync(CHECK_TIMEOUT_MS - 1)
      })
      expect(toaster.error).not.toHaveBeenCalled()

      await act(async () => {
        await vi.advanceTimersByTimeAsync(1)
      })
      expect(toaster.error).toHaveBeenCalledWith(
        'Validation of the restored workflow timed out. Run Check to review it.'
      )
      expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })

  it('does not open issues panel or PUT on 200 validate', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(workflowsStore.validateWorkflowConfig).toHaveBeenCalled())
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
    expect(mockClearAllResolvedFields).toHaveBeenCalled()
    expect(mockCloseIssuesPanel).toHaveBeenCalled()
    expect(workflowsStore.updateWorkflow).not.toHaveBeenCalled()
  })

  it('shows error toast and restore toast when validateWorkflow returns 400 with empty errors', async () => {
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockRejectedValue({
      parsedError: {
        message: 'fail',
        details: { error_type: 'resource_validation', message: '', errors: [] },
      },
    })
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    // A structured rejection without issues shows its own message.
    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('fail'))
    expect(toaster.info).toHaveBeenCalledWith('Workflow YAML restored — checking for issues…')
    expect(mockOpenIssuesPanel).not.toHaveBeenCalled()
  })

  it('shows restore-validation error toast when validateWorkflow rejects without parsedError', async () => {
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockRejectedValue(
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
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectValidate = reject
        })
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(workflowsStore.validateWorkflowConfig).toHaveBeenCalled())

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
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockImplementation(
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
      validateCalls[1].resolve(cleanResponse())
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
      expect(workflowsStore.validateWorkflowConfig).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'wf-edit-1',
          body: expect.objectContaining({ yaml_config: 'states: []\n# v1' }),
        })
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
    ;(workflowsStore.validateWorkflowConfig as ReturnType<typeof vi.fn>).mockImplementation(
      () =>
        new Promise((_, reject) => {
          rejectValidate = reject
        })
    )
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)
    fireEvent.click(screen.getByRole('button', { name: 'Open YAML History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))
    await waitFor(() => expect(workflowsStore.validateWorkflowConfig).toHaveBeenCalled())

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
