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

import { costCentersStore } from '@/store/costCenters'
import api from '@/utils/api'

describe('costCentersStore.getCostCenterBudgetSummary', () => {
  const summary = { current_spending: 1, budget_limit: 2, total_percent: 50, budgets: [] }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('requests the encoded budget-rollup endpoint with the abort signal and no global error toast', async () => {
    const spy = vi
      .spyOn(api, 'get')
      .mockResolvedValue({ json: async () => summary } as unknown as Response)
    const { signal } = new AbortController()

    const result = await costCentersStore.getCostCenterBudgetSummary('a/b c', signal)

    expect(spy).toHaveBeenCalledWith('v1/admin/cost-centers/a%2Fb%20c/budget-rollup', {
      skipErrorHandling: true,
      signal,
    })
    expect(result).toEqual(summary)
  })
})
