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

import ProjectMemberModelOverrideModal, {
  ModelOverrideMap,
} from '../ProjectMemberModelOverrideModal'

const { mockAppInfoStore, mockSettingsStore } = vi.hoisted(() => ({
  mockAppInfoStore: { getLLMModels: vi.fn() },
  mockSettingsStore: { fetchSettings: vi.fn() },
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: mockAppInfoStore }))
vi.mock('@/store/projectModelSettings', () => ({ projectModelSettingsStore: mockSettingsStore }))
vi.mock('@/utils/toaster', () => ({ default: { success: vi.fn(), error: vi.fn() } }))

// The table has its own tests; each model becomes a toggle showing its tri-state.
vi.mock('../ModelConfigurationTable', () => ({
  ModelSelectionState: { Checked: 'checked', Unchecked: 'unchecked', Mixed: 'mixed' },
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

const renderModal = async (
  users: UserListItem[],
  settings: ProjectModelSettings,
  props: {
    onApply?: (
      overrides: ModelOverrideMap,
      defaultModel: string | undefined,
      hasCustomDefault: boolean,
      projectAvailability: Record<string, boolean>
    ) => Promise<void>
    projectOverrides?: ModelOverrideMap
    projectOverridesByUser?: Record<string, ModelOverrideMap>
    defaultModel?: string
    defaultModelsByUser?: Record<string, string>
  } = {}
) => {
  mockSettingsStore.fetchSettings.mockResolvedValue(settings)
  render(
    <ProjectMemberModelOverrideModal
      isOpen
      users={users}
      projectName="team"
      onClose={vi.fn()}
      onApply={props.onApply ?? vi.fn()}
      projectOverrides={props.projectOverrides}
      projectOverridesByUser={props.projectOverridesByUser}
      defaultModel={props.defaultModel}
      defaultModelsByUser={props.defaultModelsByUser}
    />
  )
  await screen.findByRole('button', { name: /model-a:/ })
}

describe('ProjectMemberModelOverrideModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAppInfoStore.getLLMModels.mockResolvedValue(CATALOG)
  })

  afterEach(cleanup)

  // The override is per-user and independent of the project's own model allow/deny-list
  // configuration (EPMCDME-15082 AC3/AC4): it must offer every platform-enabled, non-router
  // model, not just the subset the project currently makes available.
  it('offers every platform-enabled model regardless of the project allow/deny-list', async () => {
    await renderModal([user('u1')], {
      ...DEFAULT_PROJECT_MODEL_SETTINGS,
      mode: 'deny_list',
      models: ['model-c'],
    })

    expect(screen.getByRole('button', { name: /model-c:/ })).toBeInTheDocument()
  })

  it('keeps a model the user was already granted outside the project set selectable and toggleable', async () => {
    const onApply = vi.fn()
    await renderModal(
      [user('u1')],
      { ...DEFAULT_PROJECT_MODEL_SETTINGS, mode: 'deny_list', models: ['model-c'] },
      { onApply, projectOverrides: { 'model-c': 'enabled' } }
    )

    const modelCButton = screen.getByRole('button', { name: 'model-c:checked' })
    expect(modelCButton).toBeInTheDocument()

    fireEvent.click(modelCButton)
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        { 'model-a': 'project', 'model-b': 'project', 'model-c': 'disabled' },
        'model-a',
        false,
        { 'model-a': true, 'model-b': true, 'model-c': false }
      )
    )
  })

  it('calls onApply with the disabled model when a model is turned off', async () => {
    const onApply = vi.fn()
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS, { onApply })

    fireEvent.click(screen.getByRole('button', { name: 'model-b:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        { 'model-a': 'project', 'model-b': 'disabled', 'model-c': 'project' },
        'model-a',
        false,
        { 'model-a': true, 'model-b': true, 'model-c': true }
      )
    )
  })

  it('keeps the stored custom default of a single user through a re-save instead of reverting to the project default', async () => {
    const onApply = vi.fn()
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS, {
      onApply,
      projectOverrides: { 'model-c': 'enabled' },
      defaultModel: 'model-b',
    })

    fireEvent.click(screen.getByRole('button', { name: 'model-c:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() => expect(onApply).toHaveBeenCalled())
    const [, defaultModel, hasCustomDefault] = onApply.mock.calls[0]
    expect(defaultModel).toBe('model-b')
    expect(hasCustomDefault).toBe(true)
  })

  it('reports no custom default when the single-user default prop is not supplied', async () => {
    const onApply = vi.fn()
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS, {
      onApply,
      projectOverrides: { 'model-c': 'enabled' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'model-c:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() => expect(onApply).toHaveBeenCalled())
    const [, defaultModel, hasCustomDefault] = onApply.mock.calls[0]
    expect(defaultModel).toBe('model-a')
    expect(hasCustomDefault).toBe(false)
  })

  it('shows a model as checked in a bulk edit only when every selected user has it, using project models for a user without override', async () => {
    await renderModal([user('u1'), user('u2')], DEFAULT_PROJECT_MODEL_SETTINGS, {
      projectOverridesByUser: {
        u1: { 'model-a': 'enabled', 'model-b': 'disabled', 'model-c': 'disabled' },
      },
    })

    expect(screen.getByRole('button', { name: 'model-a:checked' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-b:mixed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-c:mixed' })).toBeInTheDocument()
  })

  it('shows mixed for a model only some selected users have and unchecked when none has it', async () => {
    await renderModal([user('u1'), user('u2')], DEFAULT_PROJECT_MODEL_SETTINGS, {
      projectOverridesByUser: {
        u1: { 'model-a': 'enabled', 'model-b': 'disabled', 'model-c': 'disabled' },
        u2: { 'model-a': 'disabled', 'model-b': 'enabled', 'model-c': 'disabled' },
      },
    })

    expect(screen.getByRole('button', { name: 'model-a:mixed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-b:mixed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-c:unchecked' })).toBeInTheDocument()
  })

  it('shows every model checked in a bulk edit when no selected user has an override', async () => {
    await renderModal([user('u1'), user('u2')], DEFAULT_PROJECT_MODEL_SETTINGS)

    expect(screen.getByRole('button', { name: 'model-a:checked' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-b:checked' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-c:checked' })).toBeInTheDocument()
  })

  it('enables Apply in a bulk edit without changes and keeps mixed models enabled (union)', async () => {
    const onApply = vi.fn()
    await renderModal([user('u1'), user('u2')], DEFAULT_PROJECT_MODEL_SETTINGS, {
      onApply,
      projectOverridesByUser: {
        u1: { 'model-a': 'enabled', 'model-b': 'disabled', 'model-c': 'disabled' },
        u2: { 'model-a': 'disabled', 'model-b': 'enabled', 'model-c': 'disabled' },
      },
      defaultModelsByUser: { u1: 'model-a', u2: 'model-a' },
    })

    const apply = screen.getByRole('button', { name: 'Apply changes' })
    expect(apply).not.toBeDisabled()
    fireEvent.click(apply)

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        { 'model-a': 'enabled', 'model-b': 'enabled', 'model-c': 'disabled' },
        'model-a',
        false,
        { 'model-a': true, 'model-b': true, 'model-c': true }
      )
    )
  })

  it('turns a mixed model into a regular checked or unchecked one after it is clicked', async () => {
    const onApply = vi.fn()
    await renderModal([user('u1'), user('u2')], DEFAULT_PROJECT_MODEL_SETTINGS, {
      onApply,
      projectOverridesByUser: {
        u1: { 'model-a': 'enabled', 'model-b': 'disabled', 'model-c': 'disabled' },
        u2: { 'model-a': 'enabled', 'model-b': 'enabled', 'model-c': 'disabled' },
      },
    })

    fireEvent.click(screen.getByRole('button', { name: 'model-b:mixed' }))
    expect(screen.getByRole('button', { name: 'model-b:checked' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'model-b:checked' }))
    expect(screen.getByRole('button', { name: 'model-b:unchecked' })).toBeInTheDocument()
  })

  it('clears mixed states on reset to project settings', async () => {
    await renderModal([user('u1'), user('u2')], DEFAULT_PROJECT_MODEL_SETTINGS, {
      projectOverridesByUser: {
        u1: { 'model-a': 'enabled', 'model-b': 'disabled', 'model-c': 'disabled' },
      },
    })

    expect(screen.getByRole('button', { name: 'model-b:mixed' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset to project settings' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset to project settings' }).pop()!)

    expect(screen.getByRole('button', { name: 'model-b:checked' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /:mixed/ })).not.toBeInTheDocument()
  })

  it('blocks Apply in a bulk edit until a default is chosen when the users have different defaults', async () => {
    await renderModal([user('u1'), user('u2')], DEFAULT_PROJECT_MODEL_SETTINGS, {
      defaultModelsByUser: { u1: 'model-b' },
    })

    fireEvent.click(screen.getByRole('button', { name: 'model-c:checked' }))

    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Choose a default model')
  })

  it('moves the default to an enabled model when the default model is disabled', async () => {
    const onApply = vi.fn()
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS, { onApply })

    fireEvent.click(screen.getByRole('button', { name: 'model-a:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        { 'model-a': 'disabled', 'model-b': 'project', 'model-c': 'project' },
        'model-b',
        true,
        { 'model-a': true, 'model-b': true, 'model-c': true }
      )
    )
  })

  it('resets to the project selection while keeping every platform model listed', async () => {
    const onApply = vi.fn()
    await renderModal(
      [user('u1')],
      { ...DEFAULT_PROJECT_MODEL_SETTINGS, mode: 'allow_list', models: ['model-a'] },
      { onApply, projectOverrides: { 'model-a': 'disabled', 'model-b': 'enabled' } }
    )

    expect(screen.getByRole('button', { name: 'model-a:unchecked' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-b:checked' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Reset to project settings' }))
    fireEvent.click(screen.getAllByRole('button', { name: 'Reset to project settings' }).pop()!)

    expect(screen.getByRole('button', { name: 'model-a:checked' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-b:unchecked' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'model-c:unchecked' })).toBeInTheDocument()
  })

  it('explains why Apply is disabled when every model is turned off', async () => {
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS)

    fireEvent.click(screen.getByRole('button', { name: 'model-a:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-b:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-c:checked' }))

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Select at least one model available on the web'
    )
    expect(screen.getByRole('button', { name: 'Apply changes' })).toBeDisabled()
  })

  it('makes the one re-enabled model the default after everything was turned off', async () => {
    const onApply = vi.fn()
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS, { onApply })

    fireEvent.click(screen.getByRole('button', { name: 'model-a:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-b:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-c:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-c:unchecked' }))
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }))

    await waitFor(() =>
      expect(onApply).toHaveBeenCalledWith(
        { 'model-a': 'disabled', 'model-b': 'disabled', 'model-c': 'enabled' },
        'model-c',
        true,
        { 'model-a': true, 'model-b': true, 'model-c': true }
      )
    )
  })

  // CR-008 — Apply/Reset must be disabled while an async onApply is in flight, so a
  // double-click cannot fire duplicate persistence calls.
  it('disables Apply and Reset while onApply is pending, and re-enables after it settles', async () => {
    let resolveApply: () => void = () => {}
    const onApply = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveApply = resolve
        })
    )
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS, { onApply })

    fireEvent.click(screen.getByRole('button', { name: 'model-b:checked' }))
    const applyButton = screen.getByRole('button', { name: 'Apply changes' })
    fireEvent.click(applyButton)
    fireEvent.click(applyButton)

    await waitFor(() => expect(applyButton).toBeDisabled())
    expect(onApply).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Reset to project settings' })).toBeDisabled()

    resolveApply()
    await waitFor(() => expect(applyButton).not.toBeDisabled())
  })

  it('returns to no alert when the only change is undone', async () => {
    await renderModal([user('u1')], DEFAULT_PROJECT_MODEL_SETTINGS)

    fireEvent.click(screen.getByRole('button', { name: 'model-a:checked' }))
    fireEvent.click(screen.getByRole('button', { name: 'model-a:unchecked' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
