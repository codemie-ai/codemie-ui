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
import { cleanup } from '@testing-library/react'
import { type ReactNode } from 'react'
import { vi, afterEach } from 'vitest'
import '@testing-library/jest-dom'

import { requestRegistry, navigate as navigateMock } from './test-utils/_mock-state'

// ─── Browser globals ──────────────────────────────────────────────────────────

const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString()
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(global, 'localStorage', {
  value: localStorageMock,
  writable: true,
})

global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// ─── Shared mocks (safe for both unit and integration tests) ──────────────────

// SettingsLayout uses useSnapshot with stores that aren't proxy objects in unit tests.
// Mock it to avoid pulling in Layout → Sidebar → SidebarNavigation dependency chain.
vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({
    contentTitle,
    content,
    rightContent,
  }: {
    contentTitle?: string
    content?: ReactNode
    rightContent?: ReactNode
  }) => (
    <div>
      <h1>{contentTitle}</h1>
      <div>{rightContent}</div>
      <div>{content}</div>
    </div>
  ),
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn().mockReturnValue({ push: vi.fn(), params: {} }),
}))

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

// ─── URL helpers ──────────────────────────────────────────────────────────────

const normalizeUrl = (url: string): string => {
  let rawPath: string
  try {
    rawPath = new URL(url).pathname // pathname never includes the query string
  } catch {
    // Relative or malformed URL: "/api/v1/user", "/v1/user", "undefined/v1/user"
    const firstSlash = url.indexOf('/')
    rawPath = firstSlash !== -1 ? url.slice(firstSlash) : '/' + url
    // Strip query string — new URL() does this automatically in the try branch
    const qIdx = rawPath.indexOf('?')
    if (qIdx !== -1) rawPath = rawPath.slice(0, qIdx)
  }
  // Strip leading slashes, then strip any prefix before "v1/" so that
  // BASE_URL = '/api' ("/api/v1/user") and BASE_URL = 'http://host/api' work too.
  const withoutLeading = rawPath.replace(/^\/+/, '')
  const v1Idx = withoutLeading.indexOf('v1/')
  return v1Idx !== -1 ? withoutLeading.slice(v1Idx) : withoutLeading
}

const parseQueryParams = (url: string): Record<string, string> => {
  try {
    return Object.fromEntries(new URL(url).searchParams)
  } catch {
    const qIdx = url.indexOf('?')
    if (qIdx === -1) return {}
    return Object.fromEntries(new URLSearchParams(url.slice(qIdx + 1)))
  }
}

// ─── Global fetch mock ────────────────────────────────────────────────────────

// Intercepts ALL fetch calls — both @/utils/api wrapper (makeRequest → fetch) and
// raw fetch calls in auth stores. Unit tests are insulated via vi.mock('@/utils/api')
// in setupTests.unit.ts which intercepts before fetch is reached.
//
// Simple, stable endpoints — safe to keep as global defaults.
const globalDefaults: Record<string, () => unknown> = {
  'v1/llm_models': () => [],
  'v1/embeddings_models': () => [],
  'v1/config': () => [],
  'v1/assistants/user': () => [],
  'v1/assistants/categories': () => [
    { id: 1, name: 'Productivity', description: 'Tools to boost productivity' },
    { id: 2, name: 'Development', description: 'Development and coding assistants' },
    { id: 3, name: 'Research', description: 'Research and analysis tools' },
  ],
  'v1/user': () => ({ applications: [] }),
  'v1/settings/user/available': () => [],
  'v1/conversations/folders/list': () => [],
}

const parseRequestBody = async (input: RequestInfo | URL, init?: RequestInit): Promise<unknown> => {
  let result: unknown
  try {
    const raw = init?.body ?? (input instanceof Request ? await input.text() : undefined)
    result = typeof raw === 'string' ? JSON.parse(raw as string) : raw
  } catch {
    // malformed JSON or unreadable body — leave result as undefined
  }
  return result
}

const matchRegistry = (
  method: string,
  path: string,
  params: Record<string, string>
): ((body?: unknown) => Response) | null => {
  for (const [key, entry] of requestRegistry) {
    const colonIdx = key.indexOf(':')
    if (key.slice(0, colonIdx) !== method) continue
    const regPath = key.slice(colonIdx + 1)
    const matched = entry.params
      ? path === regPath &&
        Object.entries(entry.params).every(([k, v]) => String(params[k]) === String(v))
      : path === regPath
    if (matched) return entry.factory
  }
  return null
}

const matchDefaults = (path: string): Response | null => {
  const factory = globalDefaults[path]
  if (!factory) return null
  return new Response(JSON.stringify(factory()), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

const fetchMock = vi
  .fn()
  .mockImplementation(async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const rawUrl = String(input instanceof Request ? input.url : input)
    const method = (
      init?.method ??
      (input instanceof Request ? input.method : undefined) ??
      'GET'
    ).toUpperCase()
    const path = normalizeUrl(rawUrl)
    const params = parseQueryParams(rawUrl)
    const body = await parseRequestBody(input, init)

    const registryFactory = matchRegistry(method, path, params)
    if (registryFactory) return registryFactory(body)

    const defaultResponse = matchDefaults(path)
    if (defaultResponse) return defaultResponse

    return new Response(JSON.stringify(null), { status: 200 })
  })

vi.stubGlobal('fetch', fetchMock)

// ─── Router mock ──────────────────────────────────────────────────────────────

// Replaces useNavigate with a stable vi.fn() spy so tests can assert:
//   expect(navigate).toHaveBeenCalledWith('/some-path')
// All other react-router exports (useParams, useLocation, Link, etc.) remain real.
vi.mock('react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-router')>()
  const { navigate: nav } = await import('./test-utils/_mock-state')
  return { ...actual, useNavigate: () => nav }
})

// ─── Test lifecycle ───────────────────────────────────────────────────────────

afterEach(() => {
  requestRegistry.clear()
  navigateMock.mockClear()
  fetchMock.mockClear()
  cleanup()
})
