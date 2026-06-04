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

import api from '@/utils/api'

import { workflowExecutionsStore } from '../workflowExecutions'

vi.mock('@/utils/api', () => ({
  default: {
    put: vi.fn().mockResolvedValue({ json: vi.fn().mockResolvedValue({}) }),
    get: vi.fn().mockResolvedValue({ status: 200, json: vi.fn().mockResolvedValue({}) }),
  },
}))

vi.mock('@/utils/helpers', () => ({
  sleep: vi.fn().mockResolvedValue(undefined),
  formatDateTime: vi.fn(),
}))

vi.mock('./workflows', () => ({ workflowsStore: {} }))
vi.mock('./utils/workflowExecutions', () => ({ mapPagination: vi.fn() }))

describe('workflowExecutionsStore.resumeWorkflowExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('sends file_names in body when fileNames are provided', async () => {
    await workflowExecutionsStore.resumeWorkflowExecution('wf-1', 'exec-1', 'my message', [
      'encoded-url-1',
      'encoded-url-2',
    ])

    expect(api.put).toHaveBeenCalledWith('v1/workflows/wf-1/executions/exec-1/resume', {
      user_input: 'my message',
      file_names: ['encoded-url-1', 'encoded-url-2'],
    })
  })

  it('sends only user_input when no fileNames provided', async () => {
    await workflowExecutionsStore.resumeWorkflowExecution('wf-1', 'exec-1', 'msg only')

    expect(api.put).toHaveBeenCalledWith('v1/workflows/wf-1/executions/exec-1/resume', {
      user_input: 'msg only',
    })
  })

  it('sends only file_names when no userInput provided', async () => {
    await workflowExecutionsStore.resumeWorkflowExecution('wf-1', 'exec-1', undefined, [
      'encoded-url-1',
    ])

    expect(api.put).toHaveBeenCalledWith('v1/workflows/wf-1/executions/exec-1/resume', {
      file_names: ['encoded-url-1'],
    })
  })

  it('sends undefined body when neither userInput nor fileNames provided', async () => {
    await workflowExecutionsStore.resumeWorkflowExecution('wf-1', 'exec-1')

    expect(api.put).toHaveBeenCalledWith('v1/workflows/wf-1/executions/exec-1/resume', undefined)
  })
})
