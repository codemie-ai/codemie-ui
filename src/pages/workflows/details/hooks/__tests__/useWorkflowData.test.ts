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

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest'

import { WORKFLOW_STATUSES } from '@/constants/workflows'
import { workflowExecutionsStore } from '@/store/workflowExecutions'
import { Workflow, WorkflowExecution } from '@/types/entity/workflow'

import { useWorkflowData } from '../useWorkflowData'

// Real snapshots: whether polling continues is decided on the re-render each fetched execution
// causes, which the unit setup's static `useSnapshot` stand-in never triggers.
vi.mock('valtio', async () => vi.importActual('valtio'))

const POLL_INTERVAL_MS = 4000
const TEN_MINUTES_MS = 10 * 60_000

const createExecution = (overrides: Partial<WorkflowExecution> = {}): WorkflowExecution => ({
  id: null,
  date: '2026-10-02T10:00:00Z',
  update_date: '2026-10-02T10:05:00Z',
  workflow_id: 'wf-1',
  execution_id: 'exec-1',
  conversation_id: '',
  overall_status: WORKFLOW_STATUSES.SUCCEEDED,
  output: null,
  name: null,
  prompt: null,
  file_name: null,
  file_names: null,
  created_by: null,
  tokens_usage: { money_spent: 0, input_tokens: 100, output_tokens: 10 },
  ...overrides,
})

const PENDING_COST = {
  money_spent: 0,
  input_tokens: 100,
  output_tokens: 10,
  money_spent_pending: true,
}
const SETTLED_COST = { money_spent: 0.0123, input_tokens: 100, output_tokens: 10 }

describe('useWorkflowData — polling a finished execution whose cost is pending', () => {
  // What the next GET of the execution answers; a test changes it to settle the cost mid-poll.
  let served: WorkflowExecution
  let getExecution: MockInstance<typeof workflowExecutionsStore.getExecution>

  const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

  const renderForExecution = (execution: WorkflowExecution) => {
    served = execution
    workflowExecutionsStore.execution = execution
    return renderHook(({ executionId }) => useWorkflowData('wf-1', executionId), {
      initialProps: { executionId: execution.execution_id },
    })
  }

  beforeEach(() => {
    vi.useFakeTimers()
    // The workflow is already loaded, so the hook's initial fetch stays out of these tests.
    workflowExecutionsStore.workflow = { id: 'wf-1' } as Workflow
    getExecution = vi
      .spyOn(workflowExecutionsStore, 'getExecution')
      .mockImplementation(async () => {
        workflowExecutionsStore.execution = { ...served }
        return served
      })
  })

  afterEach(() => {
    getExecution.mockRestore()
    vi.clearAllTimers()
    vi.useRealTimers()
  })

  it('keeps polling after the execution finished, so a cost that settles later is shown', async () => {
    renderForExecution(createExecution({ tokens_usage: PENDING_COST }))

    await advance(POLL_INTERVAL_MS)

    expect(getExecution).toHaveBeenCalledWith('wf-1', 'exec-1')
  })

  it('stops polling once the cost has settled', async () => {
    renderForExecution(createExecution({ tokens_usage: PENDING_COST }))
    served = createExecution({ tokens_usage: SETTLED_COST })

    await advance(TEN_MINUTES_MS)

    expect(getExecution).toHaveBeenCalledTimes(1)
  })

  it('gives up on a cost that never settles instead of polling forever', async () => {
    renderForExecution(createExecution({ tokens_usage: PENDING_COST }))

    await advance(TEN_MINUTES_MS)
    const pollsBeforeGivingUp = getExecution.mock.calls.length
    await advance(TEN_MINUTES_MS)

    expect(pollsBeforeGivingUp).toBeGreaterThan(0)
    expect(getExecution).toHaveBeenCalledTimes(pollsBeforeGivingUp)
  })

  it('restarts the bound for the next execution opened', async () => {
    const { rerender } = renderForExecution(createExecution({ tokens_usage: PENDING_COST }))
    await advance(TEN_MINUTES_MS)
    getExecution.mockClear()

    served = createExecution({ execution_id: 'exec-2', tokens_usage: PENDING_COST })
    workflowExecutionsStore.execution = served
    rerender({ executionId: 'exec-2' })
    await advance(POLL_INTERVAL_MS)

    expect(getExecution).toHaveBeenCalledWith('wf-1', 'exec-2')
  })

  it('does not poll a finished execution whose cost has already settled', async () => {
    renderForExecution(createExecution({ tokens_usage: SETTLED_COST }))

    await advance(TEN_MINUTES_MS)

    expect(getExecution).not.toHaveBeenCalled()
  })
})
