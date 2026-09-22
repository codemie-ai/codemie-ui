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

import type { ProjectBudget } from '@/types/entity/projectBudget'

import { getAnalyticsMemberLink } from '../getAnalyticsMemberLink'

// A fake router that encodes query into the returned full path
const makeFakeRouter = () => ({
  resolve: vi.fn(({ query }: { query: Record<string, string> }) => ({
    fullPath: '/analytics',
    searchParamsString: new URLSearchParams(query).toString(),
  })),
})

const baseBudget = (overrides: Partial<ProjectBudget> = {}): ProjectBudget => ({
  budget_id: 'b-1',
  name: 'Test Budget',
  project_name: 'my-project',
  budget_category: 'platform',
  soft_budget: 100,
  max_budget: 200,
  budget_duration: '30d',
  budget_reset_at: '2026-06-01T00:00:00.000Z',
  provider_sync_status: null,
  member_count: 0,
  allocated_member_budget_total: 0,
  member_allocations: [],
  ...overrides,
})

describe('getAnalyticsMemberLink', () => {
  it('includes tab=insights, projects=<name>, and users=<id> in the URL', () => {
    const router = makeFakeRouter()
    const href = getAnalyticsMemberLink(router as any, 'my-project', 'user-42', [baseBudget()])
    expect(href).toContain('tab=insights')
    expect(href).toContain('projects=my-project')
    expect(href).toContain('users=user-42')
  })

  it('includes start_date and end_date (but not time_period) when budgets yield a period', () => {
    const router = makeFakeRouter()
    const href = getAnalyticsMemberLink(router as any, 'proj', 'u-1', [baseBudget()])
    expect(href).toContain('start_date=')
    expect(href).toContain('end_date=')
    // time_period should be present but empty to prevent localStorage bleed
    const params = new URLSearchParams(href.split('?')[1] ?? href)
    expect(params.get('time_period')).toBe('')
  })

  it('includes time_period (but not start_date/end_date values) when no period is available', () => {
    const router = makeFakeRouter()
    const href = getAnalyticsMemberLink(router as any, 'proj', 'u-1', [])
    expect(href).toContain('time_period=')
    const params = new URLSearchParams(href.split('?')[1] ?? href)
    expect(params.get('time_period')).not.toBe('')
    // start_date and end_date should be present but empty
    expect(params.get('start_date')).toBe('')
    expect(params.get('end_date')).toBe('')
  })

  it('always emits all six filter keys to prevent localStorage bleed', () => {
    const SIX_KEYS = ['tab', 'projects', 'users', 'time_period', 'start_date', 'end_date']

    // With budget period
    const routerWithBudget = makeFakeRouter()
    const hrefWithBudget = getAnalyticsMemberLink(routerWithBudget as any, 'proj', 'u-1', [
      baseBudget(),
    ])
    const paramsWithBudget = new URLSearchParams(hrefWithBudget.split('?')[1] ?? hrefWithBudget)
    for (const key of SIX_KEYS) {
      expect(paramsWithBudget.has(key), `key "${key}" missing in budget-period branch`).toBe(true)
    }

    // Without budget period
    const routerNoBudget = makeFakeRouter()
    const hrefNoBudget = getAnalyticsMemberLink(routerNoBudget as any, 'proj', 'u-1', [])
    const paramsNoBudget = new URLSearchParams(hrefNoBudget.split('?')[1] ?? hrefNoBudget)
    for (const key of SIX_KEYS) {
      expect(paramsNoBudget.has(key), `key "${key}" missing in no-budget branch`).toBe(true)
    }
  })
})
