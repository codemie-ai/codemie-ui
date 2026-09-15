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

vi.mock('@/router', () => ({ router: {} }))

vi.mock('@/utils/api', () => ({
  default: {
    post: vi.fn(),
    get: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}))

describe('workflowsStore.materializeWorkflowTemplate', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('posts variables by slug and returns the materialized seed', async () => {
    const seed = {
      yaml_config: 'states: []',
      description: 'Materialized description',
      start_hint: 'Start here',
    }
    vi.mocked(api.post).mockResolvedValueOnce({ json: () => Promise.resolve(seed) } as Response)

    const result = await workflowsStore.materializeWorkflowTemplate(
      'template-placeholder-variables-example',
      {
        assistant_id: 'asst-001',
      }
    )

    expect(api.post).toHaveBeenCalledWith(
      'v1/workflows/prebuilt/template-placeholder-variables-example/materialize',
      { variables: { assistant_id: 'asst-001' } },
      { skipErrorHandling: true }
    )
    expect(result).toEqual(seed)
  })
})
