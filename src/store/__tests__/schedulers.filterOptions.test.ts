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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

const mockFilterOptionsResponse = {
  resources: [
    { id: 'r1', name: 'Daily Jira Reporter', type: 'Assistant' },
    { id: 'r2', name: 'Sales Pipeline Sync', type: 'Workflow' },
  ],
  projects: [
    { id: 'p1', name: 'Platform Team' },
    { id: 'p2', name: 'Growth Squad' },
  ],
}

describe('schedulersStore.fetchFilterOptions', () => {
  beforeEach(() => {
    schedulersStore.filterOptions = { resources: [], projects: [] }
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('populates filterOptions.resources from GET /v1/schedulers/filter-options', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      json: () => Promise.resolve(mockFilterOptionsResponse),
    } as Response)

    await schedulersStore.fetchFilterOptions()

    expect(api.get).toHaveBeenCalledWith('/v1/schedulers/filter-options')
    expect(schedulersStore.filterOptions.resources).toEqual(mockFilterOptionsResponse.resources)
  })

  it('populates filterOptions.projects from GET /v1/schedulers/filter-options', async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      json: () => Promise.resolve(mockFilterOptionsResponse),
    } as Response)

    await schedulersStore.fetchFilterOptions()

    expect(schedulersStore.filterOptions.projects).toEqual(mockFilterOptionsResponse.projects)
  })
})
