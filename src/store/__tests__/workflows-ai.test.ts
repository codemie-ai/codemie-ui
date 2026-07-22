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

import { workflowsStore } from '../workflows'

vi.mock('@/utils/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('workflowsStore AI methods', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refineWorkflowWithAI posts to correct endpoint and returns yaml_config', async () => {
    const mockResponse = { yaml_config: 'states: []' }
    vi.mocked(api.post).mockResolvedValueOnce({ json: () => Promise.resolve(mockResponse) } as any)

    const result = await workflowsStore.refineWorkflowWithAI('wf-1', {
      yaml_config: 'states: []',
      refine_prompt: 'make it better',
    })

    expect(api.post).toHaveBeenCalledWith('v1/workflows/wf-1/refine', {
      yaml_config: 'states: []',
      refine_prompt: 'make it better',
    })
    expect(result.yaml_config).toBe('states: []')
  })
})
