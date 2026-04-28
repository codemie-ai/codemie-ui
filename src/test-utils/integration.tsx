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

/* eslint-disable import/no-extraneous-dependencies */
import { render, type RenderResult } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'

import { routes } from '@/router'

import { requestRegistry } from './_mock-state'

// Re-export the shared navigate spy so tests can assert on it:
//   import { navigate } from '@/test-utils/integration'
//   expect(navigate).toHaveBeenCalledWith('/dashboard')
export { navigate } from './_mock-state'

// ─── mockAPI ──────────────────────────────────────────────────────────────────

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

// Overload 1: error/custom status  → mockAPI('POST', 'v1/items', data, 401)
// Overload 2: GET with query params → mockAPI('GET', 'v1/items', data, { page: 0 })
// Overload 3: default (status 200) → mockAPI('POST', 'v1/items', data)
export function mockAPI(method: Method, url: string, data: unknown, status?: number): void
export function mockAPI(
  method: Method,
  url: string,
  data: unknown,
  params?: Record<string, unknown>
): void
export function mockAPI(
  method: Method,
  url: string,
  data: unknown,
  paramsOrStatus: Record<string, unknown> | number = 200
): void {
  const status = typeof paramsOrStatus === 'number' ? paramsOrStatus : 200
  const params = typeof paramsOrStatus === 'object' ? paramsOrStatus : undefined

  const factory = () =>
    new Response(JSON.stringify(data), {
      status,
      headers: { 'Content-Type': 'application/json' },
    })

  requestRegistry.set(`${method}:${url}`, { factory, params })
}

// ─── renderPage ───────────────────────────────────────────────────────────────

// Renders the full app at the given route path using the real route config.
// Routes under '/' go through App (Navigation, providers, useInitialDataFetch).
// Top-level routes (/auth/sign-in, /auth/sign-up) render without App — intentional.
//
// Note: useNavigate is mocked globally (setupTests.tsx) — navigate calls are captured
// by the spy but do not update the router history. Use `expect(navigate).toHaveBeenCalledWith`
// to assert navigation; post-navigation rendering cannot be tested with this setup.
export const renderPage = (path: string): RenderResult => {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  return render(<RouterProvider router={router} />)
}
