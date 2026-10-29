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
import { describe, it, expect } from 'vitest'

import { MCPServerFormData } from '../../mcpServerValidation'
import { transformFormDataToSubmit } from '../modalHelpers'

const buildFormData = (overrides: Partial<MCPServerFormData> = {}): MCPServerFormData => ({
  name: 'server',
  description: 'desc',
  categories: [],
  icon_url: '',
  server_home_url: '',
  source_url: '',
  serverConfig: '{"url":"https://example.com"}',
  required_env_vars: [],
  ...overrides,
})

describe('transformFormDataToSubmit - required_env_vars', () => {
  it('sends an empty array when the variable list is empty so removal is persisted', () => {
    const result = transformFormDataToSubmit(buildFormData({ required_env_vars: [] }))

    expect(result.required_env_vars).toEqual([])
  })

  it('sends an empty array when the variable list is absent', () => {
    const result = transformFormDataToSubmit(
      buildFormData({
        required_env_vars: undefined as unknown as MCPServerFormData['required_env_vars'],
      })
    )

    expect(result.required_env_vars).toEqual([])
  })

  it('maps a non-empty list to name, description and required items', () => {
    const result = transformFormDataToSubmit(
      buildFormData({ required_env_vars: [{ name: 'API_TOKEN', description: 'Token' }] })
    )

    expect(result.required_env_vars).toEqual([
      { name: 'API_TOKEN', description: 'Token', required: true },
    ])
  })

  it('keeps an explicit required flag set to false', () => {
    const result = transformFormDataToSubmit(
      buildFormData({
        required_env_vars: [{ name: 'OPTIONAL', description: 'Opt', required: false }],
      })
    )

    expect(result.required_env_vars).toEqual([
      { name: 'OPTIONAL', description: 'Opt', required: false },
    ])
  })
})

describe('transformFormDataToSubmit - categories', () => {
  it('sends an empty array when all categories are removed so removal is persisted', () => {
    const result = transformFormDataToSubmit(buildFormData({ categories: [] }))

    expect(result.categories).toEqual([])
  })

  it('drops empty entries from the category list', () => {
    const result = transformFormDataToSubmit(buildFormData({ categories: ['AI', '', 'Data'] }))

    expect(result.categories).toEqual(['AI', 'Data'])
  })
})
