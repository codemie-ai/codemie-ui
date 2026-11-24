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

import { workflowsStore } from '../workflows'

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

describe('workflowsStore.validateWorkflowConfig', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPost.mockResolvedValue({})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts to the id validate endpoint with the full body, json format and skipErrorHandling', async () => {
    const body = { yaml_config: 'states: []', yaml_config_history: [{ yaml_config: 'old' }] }

    await workflowsStore.validateWorkflowConfig({ id: 'wf-1', body })

    expect(mockPost).toHaveBeenCalledWith('v1/workflows/wf-1/validate?error_format=json', body, {
      skipErrorHandling: true,
      signal: undefined,
    })
  })

  it('posts to the id-less endpoint with project and without history', async () => {
    const body = {
      project: 'proj-1',
      name: 'wf',
      yaml_config: 'states: []',
      yaml_config_history: [{ yaml_config: 'old' }],
    }

    await workflowsStore.validateWorkflowConfig({ body })

    expect(mockPost).toHaveBeenCalledWith(
      'v1/workflows/validate?error_format=json',
      { project: 'proj-1', name: 'wf', yaml_config: 'states: []' },
      { skipErrorHandling: true, signal: undefined }
    )
  })

  it('does not mutate the caller body on the id-less endpoint', async () => {
    const body = { project: 'p', yaml_config_history: [] }

    await workflowsStore.validateWorkflowConfig({ body })

    expect(body).toHaveProperty('yaml_config_history')
  })

  it('forwards the abort signal', async () => {
    const { signal } = new AbortController()

    await workflowsStore.validateWorkflowConfig({ id: 7, body: {}, signal })

    expect(mockPost).toHaveBeenCalledWith(
      'v1/workflows/7/validate?error_format=json',
      {},
      {
        skipErrorHandling: true,
        signal,
      }
    )
  })

  it('returns the raw response', async () => {
    const response = { ok: true }
    mockPost.mockResolvedValue(response)

    await expect(workflowsStore.validateWorkflowConfig({ id: 'wf-1', body: {} })).resolves.toBe(
      response
    )
  })
})
