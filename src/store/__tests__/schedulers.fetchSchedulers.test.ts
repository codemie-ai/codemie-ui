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

import { schedulersStore } from '@/store/schedulers'
import api from '@/utils/api'

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn() },
}))

const mockResponse = {
  items: [],
  pagination: { page: 0, per_page: 10, total: 0, pages: 0 },
}

describe('schedulersStore.fetchSchedulers', () => {
  beforeEach(() => {
    vi.mocked(api.get).mockReset()
    vi.mocked(api.get).mockResolvedValue({ json: async () => mockResponse } as Response)
  })

  it('sends every selected projectId and resourceId', async () => {
    await schedulersStore.fetchSchedulers({ projectId: ['A', 'B'], resourceId: ['r1', 'r2'] })

    expect(api.get).toHaveBeenCalledWith('v1/schedulers', {
      params: expect.objectContaining({ projectId: ['A', 'B'], resourceId: ['r1', 'r2'] }),
    })
  })

  it('omits projectId and resourceId when the selections are empty', async () => {
    await schedulersStore.fetchSchedulers({ projectId: [], resourceId: [] })

    const { params } = vi.mocked(api.get).mock.calls[0][1] as { params: Record<string, unknown> }
    expect(params).not.toHaveProperty('projectId')
    expect(params).not.toHaveProperty('resourceId')
  })
})
