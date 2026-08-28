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

import { describe, expect, it, vi } from 'vitest'

import { workflowsStore } from '../workflows'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ json: () => Promise.resolve({ id: 1, description: 'd' }) })),
  },
}))

describe('workflowsStore.getWorkflow', () => {
  it('passes skipErrorHandling through to the api client', async () => {
    const api = (await import('@/utils/api')).default

    await workflowsStore.getWorkflow(1, true)

    expect(api.get).toHaveBeenCalledWith('v1/workflows/id/1', { skipErrorHandling: true })
  })

  it('defaults skipErrorHandling to false when not passed', async () => {
    const api = (await import('@/utils/api')).default

    await workflowsStore.getWorkflow(1)

    expect(api.get).toHaveBeenCalledWith('v1/workflows/id/1', { skipErrorHandling: false })
  })
})
