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

import { workflowsStore } from '@/store/workflows'

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

describe('workflowsStore.generateWorkflow', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('posts to v1/workflows/generate with correct body and returns parsed JSON', async () => {
    const responseData = { name: 'Summarizer', description: 'Desc', yaml_config: 'states: []' }
    mockPost.mockResolvedValue({ json: async () => responseData })

    const result = await workflowsStore.generateWorkflow('create a summarizer', false)

    expect(mockPost).toHaveBeenCalledWith('v1/workflows/generate', {
      text: 'create a summarizer',
      include_tools: false,
    })
    expect(result).toEqual(responseData)
  })

  it('passes include_tools=true when requested', async () => {
    const responseData = { name: 'Tool WF', description: 'With tools', yaml_config: 'states: []' }
    mockPost.mockResolvedValue({ json: async () => responseData })

    await workflowsStore.generateWorkflow('create a workflow with tools', true)

    expect(mockPost).toHaveBeenCalledWith('v1/workflows/generate', {
      text: 'create a workflow with tools',
      include_tools: true,
    })
  })
})
