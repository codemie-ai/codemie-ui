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

import { screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { mockAPI, renderPage } from '@/test-utils/integration'
import type { ExtendedWorkflowExecution, Workflow } from '@/types/entity/workflow'

// Records every call the page makes to the listener, whole options object included, so the
// non-goal (no handlers) is provable rather than assumed. This necessarily replaces the real
// hook, so it cannot itself simulate a late postMessage callback — that live wiring is what
// "onSuccess/onError/onTimeout are undefined" proves: with no handler passed, there is nothing
// for a real callback to invoke.
const { listenerCalls } = vi.hoisted(() => ({
  listenerCalls: [] as Array<Record<string, unknown>>,
}))

vi.mock('@/hooks/useAuthCallbackListener', () => ({
  AUTH_CALLBACK_HINT_MESSAGE:
    'Sign-in is taking longer than usual. It can still complete — or click to try again.',
  useAuthCallbackListener: (options: Record<string, unknown>) => {
    listenerCalls.push(options)
    return { authFlows: {} }
  },
}))

describe('WorkflowDetailsPage - Auth Callback Tracking (Integration)', () => {
  const createWorkflowFixture = (overrides: Partial<Workflow> = {}): Workflow => ({
    id: 'wf-123',
    slug: 'my-workflow',
    name: 'My Workflow',
    yaml_config: 'nodes:\n  - id: start\n    type: START',
    yaml_config_history: [],
    update_date: '2026-01-01T00:00:00Z',
    user_abilities: ['read', 'write', 'delete'],
    ...overrides,
  })

  const createExecutionFixture = (
    overrides: Partial<ExtendedWorkflowExecution> = {}
  ): ExtendedWorkflowExecution => ({
    id: null,
    date: '2026-01-15T10:00:00Z',
    update_date: '2026-01-15T10:05:00Z',
    workflow_id: 'wf-123',
    execution_id: 'exec-1',
    conversation_id: '',
    overall_status: 'Succeeded',
    output: null,
    name: null,
    prompt: 'Starting prompt text',
    file_name: null,
    file_names: null,
    created_by: { name: 'Jane Doe', username: 'jane.doe', email: '@', id: 'u-1' },
    tokens_usage: { money_spent: 0.0012, input_tokens: 1500, output_tokens: 200 },
    index: 1,
    ...overrides,
  })

  const createExecutionsResponse = (executions: ExtendedWorkflowExecution[]) => ({
    data: executions,
    pagination: { page: 0, pages: 1, total: executions.length },
  })

  const mockExecutionAPIs = (execution: ExtendedWorkflowExecution) => {
    mockAPI('GET', 'v1/workflows/id/wf-123', createWorkflowFixture())
    mockAPI('GET', 'v1/workflows/wf-123/executions', createExecutionsResponse([execution]))
    mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1', execution)
    mockAPI('GET', 'v1/workflows/wf-123/executions/exec-1/states', {
      data: [],
      pagination: { page: 0, pages: 0, total: 0 },
    })
  }

  const latestListenerOptions = (): Record<string, unknown> => {
    const call = listenerCalls[listenerCalls.length - 1]
    if (!call) throw new Error('useAuthCallbackListener was never called')
    return call
  }

  // Counts fetches against the execution-detail endpoint only (excludes /states, which is
  // separately polled by useExecutionStates/useWorkflowData for non-final statuses).
  const executionFetchCount = (): number =>
    (global.fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([input]) => {
      const url = String(input instanceof Request ? input.url : input)
      return url.includes('wf-123/executions/exec-1') && !url.includes('/states')
    }).length

  beforeEach(() => {
    listenerCalls.length = 0
    ;(mockRouterState as any).params = { workflowId: 'wf-123', executionId: 'exec-1' }
  })

  afterEach(() => {
    ;(mockRouterState as any).params = {}
  })

  const waitForPageLoaded = async () => {
    await waitFor(() => expect(screen.getByText('My Workflow')).toBeInTheDocument())
  }

  it('tracks the auth_config_id parsed from an AUTHENTICATION_REQUIRED execution output', async () => {
    const execution = createExecutionFixture({
      overall_status: 'AUTHENTICATION_REQUIRED',
      output: JSON.stringify({ auth_config_id: 'auth-cfg-1' }),
    })
    mockExecutionAPIs(execution)

    renderPage('/workflows/wf-123/workflow-executions/exec-1')
    await waitForPageLoaded()

    await waitFor(() => {
      expect(latestListenerOptions().trackedAuthConfigIds).toEqual(['auth-cfg-1'])
    })
  })

  it('tracks nothing when the AUTHENTICATION_REQUIRED output is malformed JSON', async () => {
    const execution = createExecutionFixture({
      overall_status: 'AUTHENTICATION_REQUIRED',
      output: '{not valid json',
    })
    mockExecutionAPIs(execution)

    renderPage('/workflows/wf-123/workflow-executions/exec-1')
    await waitForPageLoaded()

    await waitFor(() => {
      expect(latestListenerOptions().trackedAuthConfigIds).toEqual([])
    })
  })

  it('tracks nothing for a non-AUTHENTICATION_REQUIRED status even with auth_config_id present', async () => {
    const execution = createExecutionFixture({
      overall_status: 'Succeeded',
      output: JSON.stringify({ auth_config_id: 'auth-cfg-1' }),
    })
    mockExecutionAPIs(execution)

    renderPage('/workflows/wf-123/workflow-executions/exec-1')
    await waitForPageLoaded()

    await waitFor(() => {
      expect(latestListenerOptions().trackedAuthConfigIds).toEqual([])
    })
  })

  it('passes no handlers and triggers no execution refetch — verify-only, no auto-resume', async () => {
    const execution = createExecutionFixture({
      overall_status: 'AUTHENTICATION_REQUIRED',
      output: JSON.stringify({ auth_config_id: 'auth-cfg-1' }),
    })
    mockExecutionAPIs(execution)

    renderPage('/workflows/wf-123/workflow-executions/exec-1')
    await waitForPageLoaded()

    await waitFor(() => {
      expect(latestListenerOptions().trackedAuthConfigIds).toEqual(['auth-cfg-1'])
    })

    const options = latestListenerOptions()
    expect(options.onSuccess).toBeUndefined()
    expect(options.onError).toBeUndefined()
    expect(options.onTimeout).toBeUndefined()

    // The listener itself is mocked out (necessarily, to capture its options), so there is
    // no live callback path to fire here. What this pins instead: the page reads the execution
    // endpoint exactly once on load and never again — there is no refetch loop tied to the
    // auth-callback machinery, which is consistent with the page never wiring a handler that
    // could drive one.
    const initialFetchCount = executionFetchCount()
    expect(initialFetchCount).toBe(1)

    await waitFor(() => {
      expect(executionFetchCount()).toBe(initialFetchCount)
    })
  })
})
