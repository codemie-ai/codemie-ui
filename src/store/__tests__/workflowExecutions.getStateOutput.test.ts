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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import api from '@/utils/api'

import { workflowExecutionsStore } from '../workflowExecutions'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/utils/helpers', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
  formatDateTime: vi.fn(),
}))

describe('workflowExecutionsStore.getWorkflowExecutionStateOutput', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns output and truncated from the API response', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: vi.fn().mockResolvedValue({
        output: 'hello',
        truncated: true,
      }),
    } as unknown as Response)

    const result = await workflowExecutionsStore.getWorkflowExecutionStateOutput(
      'wf-1',
      'exec-1',
      'state-1'
    )

    expect(result).toEqual({ output: 'hello', truncated: true })
  })

  it('returns truncated: undefined when field is absent (backward-compatible state)', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ output: 'old output' }),
    } as unknown as Response)

    const result = await workflowExecutionsStore.getWorkflowExecutionStateOutput(
      'wf-1',
      'exec-1',
      'state-1'
    )

    expect(result.output).toBe('old output')
    expect(result.truncated).toBeUndefined()
  })

  it('calls the correct endpoint URL', async () => {
    vi.mocked(api.get).mockResolvedValue({
      json: vi.fn().mockResolvedValue({ output: null }),
    } as unknown as Response)

    await workflowExecutionsStore.getWorkflowExecutionStateOutput('wf-2', 'exec-3', 'state-4')

    expect(api.get).toHaveBeenCalledWith(
      'v1/workflows/wf-2/executions/exec-3/states/state-4/output',
      { skipErrorHandling: true }
    )
  })

  it('throws when the API call fails', async () => {
    vi.mocked(api.get).mockRejectedValue(new Error('network error'))

    await expect(
      workflowExecutionsStore.getWorkflowExecutionStateOutput('wf-1', 'exec-1', 'state-1')
    ).rejects.toThrow('network error')
  })
})
