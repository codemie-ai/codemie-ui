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

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { WorkflowExecutionState } from '@/types/entity'

import WorkflowStateCallHistory from '../WorkflowStateCallHistory'

vi.mock('@/store/workflowExecutions', () => ({
  workflowExecutionsStore: {
    loadWorkflowExecutionOutput: vi.fn().mockResolvedValue(undefined),
    getStateThought: vi.fn(),
  },
}))
vi.mock('@/pages/workflows/details/states/WorkflowExecutionStateThought', () => ({
  default: () => <div>thought</div>,
}))

const makeState = (thoughts: any[]) =>
  ({
    id: 's1',
    execution_id: 'e1',
    name: 'Node A',
    status: 'Succeeded',
    started_at: null,
    completed_at: null,
    thoughts,
  } as unknown as WorkflowExecutionState)

const store = workflowExecutionsStore as any

describe('WorkflowStateCallHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    store.getStateThought.mockImplementation((id: string) => ({
      id,
      message: 'm-' + id,
      in_progress: false,
    }))
  })

  it('renders loaded thoughts without export buttons', async () => {
    render(<WorkflowStateCallHistory workflowId="w" state={makeState([{ id: 't1' }])} />)
    expect(await screen.findByText('thought')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /download/i })).toBeNull()
  })

  it('shows empty message when there are no thoughts', async () => {
    render(<WorkflowStateCallHistory workflowId="w" state={makeState([])} />)
    expect(await screen.findByText('No call history available')).toBeTruthy()
  })
})
