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

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { workflowsStore } from '@/store/workflows'
import type { Workflow } from '@/types/entity/workflow'
import toaster from '@/utils/toaster'

vi.mock('@/router', () => ({ router: {} }))

const { mockReplaceYamlConfig } = vi.hoisted(() => ({
  mockReplaceYamlConfig: vi.fn(),
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
  const { forwardRef, useImperativeHandle } = await import('react')
  return {
    default: forwardRef(
      ({ onShowVersionHistory }: { onShowVersionHistory?: (yaml: string) => void }, ref) => {
        useImperativeHandle(ref, () => ({
          replaceYamlConfig: mockReplaceYamlConfig,
          getFormValues: () => ({ yaml_config: 'states: []' }),
          clearAllResolvedFields: vi.fn(),
        }))
        return (
          <button type="button" onClick={() => onShowVersionHistory?.('current-editor-yaml')}>
            Open History
          </button>
        )
      }
    ),
  }
})

vi.mock('../components/WorkflowVersionHistoryPopup', () => ({
  default: ({
    visible,
    history,
    onRestore,
  }: {
    visible: boolean
    history?: Array<{ yaml_config: string }>
    onRestore?: (yaml: string) => void
  }) =>
    visible ? (
      <div>
        <h2>Version History</h2>
        <span data-testid="history-count">{history?.length ?? 0}</span>
        <button type="button" onClick={() => onRestore?.(history?.[0]?.yaml_config ?? '')}>
          Restore
        </button>
      </div>
    ) : null,
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

describe('EditWorkflowPage version history restore', () => {
  beforeEach(() => {
    mockReplaceYamlConfig.mockClear()
    ;(mockRouterState as { params: Record<string, string> }).params = { id: 'wf-edit-1' }
    workflowsStore.currentWorkflow = workflowFixture
    workflowsStore.currentWorkflowLoading = false
    workflowsStore.currentWorkflowError = null
    workflowsStore.fetchWorkflow = vi
      .fn()
      .mockResolvedValue(workflowFixture) as typeof workflowsStore.fetchWorkflow
    workflowsStore.clearCurrentWorkflow = vi.fn() as typeof workflowsStore.clearCurrentWorkflow
    vi.mocked(toaster.info).mockClear()
    vi.mocked(toaster.success).mockClear()
  })

  it('writes selected history YAML into the form without a server rollback', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Open History' }))

    expect(screen.getByTestId('history-count')).toHaveTextContent('1')
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    expect(mockReplaceYamlConfig).toHaveBeenCalledWith('states: []\n# v1')
    expect(toaster.info).toHaveBeenCalledWith('Workflow YAML has been restored successfully!')
    expect(toaster.success).not.toHaveBeenCalled()
    expect(screen.queryByText(/Rollback creates a new current version/i)).not.toBeInTheDocument()
  })

  it('clears an active AI refine snapshot when restoring history YAML', async () => {
    const { default: EditWorkflowPage } = await import('../EditWorkflowPage')
    render(<EditWorkflowPage />)

    fireEvent.click(screen.getByRole('button', { name: /Refine with AI/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply Refine' }))
    expect(screen.getByRole('button', { name: 'Revert to Previous' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Open History' }))
    fireEvent.click(screen.getByRole('button', { name: 'Restore' }))

    expect(mockReplaceYamlConfig).toHaveBeenCalledWith('states: []\n# v1')
    expect(screen.queryByRole('button', { name: 'Revert to Previous' })).not.toBeInTheDocument()
  })
})
