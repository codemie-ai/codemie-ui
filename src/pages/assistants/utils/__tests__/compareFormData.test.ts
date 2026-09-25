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

import { afterEach, describe, expect, it, vi } from 'vitest'

import { compareFormData } from '../compareFormData'

const { mockAppInfoStore } = vi.hoisted(() => ({
  mockAppInfoStore: { llmModels: [] as any[], llmRouters: [] as any[] },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: mockAppInfoStore,
}))

const base = {
  project: 'p1',
  name: 'Assistant',
  description: 'desc',
  icon_url: '',
  enable_image_generation: false,
  image_generation_model: '',
  toolkits: [],
  mcp_servers: [],
  llm_model_type: 'gpt-4',
  enabled_builtin_subagents: [],
  file_attachment_enabled: true,
}

describe('compareFormData — file_attachment_enabled', () => {
  it('detects file_attachment_enabled changes', () => {
    const initial = { ...base, file_attachment_enabled: true }
    const current = { ...base, file_attachment_enabled: false }
    expect(compareFormData(initial, current)).toBe(true)
  })

  it('treats null and true as the same (attachments allowed)', () => {
    const initial = { ...base, file_attachment_enabled: null }
    const current = { ...base, file_attachment_enabled: true }
    expect(compareFormData(initial, current)).toBe(false)
  })
})

describe('compareFormData — llm_model_type default', () => {
  afterEach(() => {
    mockAppInfoStore.llmModels = []
    mockAppInfoStore.llmRouters = []
  })

  it('treats an unset model as the default router when a router is the global default', () => {
    mockAppInfoStore.llmModels = [{ value: 'gpt-4', label: 'GPT-4', isDefault: false }]
    mockAppInfoStore.llmRouters = [
      { value: 'smart-router', label: 'Smart Router', isDefault: true },
    ]

    const initial = { ...base, llm_model_type: '' }
    const current = { ...base, llm_model_type: 'smart-router' }

    expect(compareFormData(initial, current)).toBe(false)
  })

  it('treats an unset model as the default model when no router is default', () => {
    mockAppInfoStore.llmModels = [
      { value: 'gpt-4', label: 'GPT-4', isDefault: false },
      { value: 'claude-2', label: 'Claude-2', isDefault: true },
    ]
    mockAppInfoStore.llmRouters = [
      { value: 'smart-router', label: 'Smart Router', isDefault: false },
    ]

    const initial = { ...base, llm_model_type: '' }
    const current = { ...base, llm_model_type: 'claude-2' }

    expect(compareFormData(initial, current)).toBe(false)
  })
})
