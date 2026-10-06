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

import { matchRoutes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { WOKRFLOW_EXECUTIONS } from '@/constants/routes'

const mockAppInfoStore = vi.hoisted(() => ({
  configs: [] as any[],
  isConfigFetched: false,
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

beforeEach(() => {
  vi.resetModules()
  mockAppInfoStore.configs = []
  mockAppInfoStore.isConfigFetched = false
})

describe('workflowRoutes - WOKRFLOW_EXECUTIONS optional executionId', () => {
  it(
    'matches the bare executions-list path with no executionId param',
    async () => {
      const { routes } = await import('@/router')
      const matches = matchRoutes(routes, '/workflows/wf-123/workflow-executions')

      expect(matches?.at(-1)?.route.id).toBe(WOKRFLOW_EXECUTIONS)
      expect(matches?.at(-1)?.params.workflowId).toBe('wf-123')
      expect(matches?.at(-1)?.params.executionId).toBeUndefined()
    },
    30000
  )

  it(
    'still matches the path with an executionId param',
    async () => {
      const { routes } = await import('@/router')
      const matches = matchRoutes(routes, '/workflows/wf-123/workflow-executions/exec-1')

      expect(matches?.at(-1)?.route.id).toBe(WOKRFLOW_EXECUTIONS)
      expect(matches?.at(-1)?.params.workflowId).toBe('wf-123')
      expect(matches?.at(-1)?.params.executionId).toBe('exec-1')
    },
    30000
  )
})

describe('router', () => {
  it('always registers dataSourceRoutes in the route table regardless of config fetch timing', async () => {
    // Config has not been fetched yet — this is the real app's state when router.tsx is first
    // imported, since appInfoStore.fetchCustomerConfig() only runs after mount. Route ids must
    // still be registered so router.resolve({ name: 'data-sources' }) never throws; the actual
    // flag gate is enforced reactively by FeatureGuard at render time, not by omitting the route.
    mockAppInfoStore.configs = []
    mockAppInfoStore.isConfigFetched = false
    const { routes } = await import('@/router')
    const ids = routes.find((r) => r.id === 'root')!.children!.map((r) => r.id)
    expect(ids).toEqual(
      expect.arrayContaining([
        'data-sources',
        'data-source-details',
        'edit-data-source',
        'create-data-source',
      ])
    )
  }, 30000)

  it('still registers dataSourceRoutes when no retrieval flag is enabled', async () => {
    mockAppInfoStore.configs = []
    mockAppInfoStore.isConfigFetched = true
    const { routes } = await import('@/router')
    const ids = routes.find((r) => r.id === 'root')!.children!.map((r) => r.id)
    expect(ids).toEqual(expect.arrayContaining(['data-sources', 'create-data-source']))
  }, 30000)

  it('registers dataSourceRoutes when one retrieval flag is enabled', async () => {
    mockAppInfoStore.configs = [{ id: 'features:datasources', settings: { enabled: true } }]
    mockAppInfoStore.isConfigFetched = true
    const { routes } = await import('@/router')
    const ids = routes.find((r) => r.id === 'root')!.children!.map((r) => r.id)
    expect(ids).toEqual(expect.arrayContaining(['data-sources', 'create-data-source']))
  }, 30000)
})
