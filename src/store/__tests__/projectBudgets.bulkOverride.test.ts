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

import { projectBudgetsStore } from '@/store/projectBudgets'
import { BulkMemberOverrideItem, BulkMemberOverrideResponse } from '@/types/entity/projectBudget'
import api from '@/utils/api'
import toaster from '@/utils/toaster'

describe('projectBudgetsStore.bulkOverrideMemberAllocations', () => {
  const items: BulkMemberOverrideItem[] = [
    { budget_id: 'b-1', user_id: 'u-1', allocated_max_budget: 10, allocated_soft_budget: 5 },
    {
      budget_id: 'b-1',
      user_id: 'u-2',
      allocated_max_budget: 20,
      allocated_soft_budget: 8,
      override_reason: 'because',
    },
  ]

  beforeEach(() => {
    vi.restoreAllMocks()
    projectBudgetsStore.loading = false
    projectBudgetsStore.error = null
  })

  it('posts the items to the bulk endpoint without the global error toast and returns the response', async () => {
    const data: BulkMemberOverrideResponse = {
      results: [
        { budget_id: 'b-1', user_id: 'u-1', status: 'ok' },
        { budget_id: 'b-1', user_id: 'u-2', status: 'failed', code: 400, message: 'nope' },
      ],
      budgets: [],
    }
    const spy = vi
      .spyOn(api, 'post')
      .mockResolvedValue({ json: async () => data } as unknown as Response)

    const result = await projectBudgetsStore.bulkOverrideMemberAllocations(items)

    expect(spy).toHaveBeenCalledWith(
      'v1/admin/project-budgets/member-overrides/bulk',
      { items },
      { skipErrorHandling: true }
    )
    expect(result).toEqual(data)
    expect(projectBudgetsStore.loading).toBe(false)
  })

  it('rethrows a rejected request, records the error and does not toast', async () => {
    const error = { parsedError: { message: 'Forbidden' } }
    vi.spyOn(api, 'post').mockRejectedValue(error)
    const toastSpy = vi.spyOn(toaster, 'error').mockImplementation(() => undefined as never)

    await expect(projectBudgetsStore.bulkOverrideMemberAllocations(items)).rejects.toBe(error)

    expect(projectBudgetsStore.error).toBe('Forbidden')
    expect(projectBudgetsStore.loading).toBe(false)
    expect(toastSpy).not.toHaveBeenCalled()
  })
})
