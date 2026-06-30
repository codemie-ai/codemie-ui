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

import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowExecution } from '@/types/entity/workflow'

import { workflowExecutionsStore } from '../workflowExecutions'

vi.mock('@/utils/api', () => ({
  default: {
    put: vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) }),
    get: vi.fn().mockResolvedValue({ status: 200, json: vi.fn().mockResolvedValue({}) }),
    delete: vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) }),
  },
}))

vi.mock('@/utils/helpers', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
  formatDateTime: vi.fn(),
}))

vi.mock('../workflows', () => ({ workflowsStore: {} }))
vi.mock('../utils/workflowExecutions', () => ({ mapPagination: vi.fn() }))

/** Minimal WorkflowExecution shape sufficient for these tests.
 *  Standalone (non-chat) executions use conversation_id: '' to match production behaviour.
 *  Only execution_id and conversation_id are set; all other fields are irrelevant to these tests.
 */
function makeExecution(executionId: string, conversationId: string = ''): WorkflowExecution {
  const fixture: Pick<WorkflowExecution, 'execution_id' | 'conversation_id'> = {
    execution_id: executionId,
    conversation_id: conversationId,
  }
  return fixture as unknown as WorkflowExecution
}

describe('workflowExecutionsStore.removeExecutionsByConversationId', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton proxy state between tests to prevent inter-test leakage.
    workflowExecutionsStore.executions = []
    workflowExecutionsStore.executionsPagination.totalCount = 0
    workflowExecutionsStore.execution = null
  })

  it('removes all executions matching the given conversationId', () => {
    workflowExecutionsStore.executions = [
      makeExecution('exec-1', 'conv-abc'),
      makeExecution('exec-2', 'conv-abc'),
      makeExecution('exec-3', 'conv-xyz'),
    ]
    workflowExecutionsStore.executionsPagination.totalCount = 3

    workflowExecutionsStore.removeExecutionsByConversationId('conv-abc')

    expect(workflowExecutionsStore.executions).toHaveLength(1)
    expect(workflowExecutionsStore.executions[0].execution_id).toBe('exec-3')
  })

  it('decrements totalCount by exactly the number of removed rows', () => {
    workflowExecutionsStore.executions = [
      makeExecution('exec-1', 'conv-abc'),
      makeExecution('exec-2', 'conv-abc'),
      makeExecution('exec-3', 'conv-xyz'),
    ]
    workflowExecutionsStore.executionsPagination.totalCount = 3

    workflowExecutionsStore.removeExecutionsByConversationId('conv-abc')

    expect(workflowExecutionsStore.executionsPagination.totalCount).toBe(1)
  })

  it('does not decrement totalCount when no rows matched', () => {
    workflowExecutionsStore.executions = [makeExecution('exec-1', 'conv-xyz')]
    workflowExecutionsStore.executionsPagination.totalCount = 1

    workflowExecutionsStore.removeExecutionsByConversationId('conv-no-match')

    expect(workflowExecutionsStore.executionsPagination.totalCount).toBe(1)
    expect(workflowExecutionsStore.executions).toHaveLength(1)
  })

  it('is a no-op when conversationId is an empty string', () => {
    workflowExecutionsStore.executions = [makeExecution('exec-1', 'conv-abc')]
    workflowExecutionsStore.executionsPagination.totalCount = 1

    workflowExecutionsStore.removeExecutionsByConversationId('')

    expect(workflowExecutionsStore.executions).toHaveLength(1)
    expect(workflowExecutionsStore.executionsPagination.totalCount).toBe(1)
  })

  it('nulls execution when the currently-selected execution belongs to the removed conversation', () => {
    const targetExec = makeExecution('exec-1', 'conv-abc')
    workflowExecutionsStore.executions = [targetExec]
    workflowExecutionsStore.executionsPagination.totalCount = 1
    workflowExecutionsStore.execution = targetExec

    workflowExecutionsStore.removeExecutionsByConversationId('conv-abc')

    expect(workflowExecutionsStore.execution).toBeNull()
  })

  it('leaves execution intact when it belongs to a different conversation', () => {
    const otherExec = makeExecution('exec-2', 'conv-xyz')
    workflowExecutionsStore.executions = [makeExecution('exec-1', 'conv-abc'), otherExec]
    workflowExecutionsStore.executionsPagination.totalCount = 2
    workflowExecutionsStore.execution = otherExec

    workflowExecutionsStore.removeExecutionsByConversationId('conv-abc')

    expect(workflowExecutionsStore.execution).not.toBeNull()
    expect(workflowExecutionsStore.execution?.execution_id).toBe('exec-2')
  })

  it('leaves unrelated executions (empty conversationId) intact', () => {
    workflowExecutionsStore.executions = [
      makeExecution('exec-standalone', ''), // standalone: empty string, not null
      makeExecution('exec-target', 'conv-abc'),
    ]
    workflowExecutionsStore.executionsPagination.totalCount = 2

    workflowExecutionsStore.removeExecutionsByConversationId('conv-abc')

    expect(workflowExecutionsStore.executions).toHaveLength(1)
    expect(workflowExecutionsStore.executions[0].execution_id).toBe('exec-standalone')
    expect(workflowExecutionsStore.executionsPagination.totalCount).toBe(1)
  })

  it('clamps totalCount to 0 and does not go negative', () => {
    workflowExecutionsStore.executions = [makeExecution('exec-1', 'conv-abc')]
    // Deliberately set a lower totalCount than actual list (edge case / inconsistent state).
    workflowExecutionsStore.executionsPagination.totalCount = 0

    workflowExecutionsStore.removeExecutionsByConversationId('conv-abc')

    expect(workflowExecutionsStore.executionsPagination.totalCount).toBe(0)
  })
})

describe('workflowExecutionsStore.removeAllChatLinkedExecutions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset singleton proxy state between tests to prevent inter-test leakage.
    workflowExecutionsStore.executions = []
    workflowExecutionsStore.executionsPagination.totalCount = 0
    workflowExecutionsStore.execution = null
  })

  it('removes all executions with a non-empty conversationId', () => {
    workflowExecutionsStore.executions = [
      makeExecution('exec-1', 'conv-a'),
      makeExecution('exec-2', 'conv-b'),
      makeExecution('exec-standalone', ''),
    ]
    workflowExecutionsStore.executionsPagination.totalCount = 3

    workflowExecutionsStore.removeAllChatLinkedExecutions()

    expect(workflowExecutionsStore.executions).toHaveLength(1)
    expect(workflowExecutionsStore.executions[0].execution_id).toBe('exec-standalone')
  })

  it('keeps standalone rows (empty conversationId) intact', () => {
    workflowExecutionsStore.executions = [
      makeExecution('exec-standalone-1', ''),
      makeExecution('exec-standalone-2', ''),
      makeExecution('exec-linked', 'conv-a'),
    ]
    workflowExecutionsStore.executionsPagination.totalCount = 3

    workflowExecutionsStore.removeAllChatLinkedExecutions()

    expect(workflowExecutionsStore.executions).toHaveLength(2)
    expect(
      workflowExecutionsStore.executions.every((e) => e.execution_id.startsWith('exec-standalone'))
    ).toBe(true)
  })

  it('decrements totalCount by exactly the number of chat-linked rows removed', () => {
    workflowExecutionsStore.executions = [
      makeExecution('exec-1', 'conv-a'),
      makeExecution('exec-2', 'conv-b'),
      makeExecution('exec-standalone', ''),
    ]
    workflowExecutionsStore.executionsPagination.totalCount = 3

    workflowExecutionsStore.removeAllChatLinkedExecutions()

    expect(workflowExecutionsStore.executionsPagination.totalCount).toBe(1)
  })

  it('clamps totalCount to 0 when it would otherwise go negative', () => {
    workflowExecutionsStore.executions = [makeExecution('exec-1', 'conv-a')]
    workflowExecutionsStore.executionsPagination.totalCount = 0 // already 0 (inconsistent state)

    workflowExecutionsStore.removeAllChatLinkedExecutions()

    expect(workflowExecutionsStore.executionsPagination.totalCount).toBe(0)
  })

  it('nulls execution when the currently-selected execution is chat-linked', () => {
    const linkedExec = makeExecution('exec-1', 'conv-a')
    workflowExecutionsStore.executions = [linkedExec]
    workflowExecutionsStore.executionsPagination.totalCount = 1
    workflowExecutionsStore.execution = linkedExec

    workflowExecutionsStore.removeAllChatLinkedExecutions()

    expect(workflowExecutionsStore.execution).toBeNull()
  })

  it('leaves execution intact when it is a standalone (empty conversationId)', () => {
    const standaloneExec = makeExecution('exec-standalone', '')
    workflowExecutionsStore.executions = [makeExecution('exec-linked', 'conv-a'), standaloneExec]
    workflowExecutionsStore.executionsPagination.totalCount = 2
    workflowExecutionsStore.execution = standaloneExec

    workflowExecutionsStore.removeAllChatLinkedExecutions()

    expect(workflowExecutionsStore.execution).not.toBeNull()
    expect(workflowExecutionsStore.execution?.execution_id).toBe('exec-standalone')
  })

  it('is a no-op when there are no chat-linked rows', () => {
    workflowExecutionsStore.executions = [
      makeExecution('exec-standalone-1', ''),
      makeExecution('exec-standalone-2', ''),
    ]
    workflowExecutionsStore.executionsPagination.totalCount = 2

    workflowExecutionsStore.removeAllChatLinkedExecutions()

    expect(workflowExecutionsStore.executions).toHaveLength(2)
    expect(workflowExecutionsStore.executionsPagination.totalCount).toBe(2)
  })
})
