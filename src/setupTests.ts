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
import { vi, beforeEach, beforeAll } from 'vitest'
import '@testing-library/jest-dom'

const localStorageMock = (() => {
  let store: Record<string, string> = {}

  return {
    getItem: (key: string) => store[key] || null,
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

vi.mock('@/hooks/useVueRouter', () => {
  return {
    __esModule: true,
    default: vi.fn(),
    useVueRouter: vi.fn(),
  }
})

const helpAssistantFilters = {
  slug: ['codemie-feedback', 'ai-run-chatbot', 'codemie-onboarding', 'prompt-engineer'],
}

type GlobalMockFn = () => Promise<any>
type GlobalMocks = Record<string, GlobalMockFn>

const globalMocks: GlobalMocks = {
  'v1/llm_models': () => Promise.resolve([]),
  'v1/embeddings_models': () => Promise.resolve([]),
  'v1/config': () => Promise.resolve([]),
  'v1/assistants/user': () => Promise.resolve([]),
  'v1/assistants/categories': () =>
    Promise.resolve([
      { id: 1, name: 'Productivity', description: 'Tools to boost productivity' },
      { id: 2, name: 'Development', description: 'Development and coding assistants' },
      { id: 3, name: 'Research', description: 'Research and analysis tools' },
    ]),
  'v1/assistants?page=0&scope=created_by_user&filters=%7B%7D&minimal_response=true': () =>
    Promise.resolve({
      data: [],
      pagination: {},
    }),
  [`v1/assistants?page=0&filters=${encodeURIComponent(
    JSON.stringify({ id: [] })
  )}&minimal_response=true`]: () =>
    Promise.resolve({
      data: [],
      pagination: {},
    }),
  'v1/user': () => Promise.resolve({ applications: [] }),
  'v1/settings/user/available': () => Promise.resolve([]),
  'v1/admin/applications?limit=5': () => Promise.resolve({ applications: [] }),
  'v1/conversations/folders/list': () => Promise.resolve([]),
  [`v1/assistants?page=0&filters=${encodeURIComponent(
    JSON.stringify(helpAssistantFilters)
  )}&scope=all&minimal_response=true`]: () =>
    Promise.resolve({
      data: [],
      pagination: {},
    }),
}

const mockReturn = vi.hoisted(() => async (url: string) => ({
  status: 200,
  json: () => (globalMocks[url] ? globalMocks[url]() : {}),
}))

const getMock = vi.hoisted(() => vi.fn().mockImplementation(mockReturn))
const postMock = vi.hoisted(() => vi.fn().mockImplementation(mockReturn))
const putMock = vi.hoisted(() => vi.fn().mockImplementation(mockReturn))
const deleteMock = vi.hoisted(() => vi.fn().mockImplementation(mockReturn))

interface MockConfig {
  [key: string]: ((...args: any[]) => Promise<any>) | { spy: (...args: any[]) => any }
}

const mockApiCall =
  (config: MockConfig) =>
  async (url: string, ...rest: any[]) => {
    if (config[url]) {
      if ('spy' in config[url] && typeof config[url].spy === 'function') {
        return config[url].spy(...rest)
      }

      return {
        status: 200,
        json: () => (config[url] as (...args: any[]) => Promise<any>)(...rest),
      }
    }

    if (globalMocks[url]) {
      return {
        status: 200,
        json: () => globalMocks[url](),
      }
    }

    return { status: 200, json: () => ({}) }
  }

vi.mock('@/utils/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/utils/api')>()

  return {
    default: {
      get: getMock,
      post: postMock,
      put: putMock,
      delete: deleteMock,
      handleError: mod.default.handleError,
    },
  }
})

// Automatically unmount and cleanup DOM after each test
beforeEach(() => {
  cleanup()
})

// Mock valtio
vi.mock('valtio', async () => {
  const actual = await vi.importActual('valtio')
  return {
    ...actual,
    useSnapshot: vi.fn().mockImplementation((store) => store),
    subscribe: vi.fn().mockImplementation(() => () => {}),
  }
})

// Mock stores
vi.mock('@/store/assistants', () => ({
  assistantsStore: {
    deleteAssistant: vi.fn().mockResolvedValue({}),
    createAssistant: vi.fn().mockResolvedValue({}),
    updateAssistant: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/store', () => ({
  userStore: {
    user: { id: 'test-user-id', email: 'test@example.com' },
  },
}))

// Mock hooks
vi.mock('@/pages/assistants/hooks/useAssistants', () => ({
  useAssistants: vi.fn().mockReturnValue({
    assistants: [],
    loadAssistants: vi.fn().mockResolvedValue([]),
    pagination: { perPage: 10, totalPages: 1 },
    assistantTemplates: [],
  }),
}))

vi.mock('@/utils/storage', async () => {
  return {
    default: {
      getObject: vi.fn().mockReturnValue([]),
      get: vi.fn().mockReturnValue([]),
      put: vi.fn(),
      remove: vi.fn(),
    },
  }
})

vi.mock('@/utils/toaster', () => ({
  default: {
    error: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
  },
}))

beforeAll(() => {})

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

interface TestContext {
  api: {
    mockGet: (config: MockConfig) => void
    mockPost: (config: MockConfig) => void
    mockPut: (config: MockConfig) => void
    mockDelete: (config: MockConfig) => void
  }
  mountPage: () => Promise<Record<string, any>>
}

beforeEach(async (context: TestContext) => {
  getMock.mockImplementation(mockReturn)
  postMock.mockImplementation(mockReturn)
  putMock.mockImplementation(mockReturn)
  deleteMock.mockImplementation(mockReturn)

  context.api = {
    mockGet: (config) => getMock.mockImplementation(mockApiCall(config)),
    mockPost: (config) => postMock.mockImplementation(mockApiCall(config)),
    mockPut: (config) => putMock.mockImplementation(mockApiCall(config)),
    mockDelete: (config) => deleteMock.mockImplementation(mockApiCall(config)),
  }

  context.mountPage = async () => {
    return {}
  }
})
