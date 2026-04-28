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
// Unit-test-specific mocks loaded on top of setupTests.tsx.
// Integration tests do NOT load this file — they use real Valtio reactivity
// and real stores, with only the API layer mocked.

import { vi } from 'vitest'

// Insulate unit tests from the global fetch mock in setupTests.tsx.
// The module mock intercepts api.get/post/etc before fetch is reached,
// so unit tests stay fast and isolated.
vi.mock('@/utils/api', async (importOriginal) => {
  const mod = await importOriginal<typeof import('@/utils/api')>()
  return {
    default: {
      get: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve([]) }),
      post: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      put: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      delete: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      patch: vi.fn().mockResolvedValue({ status: 200, json: () => Promise.resolve(null) }),
      handleError: mod.default.handleError,
    },
  }
})

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

// Mock valtio — unit tests use a synchronous snapshot simulation (no real reactivity).
// Integration tests unmock this to get real Valtio proxy behaviour.
vi.mock('valtio', async () => {
  const actual = await vi.importActual('valtio')
  return {
    ...actual,
    useSnapshot: vi.fn().mockImplementation((store) => store),
    subscribe: vi.fn().mockImplementation(() => () => {}),
  }
})
