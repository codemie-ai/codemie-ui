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
import { UserListItem } from '@/types/entity/user'

import ProjectMemberModelOverrideModal from '../ProjectMemberModelOverrideModal'

const { mockAppInfoStore, mockSettingsStore } = vi.hoisted(() => ({
  mockAppInfoStore: { getLLMModels: vi.fn() },
  mockSettingsStore: { fetchSettings: vi.fn(), saveMemberOverrides: vi.fn() },
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/projectModelSettings', () => ({ projectModelSettingsStore: mockSettingsStore }))
vi.mock('@/utils/toaster', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

// The table has its own tests; each model becomes a toggle showing its tri-state.
vi.mock('../ModelConfigurationTable', () => ({
  default: ({ models, getSelectionState, onSelectionChange }: any) => (
    <ul>
      {models.map((model: ModelOption) => {
        const state = getSelectionState(model)
        return (
          <li key={model.value}>
            <button type="button" onClick={() => onSelectionChange(model, state !== 'checked')}>
              {`${model.value}:${state}`}
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
  { label: 'Model C', value: 'model-c', isDefault: false },
]

const user = (id: string): UserListItem => ({ id, name: id, email: `${id}@x` } as UserListItem)

const renderModal = async (users: UserListItem[], settings: ProjectModelSettings) => {
  mockSettingsStore.fetchSettings.mockResolvedValue(settings)
  render(
    <ProjectMemberModelOverrideModal isOpen users={users} projectName="team" onClose={vi.fn()} />
  )
  await screen.findByRole('button', { name: /model-a:/ })
}

describe('ProjectMemberModelOverrideModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.getLLMModels.mockResolvedValue(CATALOG)
    mockSettingsStore.saveMemberOverrides.mockResolvedValue(DEFAULT_PROJECT_MODEL_SETTINGS)
  })

  afterEach(cleanup)

  it('offers only models the project makes available', async () => {
    await renderModal([user('u1')], {
      ...DEFAULT_PROJECT_MODEL_SETTINGS,
      mode: 'deny_list',
      models: ['model-c'],
    })

    expect(screen.queryByRole('button', { name: /model-c:/ })).not.toBeInTheDocument()
  })

  it('saves a disabled model as the member override', async () => {
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS)

    fireEvent.click(screen.getByRole('button', { name: 'model-b:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() =>
      expect(mockSettingsStore.saveMemberOverrides).toHaveBeenCalledWith('team', {
        u1: { disabled_models: ['model-b'], default_model: null },
      })
    )
  })

  it('keeps each member’s own state for a row left mixed in a bulk edit', async () => {
    await renderModal([user('u1'), user('u2')], {
      ...DEFAULT_PROJECT_MODEL_SETTINGS,
      member_overrides: { u1: { disabled_models: ['model-b'], default_model: null } },
    })
    expect(screen.getByRole('button', { name: 'model-b:mixed' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'model-c:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() =>
      expect(mockSettingsStore.saveMemberOverrides).toHaveBeenCalledWith('team', {
        u1: { disabled_models: ['model-b', 'model-c'], default_model: null },
        u2: { disabled_models: ['model-c'], default_model: null },
      })
    )
  })

  it('moves the default to an enabled model when the default model is disabled', async () => {
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS)

    fireEvent.click(screen.getByRole('button', { name: 'model-a:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() =>
      expect(mockSettingsStore.saveMemberOverrides).toHaveBeenCalledWith('team', {
        u1: { disabled_models: ['model-a'], default_model: 'model-b' },
      })
    )
  })

  it('explains why Apply is disabled when every model is turned off', async () => {
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS)

    fireEvent.click(screen.getByRole('button', { name: 'model-a:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-b:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-c:checked' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Keep at least one model enabled for the member'
    )
    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled()
  })

  it('makes the one re-enabled model the default after everything was turned off', async () => {
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS)

    fireEvent.click(screen.getByRole('button', { name: 'model-a:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-b:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-c:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-c:unchecked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() =>
      expect(mockSettingsStore.saveMemberOverrides).toHaveBeenCalledWith('team', {
        u1: { disabled_models: ['model-a', 'model-b'], default_model: 'model-c' },
      })
    )
  })

  it('returns to the project default when the only change is undone', async () => {
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS)

    fireEvent.click(screen.getByRole('button', { name: 'model-a:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-a:unchecked' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
