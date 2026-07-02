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

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReplace = vi.fn()
const mockPush = vi.fn()

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRoute: () => ({ query: {} }),
  useVueRouter: () => ({
    replace: mockReplace,
    push: mockPush,
    currentRoute: { value: { query: {} } },
  }),
  replace: vi.fn(),
  router: {},
}))

// Mutable so tests can change the pathname mid-flight
const { mockHashRouter } = vi.hoisted(() => ({
  mockHashRouter: {
    state: { location: { pathname: '/assistants/templates' } },
    navigate: vi.fn(),
  },
}))

vi.mock('@/router', () => ({ router: mockHashRouter }))

const mockLoadAssistants = vi.fn()
vi.mock('@/pages/assistants/hooks/useAssistants', () => ({
  useAssistants: () => ({
    loadAssistants: mockLoadAssistants,
    pagination: { page: 0, perPage: 12, totalPages: 1 },
    assistants: [],
    loading: false,
  }),
}))

const TEMPLATES_SCOPE = 'templates'
const FAVORITES_SCOPE = 'favorites'

function makeNavigationDuringLoad(navigateTo: string): {
  settle: () => void
  promise: Promise<void>
} {
  let settle!: () => void
  const promise = new Promise<void>((resolve) => {
    settle = () => {
      mockHashRouter.state.location.pathname = navigateTo
      resolve()
    }
  })
  return { settle, promise }
}

describe('useAssistantsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHashRouter.state.location.pathname = '/assistants/templates'
  })

  const getHook = async (scope = TEMPLATES_SCOPE) => {
    const { useAssistantsList } = await import('../useAssistantsList')
    return renderHook(() => useAssistantsList({ scope, filterValues: {} }))
  }

  describe('updateURL after fetch', () => {
    it('calls router.replace when pathname has not changed after fetch', async () => {
      mockLoadAssistants.mockResolvedValue(undefined)

      const { result } = await getHook()

      await act(async () => {
        await result.current.loadAssistantsList({ page: 0 })
      })

      expect(mockReplace).toHaveBeenCalledTimes(1)
    })

    it('skips router.replace when user navigates away during the API call', async () => {
      const { settle, promise } = makeNavigationDuringLoad('/assistants')
      mockLoadAssistants.mockReturnValue(promise)

      const { result } = await getHook()

      const loadPromise = result.current.loadAssistantsList()
      settle()
      await loadPromise

      expect(mockReplace).not.toHaveBeenCalled()
    })

    it('skips router.replace for favorites scope even when pathname is unchanged', async () => {
      mockLoadAssistants.mockResolvedValue(undefined)
      mockHashRouter.state.location.pathname = '/favorites'

      const { result } = await getHook(FAVORITES_SCOPE)

      await act(async () => {
        await result.current.loadAssistantsList()
      })

      expect(mockReplace).not.toHaveBeenCalled()
    })
  })

  describe('stale URL params do not bleed after quick tab switch', () => {
    it('does not write URL params when navigation away happens before API resolves', async () => {
      const originalPath = '/assistants/templates'
      const { settle, promise } = makeNavigationDuringLoad('/assistants')
      mockLoadAssistants.mockReturnValue(promise)

      const { result } = await getHook()
      expect(mockHashRouter.state.location.pathname).toBe(originalPath)

      const loadPromise = result.current.loadAssistantsList()
      settle()
      await loadPromise

      expect(mockReplace).not.toHaveBeenCalled()
    })
  })
})
