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

import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { INDEX_TYPES } from '@/constants/dataSources'

import { useEditPopup } from '../useEditPopup'

const jiraSetting = {
  id: 'only-id',
  alias: 'My Jira',
  setting_type: 'Jira',
  project_name: 'demo',
  is_global: false,
  credential_type: 'jira',
}

const otherProjectJiraSetting = { ...jiraSetting, id: 'other-id', project_name: 'other' }

vi.mock('@/store/userSettings', () => ({
  userSettingsStore: { settings: {} },
}))

vi.mock('@/store/appInfo', () => ({
  appInfoStore: { embeddingModels: [], llmModels: [], fetchCustomerConfig: vi.fn() },
}))

vi.mock('valtio', async (importOriginal) => ({
  ...(await importOriginal<typeof import('valtio')>()),
  useSnapshot: () => ({
    settings: { [INDEX_TYPES.JIRA]: [jiraSetting, otherProjectJiraSetting] },
  }),
}))

const renderUseEditPopup = (isEditing: boolean) => {
  const values: Record<string, unknown> = {
    projectName: 'demo',
    indexType: INDEX_TYPES.JIRA,
    isEditing,
  }
  const getValues = vi.fn((name: string) => values[name])
  const watch = vi.fn((name: string) => values[name])
  const setValue = vi.fn()

  const { rerender } = renderHook(() =>
    useEditPopup({ getValues: getValues as any, setValue, watch: watch as any })
  )

  return { setValue, values, rerender }
}

describe('useEditPopup — single-integration auto-select', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('does not auto-select on edit', () => {
    const { setValue } = renderUseEditPopup(true)

    expect(setValue.mock.calls.some(([name]) => name === 'setting_id')).toBe(false)
  })

  it('auto-selects the new project integration when the project changes on edit', () => {
    const { setValue, values, rerender } = renderUseEditPopup(true)

    values.projectName = 'other'
    rerender()

    expect(setValue).toHaveBeenCalledWith('setting_id', 'other-id')
  })

  it('still auto-selects on create', () => {
    const { setValue } = renderUseEditPopup(false)

    expect(setValue).toHaveBeenCalledWith('setting_id', 'only-id')
  })
})
