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

import { beforeEach, describe, expect, it, vi } from 'vitest'

import { customerConfigurationStore } from '@/store/customerConfiguration'
import { SettingDeclaration } from '@/types/entity/customerConfiguration'

const mockGet = vi.fn()
const mockPut = vi.fn()
const mockDelete = vi.fn()

vi.mock('@/utils/api', () => ({
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    put: (...args: unknown[]) => mockPut(...args),
    delete: (...args: unknown[]) => mockDelete(...args),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), success: vi.fn(), info: vi.fn() },
}))

const declaration: SettingDeclaration = {
  component_id: 'chatDisclaimer',
  label: 'Chat disclaimer',
  description: null,
  overridden: false,
  value: { enabled: false, text: '' },
  fields: [
    {
      name: 'enabled',
      type: 'switch',
      label: 'Show disclaimer',
      description: null,
      required: false,
      max_length: null,
      pattern: null,
      pattern_message: null,
      markup: 'plain',
    },
    {
      name: 'text',
      type: 'textarea',
      label: 'Disclaimer text',
      description: null,
      required: false,
      max_length: 1000,
      pattern: null,
      pattern_message: null,
      markup: 'markdown',
    },
  ],
}

describe('customerConfigurationStore', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    customerConfigurationStore.settings = []
    customerConfigurationStore.loading = false
    customerConfigurationStore.error = null
  })

  it('loads declarations from the declarations endpoint', async () => {
    mockGet.mockResolvedValue({ json: () => Promise.resolve([declaration]) })

    const result = await customerConfigurationStore.indexSettings()

    expect(mockGet).toHaveBeenCalledWith('v1/config/declarations')
    expect(result).toEqual([declaration])
    expect(customerConfigurationStore.settings).toEqual([declaration])
  })

  it('keeps an empty registry as an empty list rather than an error', async () => {
    mockGet.mockResolvedValue({ json: () => Promise.resolve([]) })

    await customerConfigurationStore.indexSettings()

    expect(customerConfigurationStore.settings).toEqual([])
    expect(customerConfigurationStore.error).toBeNull()
  })

  it('records the error when loading fails', async () => {
    mockGet.mockRejectedValue(new Error('boom'))

    await expect(customerConfigurationStore.indexSettings()).rejects.toThrow('boom')
    expect(customerConfigurationStore.error).toBe('boom')
    expect(customerConfigurationStore.loading).toBe(false)
  })

  it('saves a setting through the declarations endpoint', async () => {
    mockPut.mockResolvedValue({
      json: () =>
        Promise.resolve({
          component_id: 'chatDisclaimer',
          settings: { enabled: true, text: 'hi' },
        }),
    })

    await customerConfigurationStore.saveSetting('chatDisclaimer', { enabled: true, text: 'hi' })

    expect(mockPut).toHaveBeenCalledWith('v1/config/declarations/chatDisclaimer', {
      settings: { enabled: true, text: 'hi' },
    })
  })

  it('resets a setting through the declarations endpoint', async () => {
    mockDelete.mockResolvedValue({})

    await customerConfigurationStore.resetSetting('chatDisclaimer')

    expect(mockDelete).toHaveBeenCalledWith('v1/config/declarations/chatDisclaimer')
  })
})
