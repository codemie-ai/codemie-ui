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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ERROR_FORMAT_JSON, workflowsStore } from '../workflows'

const mockPost = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: vi.fn(),
    post: (...args: unknown[]) => mockPost(...args),
    put: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  },
}))

vi.mock('@/store/preferences', () => ({
  preferencesStore: { preferences: null },
}))

// workflows.ts → constants/utils can pull MarkdownEditor → react-syntax-highlighter
vi.mock('react-syntax-highlighter', () => ({
  Prism: () => null,
}))
vi.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
  dracula: {},
  prism: {},
}))

describe('workflowsStore.validateWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPost.mockResolvedValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts to the validate endpoint with json error format and skipErrorHandling', async () => {
    const values = { yaml_config: 'states: []' }

    await workflowsStore.validateWorkflow('wf-1', values, ERROR_FORMAT_JSON)

    expect(mockPost).toHaveBeenCalledWith('v1/workflows/wf-1/validate?error_format=json', values, {
      skipErrorHandling: true,
    })
  })

  it('defaults skipErrorHandling to false when errorFormat is omitted', async () => {
    const values = { yaml_config: 'states: []' }

    await workflowsStore.validateWorkflow('wf-1', values)

    expect(mockPost).toHaveBeenCalledWith('v1/workflows/wf-1/validate', values, {
      skipErrorHandling: false,
    })
  })
})
