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

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ModelOption } from '@/types/entity/configuration'
import {
  DEFAULT_PROJECT_MODEL_SETTINGS,
  ProjectModelSettings,
} from '@/types/entity/projectModelSettings'

import ProjectModelsSection from '../ProjectModelsSection'

const { mockAppInfoStore, mockSettingsStore, mockToastSuccess } = vi.hoisted(() => ({
  mockAppInfoStore: {
    llmRouters: [] as any[],
    getLLMModels: vi.fn(),
    getProjectLLMModels: vi.fn(),
    invalidateProjectLLMModels: vi.fn(),
  },
  mockSettingsStore: { fetchSettings: vi.fn(), saveSettings: vi.fn() },
  mockToastSuccess: vi.fn(),
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/projectModelSettings', () => ({ projectModelSettingsStore: mockSettingsStore }))
vi.mock('@/utils/toaster', () => ({ default: { success: mockToastSuccess } }))
vi.mock('react-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router')>()),
  useBlocker: () => ({ state: 'unblocked', reset: vi.fn(), proceed: vi.fn() }),
}))

// The table has its own tests; here each model is a toggle so the section's policy logic is visible.
vi.mock('../components/ModelConfigurationTable', () => ({
  default: ({ models, getSelectionState, onSelectionChange }: any) => (
    <ul>
      {models.map((model: ModelOption) => {
        const checked = getSelectionState(model) === 'checked'
        return (
          <li key={model.value}>
            <button type="button" onClick={() => onSelectionChange(model, !checked)}>
              {`${model.value}:${checked ? 'on' : 'off'}`}
            </button>
          </li>
        )
      })}
    </ul>
  ),
}))

const CATALOG: ModelOption[] = [
  { label: 'Model A', value: 'model-a', isDefault: true },
  { label: 'Model B', value: 'model-b', isDefault: false },
  { label: 'Premium', value: 'premium', isDefault: false, isPremium: true },
  { label: 'Router', value: 'router', isDefault: false, isRouter: true },
]

const STORED: ProjectModelSettings = {
  ...DEFAULT_PROJECT_MODEL_SETTINGS,
  member_overrides: { u1: { disabled_models: ['model-b'], default_model: null } },
}

const renderSection = async () => {
  render(<ProjectModelsSection projectName="team" />)
  await screen.findByText('Model configuration')
}

describe('ProjectModelsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.getLLMModels.mockResolvedValue(CATALOG)
    mockAppInfoStore.getProjectLLMModels.mockResolvedValue(CATALOG)
    mockSettingsStore.fetchSettings.mockResolvedValue(STORED)
    mockSettingsStore.saveSettings.mockImplementation((_project, settings) =>
      Promise.resolve(settings)
    )
  })

  afterEach(cleanup)

  it('counts the concrete models available to the project', async () => {
    await renderSection()

    expect(screen.getByText('3 of 3 models available')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled()
  })

  it('saves a disabled model as an explicit allow list and keeps member overrides', async () => {
    await renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'model-b:on' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() => expect(mockSettingsStore.saveSettings).toHaveBeenCalled())
    const [project, saved] = mockSettingsStore.saveSettings.mock.calls[0]
    expect(project).toBe('team')
    expect(saved).toMatchObject({
      mode: 'allow_list',
      models: ['model-a', 'premium'],
      default_model: null,
    })
    expect(saved.member_overrides).toEqual(STORED.member_overrides)
    expect(mockAppInfoStore.invalidateProjectLLMModels).toHaveBeenCalledWith('team')
    expect(mockToastSuccess).toHaveBeenCalledWith('Model settings updated')
  })

  it('blocks saving when no model would be left', async () => {
    await renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'model-a:on' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-b:on' }))
    fireEvent.click(screen.getByRole('button', { name: 'premium:on' }))

    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled()
  })

  it('asks for another default when the default model is disabled', async () => {
    await renderSection()

    fireEvent.click(screen.getByRole('button', { name: 'model-a:on' }))

    expect(screen.getByText('Selected model is not available')).toBeInTheDocument()
  })

  it('shows an inline error when the settings cannot be loaded', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mockSettingsStore.fetchSettings.mockRejectedValue(new Error('403'))

    render(<ProjectModelsSection projectName="team" />)

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Unable to load project model settings.'
    )
  })
})
