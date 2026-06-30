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

import { vi } from 'vitest'

// Minimal types for mocking (tests don't need exact type safety)
export type ParamsType = Record<string, any>
export type QueryType = Record<string, any>
export interface RouteOptions {
  path: string
  name: string
  params: ParamsType
  query: QueryType
  hash: string
}
export type RouterPush = (options: any) => void
export interface RouterState extends RouteOptions {
  back: () => void
  push: RouterPush
  replace: RouterPush
  resolve: (options: any) => {
    href: string
    path: string
    fullPath: string
    searchParamsString: string
  }
  currentRoute: { value: RouteOptions }
}

// Minimal utility stubs (tests rarely use these directly)
export const parseSearchParams = (sp: URLSearchParams): QueryType => Object.fromEntries(sp)
export const createSearchParamsString = (q: QueryType): string =>
  new URLSearchParams(q as any).toString()

// Mock implementations for functions that need real module access
export const findRouteObject = vi.fn()
export const findParentRouteObject = vi.fn()

// Default mock router state
export const mockRouterState = {
  path: '/',
  name: '',
  params: {},
  query: {},
  hash: '',
  push: vi.fn() as ReturnType<typeof vi.fn> & RouterPush,
  replace: vi.fn() as ReturnType<typeof vi.fn> & RouterPush,
  back: vi.fn(),
  resolve: vi.fn(({ path, name }: any) => ({
    href: path || `/${name || ''}`,
    path: path || `/${name || ''}`,
    fullPath: path || `/${name || ''}`,
    searchParamsString: '',
  })),
  currentRoute: {
    value: {
      path: '/',
      name: '',
      params: {},
      query: {},
      hash: '',
    },
  },
} as const satisfies Partial<RouterState>

// Hook mocks
export const useVueRoute = vi.fn(() => mockRouterState)
export const useVueRouter = vi.fn(() => mockRouterState)

export const { replace } = mockRouterState
export const { push } = mockRouterState

// Alias for tests that import mockRouter instead of mockRouterState
export const mockRouter = mockRouterState

// Named export matching production `import { router } from '@/hooks/useVueRouter'`
// used by navigateBack() in utils/helpers.ts
export const router = mockRouterState
