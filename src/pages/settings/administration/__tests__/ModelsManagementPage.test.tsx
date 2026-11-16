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

import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, it, expect, vi } from 'vitest'

import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { adminModelsStore } from '@/store/adminModels'
import { appInfoStore } from '@/store/appInfo'
import { selectMultiSelectOptions } from '@/test-utils/component-interactions'
import { AdminGlobalDefaultResponse, AdminModel } from '@/types/entity/adminModel'
import toaster from '@/utils/toaster'

import ModelsManagementPage from '../ModelsManagementPage'

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

afterEach(cleanup)

const fixtures: AdminModel[] = [
  {
    modelType: 'chat',
    base_name: 'gpt-4',
    label: 'GPT-4',
    provider: 'azure_openai',
    enabled: true,
    status: 'enabled',
  },
  {
    modelType: 'chat',
    base_name: 'claude-3',
    label: 'Claude 3',
    provider: 'anthropic',
    enabled: true,
    status: 'disabled',
  },
  {
    modelType: 'chat',
    base_name: 'gemini',
    label: 'Gemini Pro',
    provider: 'google_vertexai',
    enabled: true,
    status: 'deprecated',
  },
  {
    modelType: 'chat',
    base_name: 'sy-router',
    label: 'Switchyard Router',
    enabled: true,
    status: 'enabled',
    routerType: 'switchyard',
  },
  {
    modelType: 'chat',
    base_name: 'auto',
    label: 'Auto Router',
    enabled: true,
    status: 'enabled',
    routerType: 'litellm_auto',
  },
]

const defaultResponse = (
  effective: string | null,
  saved = effective
): AdminGlobalDefaultResponse => ({
  saved_base_name: saved,
  effective_base_name: effective,
  source: saved === effective ? 'admin' : 'configured',
  temporary_fallback: saved !== effective,
  updated_by_id: null,
  updated_by_name: null,
  updated_at: null,
})

let writes: string[]

beforeEach(() => {
  vi.clearAllMocks()
  writes = []
  appInfoStore.getLLMModels = vi.fn().mockResolvedValue([])
  appInfoStore.projectLlmModels = {}
  adminModelsStore.models = fixtures.map((model) => ({ ...model }))
  adminModelsStore.loading = false
  adminModelsStore.defaultLoading = false
  adminModelsStore.defaultError = null
  adminModelsStore.globalDefault = defaultResponse('gpt-4')
  adminModelsStore.indexModels = vi.fn(async () => [...adminModelsStore.models])
  adminModelsStore.fetchGlobalDefault = vi.fn(async () => ({ ...adminModelsStore.globalDefault! }))
  adminModelsStore.setModelStatus = vi.fn()
  adminModelsStore.clearGlobalDefault = vi.fn()
  adminModelsStore.setGlobalDefault = vi.fn(async (baseName) => {
    writes.push(`default:${baseName}`)
    adminModelsStore.globalDefault = defaultResponse(baseName)
  })
  adminModelsStore.bulkSetModelStatus = vi.fn(async (names, status) => {
    writes.push(`${status}:${names.join(',')}`)
    for (const model of adminModelsStore.models) {
      if (names.includes(model.base_name)) model.status = status
    }
    return {
      total: names.length,
      succeeded: names.length,
      failed: 0,
      results: names.map((base_name) => ({ base_name, status, success: true, error: null })),
    }
  })
})

const renderPage = async () => {
  await act(async () => {
    render(
      <UnsavedChangesProvider>
        <ModelsManagementPage />
      </UnsavedChangesProvider>
    )
  })
}
const applyButton = () => screen.getByRole('button', { name: 'Apply changes' })
const modelTable = () => within(screen.getByRole('table'))
const row = (label: string) => modelTable().getByText(label).closest('tr')!
const defaultValue = () =>
  document.getElementById('global-default-model')?.querySelector('.p-dropdown-label')?.textContent
const statusValue = (baseName: string) =>
  document.getElementById(`model-status-${baseName}`)?.querySelector('.p-dropdown-label')
    ?.textContent

const choose = async (id: string, label: string) => {
  fireEvent.click(document.getElementById(id)!)
  const option = Array.from(document.querySelectorAll('.p-dropdown-panel li')).find(
    (item) => item.getAttribute('aria-label') === label
  )
  expect(option).toBeDefined()
  fireEvent.click(option!)
  await waitFor(() => expect(document.querySelector('.p-dropdown-panel')).toBeNull())
}
const changeStatus = (baseName: string, label: string) => choose(`model-status-${baseName}`, label)
const bulkChange = (label: string) => {
  fireEvent.click(screen.getByRole('button', { name: /Bulk Actions/ }))
  const item = screen.getByRole('menuitem', { name: label, hidden: true })
  fireEvent.click(item.querySelector('a')!)
}

describe('ModelsManagementPage draft settings', () => {
  it('loads the catalog and default without making writes', async () => {
    await renderPage()
    expect(adminModelsStore.indexModels).toHaveBeenCalledOnce()
    expect(adminModelsStore.fetchGlobalDefault).toHaveBeenCalledOnce()
    expect(applyButton()).toBeDisabled()
    expect(writes).toEqual([])
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
    expect(screen.queryAllByLabelText('Unsaved change')).toHaveLength(0)
    expect(modelTable().getByText('GPT-4')).toBeInTheDocument()
    expect(modelTable().getByText('Azure OpenAI')).toBeInTheDocument()
    expect(modelTable().getByText('gpt-4')).toBeInTheDocument()
  })

  it('displays each of the three statuses', async () => {
    await renderPage()
    expect(statusValue('gpt-4')).toBe('Enabled')
    expect(statusValue('claude-3')).toBe('Disabled')
    expect(statusValue('gemini')).toBe('Deprecated')
  })

  it('manages embedding statuses without offering them as a chat default', async () => {
    adminModelsStore.models.unshift({
      base_name: 'embedding',
      label: 'Embedding Model',
      modelType: 'embedding',
      enabled: true,
      status: 'enabled',
    })
    await renderPage()
    expect(within(row('Embedding Model')).getByText('Embedding')).toBeInTheDocument()
    fireEvent.click(document.getElementById('global-default-model')!)
    expect(screen.queryByRole('option', { name: 'Embedding Model' })).not.toBeInTheDocument()
    fireEvent.click(document.getElementById('global-default-model')!)
    await changeStatus('embedding', 'Deprecated')
    expect(defaultValue()).toBe('GPT-4')
    expect(writes).toEqual([])
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(adminModelsStore.bulkSetModelStatus).toHaveBeenCalledWith(['embedding'], 'deprecated')
  })

  it('can manage embeddings when the platform has no available chat models', async () => {
    adminModelsStore.models = [
      {
        base_name: 'embedding',
        label: 'Embedding Model',
        modelType: 'embedding',
        enabled: true,
        status: 'enabled',
      },
    ]
    adminModelsStore.globalDefault = defaultResponse(null)
    await renderPage()
    await changeStatus('embedding', 'Disabled')
    expect(applyButton()).toBeEnabled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(writes).toEqual(['disabled:embedding'])
    expect(adminModelsStore.setGlobalDefault).not.toHaveBeenCalled()
  })

  it.each([
    ['disabled', 'disabled'],
    ['deprecated', 'deprecated'],
    ['disabled', 'deprecated'],
  ] as const)(
    'saves embedding changes when existing chat models are %s and %s',
    async (firstStatus, secondStatus) => {
      adminModelsStore.models = [
        { ...fixtures[0], status: firstStatus },
        { ...fixtures[1], status: secondStatus },
        fixtures[3], // Read-only Switchyard routers cannot serve as the global default.
        {
          base_name: 'embedding',
          label: 'Embedding Model',
          modelType: 'embedding',
          enabled: true,
          status: 'enabled',
        },
      ]
      adminModelsStore.globalDefault = defaultResponse(null)
      await renderPage()
      await changeStatus('embedding', 'Deprecated')

      expect(applyButton()).toBeEnabled()
      expect(screen.queryByRole('alert')).not.toBeInTheDocument()
      expect(writes).toEqual([])
      fireEvent.click(applyButton())
      await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
      expect(writes).toEqual(['deprecated:embedding'])
      expect(adminModelsStore.setGlobalDefault).not.toHaveBeenCalled()
      expect(applyButton()).toBeDisabled()
    }
  )

  it('restores chat availability without pinning a manual default in automatic mode', async () => {
    adminModelsStore.models = [{ ...fixtures[0], status: 'disabled' }]
    adminModelsStore.globalDefault = defaultResponse(null)
    vi.mocked(adminModelsStore.fetchGlobalDefault)
      .mockResolvedValueOnce(defaultResponse(null))
      .mockResolvedValue(defaultResponse('gpt-4', null))
    await renderPage()

    await changeStatus('gpt-4', 'Enabled')
    expect(defaultValue()).toBe('Use configured default')
    expect(applyButton()).toBeEnabled()
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(writes).toEqual(['enabled:gpt-4'])
    expect(adminModelsStore.setGlobalDefault).not.toHaveBeenCalled()
    expect(adminModelsStore.clearGlobalDefault).not.toHaveBeenCalled()
    expect(defaultValue()).toBe('Use configured default')
    expect(applyButton()).toBeDisabled()
  })

  it.each(['Disabled', 'Deprecated'])(
    'invalidates every cached project after applying %s',
    async (status) => {
      appInfoStore.projectLlmModels = {
        demo: [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }],
        another: [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }],
      }
      await renderPage()
      await changeStatus('gpt-4', status)
      expect(Object.keys(appInfoStore.projectLlmModels)).toEqual(['demo', 'another'])

      fireEvent.click(applyButton())
      await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
      expect(appInfoStore.projectLlmModels).toEqual({})
    }
  )

  it('invalidates project caches even if the admin catalog refresh fails after a write', async () => {
    appInfoStore.projectLlmModels = {
      demo: [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }],
    }
    await renderPage()
    vi.mocked(adminModelsStore.indexModels).mockRejectedValueOnce(new Error('Refresh failed'))
    await changeStatus('claude-3', 'Enabled')

    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Refresh failed'))
    expect(writes).toEqual(['enabled:claude-3'])
    expect(appInfoStore.projectLlmModels).toEqual({})
  })

  it('never picks an embedding as the replacement when the default is disabled', async () => {
    adminModelsStore.models.unshift({
      base_name: 'embedding',
      label: 'Embedding Model',
      modelType: 'embedding',
      enabled: true,
      status: 'enabled',
    })
    await renderPage()
    await changeStatus('gpt-4', 'Disabled')
    expect(defaultValue()).toBe('Auto Router')
    await changeStatus('auto', 'Disabled')
    await changeStatus('embedding', 'Deprecated')
    expect(applyButton()).toBeDisabled()
    expect(defaultValue()).not.toBe('Embedding Model')
    expect(writes).toEqual([])
  })

  it.each(['Enabled', 'Disabled', 'Deprecated'])(
    'stages %s without saving or opening a confirmation',
    async (label) => {
      await renderPage()
      const baseName = label === 'Disabled' ? 'gemini' : 'claude-3'
      await changeStatus(baseName, label)
      expect(statusValue(baseName)).toBe(label)
      expect(adminModelsStore.bulkSetModelStatus).not.toHaveBeenCalled()
      expect(adminModelsStore.setModelStatus).not.toHaveBeenCalled()
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
      expect(applyButton()).toBeEnabled()
    }
  )

  it('saves an enabled selection only after Apply', async () => {
    await renderPage()
    await changeStatus('claude-3', 'Enabled')
    expect(within(row('Claude 3')).getByLabelText('Unsaved change')).toHaveAttribute(
      'data-tooltip-content',
      'Unsaved change'
    )
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
    expect(adminModelsStore.models[1].status).toBe('disabled')
    expect(writes).toEqual([])
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(adminModelsStore.bulkSetModelStatus).toHaveBeenCalledWith(['claude-3'], 'enabled')
    expect(applyButton()).toBeDisabled()
    expect(adminModelsStore.indexModels).toHaveBeenCalledTimes(2)
    expect(screen.queryAllByLabelText('Unsaved change')).toHaveLength(0)
  })

  it('stages a new default until Apply', async () => {
    appInfoStore.projectLlmModels = {
      demo: [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }],
    }
    await renderPage()
    await choose('global-default-model', 'Auto Router')
    expect(defaultValue()).toBe('Auto Router')
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
    expect(screen.queryAllByLabelText('Unsaved change')).toHaveLength(0)
    expect(adminModelsStore.setGlobalDefault).not.toHaveBeenCalled()
    fireEvent.click(applyButton())
    await waitFor(() => expect(adminModelsStore.setGlobalDefault).toHaveBeenCalledWith('auto'))
    await waitFor(() => expect(applyButton()).toBeDisabled())
    expect(appInfoStore.projectLlmModels).toEqual({})
    expect(defaultValue()).toBe('Auto Router')
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
  })

  it.each(['Disabled', 'Deprecated'])(
    'selects a draft replacement when the default becomes %s',
    async (status) => {
      await renderPage()
      await changeStatus('gpt-4', status)
      expect(defaultValue()).toBe('Auto Router')
      expect(within(row('GPT-4')).getByLabelText('Unsaved change')).toBeInTheDocument()
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
      expect(toaster.info).toHaveBeenCalledWith(
        expect.stringContaining('Click Apply changes to save.')
      )
      expect(writes).toEqual([])
      fireEvent.click(applyButton())
      await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
      expect(writes).toEqual(['default:auto', `${status.toLowerCase()}:gpt-4`])
    }
  )

  it('enables a replacement, saves the new default, then applies both retiring statuses', async () => {
    await renderPage()
    await changeStatus('claude-3', 'Enabled')
    await choose('global-default-model', 'Claude 3')
    await changeStatus('gpt-4', 'Deprecated')
    await changeStatus('gemini', 'Disabled')
    expect(writes).toEqual([])
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(writes).toEqual([
      'enabled:claude-3',
      'default:claude-3',
      'disabled:gemini',
      'deprecated:gpt-4',
    ])
  })

  it('discards status and default edits without writing', async () => {
    const cached = { demo: [{ label: 'GPT-4', value: 'gpt-4', isDefault: true }] }
    appInfoStore.projectLlmModels = cached
    await renderPage()
    await changeStatus('gpt-4', 'Deprecated')
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
    expect(within(row('GPT-4')).getByLabelText('Unsaved change')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))
    expect(appInfoStore.projectLlmModels).toEqual(cached)
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
    expect(screen.queryAllByLabelText('Unsaved change')).toHaveLength(0)
    expect(statusValue('gpt-4')).toBe('Enabled')
    expect(defaultValue()).toBe('GPT-4')
    expect(applyButton()).toBeDisabled()
    expect(writes).toEqual([])
  })

  it('clears markers when status and default selections return to their saved values', async () => {
    await renderPage()
    await changeStatus('claude-3', 'Enabled')
    await choose('global-default-model', 'Claude 3')
    expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
    expect(within(row('Claude 3')).getByLabelText('Unsaved change')).toBeInTheDocument()
    await choose('global-default-model', 'GPT-4')
    await changeStatus('claude-3', 'Disabled')
    expect(screen.queryByText('Unsaved Changes')).not.toBeInTheDocument()
    expect(screen.queryAllByLabelText('Unsaved change')).toHaveLength(0)
    expect(applyButton()).toBeDisabled()
    expect(writes).toEqual([])
  })

  it('disables Apply if no enabled default remains', async () => {
    await renderPage()
    fireEvent.click(modelTable().getByText('GPT-4'))
    fireEvent.click(modelTable().getByText('Auto Router'))
    bulkChange('Disable')
    expect(applyButton()).toBeDisabled()
    expect(screen.getByRole('alert')).toHaveTextContent('Enable at least one available model')
    expect(writes).toEqual([])
  })

  it('keeps the draft and does not retire models if saving the replacement default fails', async () => {
    adminModelsStore.setGlobalDefault = vi
      .fn()
      .mockRejectedValue(new Error('Default update failed'))
    await renderPage()
    await changeStatus('gpt-4', 'Deprecated')
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Default update failed'))
    expect(adminModelsStore.bulkSetModelStatus).not.toHaveBeenCalled()
    expect(statusValue('gpt-4')).toBe('Deprecated')
    expect(applyButton()).toBeEnabled()
  })

  it.each(['button', 'dropdown'])(
    'stages a reset through the %s and clears the manual default only after Apply',
    async (control) => {
      vi.mocked(adminModelsStore.clearGlobalDefault).mockImplementation(async () => {
        adminModelsStore.globalDefault = defaultResponse('gpt-4', null)
      })
      await renderPage()

      if (control === 'button') {
        fireEvent.click(screen.getByRole('button', { name: 'Reset to configured default' }))
      } else {
        await choose('global-default-model', 'Use configured default')
      }
      expect(defaultValue()).toBe('Use configured default')
      expect(screen.getByText('Unsaved Changes')).toBeInTheDocument()
      expect(adminModelsStore.clearGlobalDefault).not.toHaveBeenCalled()
      expect(writes).toEqual([])

      fireEvent.click(applyButton())
      await waitFor(() => expect(adminModelsStore.clearGlobalDefault).toHaveBeenCalledOnce())
      await waitFor(() => expect(applyButton()).toBeDisabled())
      expect(adminModelsStore.setGlobalDefault).not.toHaveBeenCalled()
      expect(adminModelsStore.bulkSetModelStatus).not.toHaveBeenCalled()
      expect(defaultValue()).toBe('Use configured default')
    }
  )

  it('discards a reset without clearing the saved default or model statuses', async () => {
    await renderPage()
    await changeStatus('claude-3', 'Enabled')
    fireEvent.click(screen.getByRole('button', { name: 'Reset to configured default' }))
    fireEvent.click(screen.getByRole('button', { name: 'Discard changes' }))

    expect(defaultValue()).toBe('GPT-4')
    expect(statusValue('claude-3')).toBe('Disabled')
    expect(applyButton()).toBeDisabled()
    expect(adminModelsStore.clearGlobalDefault).not.toHaveBeenCalled()
    expect(writes).toEqual([])
  })

  it('saves an explicit default even when it matches the automatic effective model', async () => {
    adminModelsStore.globalDefault = defaultResponse('gpt-4', null)
    await renderPage()
    expect(defaultValue()).toBe('Use configured default')
    expect(screen.getByRole('button', { name: 'Reset to configured default' })).toBeDisabled()

    await choose('global-default-model', 'GPT-4')
    expect(applyButton()).toBeEnabled()
    fireEvent.click(applyButton())
    await waitFor(() => expect(adminModelsStore.setGlobalDefault).toHaveBeenCalledWith('gpt-4'))
    await waitFor(() => expect(applyButton()).toBeDisabled())
    expect(defaultValue()).toBe('GPT-4')
    expect(adminModelsStore.clearGlobalDefault).not.toHaveBeenCalled()
  })

  it('keeps a failed reset in the draft without retiring models', async () => {
    vi.mocked(adminModelsStore.clearGlobalDefault).mockRejectedValue(new Error('Reset failed'))
    await renderPage()
    await changeStatus('gpt-4', 'Deprecated')
    fireEvent.click(screen.getByRole('button', { name: 'Reset to configured default' }))
    fireEvent.click(applyButton())

    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Reset failed'))
    expect(defaultValue()).toBe('Use configured default')
    expect(statusValue('gpt-4')).toBe('Deprecated')
    expect(applyButton()).toBeEnabled()
    expect(adminModelsStore.bulkSetModelStatus).not.toHaveBeenCalled()
  })

  it('reports load failures and prevents applying cached data', async () => {
    adminModelsStore.indexModels = vi.fn().mockRejectedValue(new Error('Offline'))
    await renderPage()
    expect(screen.getByRole('alert')).toHaveTextContent('Unable to load global model settings')
    expect(applyButton()).toBeDisabled()
    expect(writes).toEqual([])
  })
})

describe('ModelsManagementPage default options', () => {
  it('shows the backend effective default even when it is not the first model', async () => {
    adminModelsStore.globalDefault = defaultResponse('auto')
    await renderPage()
    expect(defaultValue()).toBe('Auto Router')
    expect(writes).toEqual([])
  })

  it('shows the effective fallback for an unavailable saved model', async () => {
    adminModelsStore.globalDefault = defaultResponse('gpt-4', 'removed-model')
    await renderPage()
    expect(defaultValue()).toBe('GPT-4')
    expect(writes).toEqual([])
  })

  it('offers enabled plain models and LiteLLM routers without unavailable or Switchyard choices', async () => {
    await renderPage()
    fireEvent.click(document.getElementById('global-default-model')!)
    const options = Array.from(document.querySelectorAll('.p-dropdown-panel li')).map(
      (item) => item.textContent
    )
    expect(options).toEqual(['Use configured default', 'GPT-4', 'Auto Router'])
    expect(adminModelsStore.clearGlobalDefault).not.toHaveBeenCalled()
  })
})

describe('ModelsManagementPage bulk and filters', () => {
  it('blocks status dropdowns for multiple selections and restores single-model editing', async () => {
    await renderPage()
    fireEvent.click(modelTable().getByText('Claude 3'))
    fireEvent.click(modelTable().getByText('Gemini Pro'))
    expect(screen.getByText('2 selected')).toBeInTheDocument()

    for (const baseName of ['gpt-4', 'claude-3', 'gemini', 'auto']) {
      const selector = document.getElementById(`model-status-${baseName}`)!
      expect(selector).toHaveAttribute('data-p-disabled', 'true')
    }
    fireEvent.click(document.getElementById('model-status-gpt-4')!)
    expect(document.querySelector('.p-dropdown-panel')).toBeNull()
    expect(statusValue('claude-3')).toBe('Disabled')
    expect(statusValue('gemini')).toBe('Deprecated')
    expect(applyButton()).toBeDisabled()
    expect(writes).toEqual([])

    fireEvent.click(modelTable().getByText('GPT-4'))
    fireEvent.click(modelTable().getByText('Gemini Pro'))
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    await changeStatus('claude-3', 'Enabled')
    expect(statusValue('claude-3')).toBe('Enabled')
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(adminModelsStore.bulkSetModelStatus).toHaveBeenCalledWith(['claude-3'], 'enabled')
  })

  it('stages bulk changes and saves only models whose status changed', async () => {
    await renderPage()
    fireEvent.click(modelTable().getByText('Claude 3'))
    fireEvent.click(modelTable().getByText('Gemini Pro'))
    expect(screen.getByText('2 selected')).toBeInTheDocument()
    bulkChange('Enable')
    expect(statusValue('claude-3')).toBe('Enabled')
    expect(statusValue('gemini')).toBe('Enabled')
    expect(writes).toEqual([])
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(adminModelsStore.bulkSetModelStatus).toHaveBeenCalledWith(
      ['claude-3', 'gemini'],
      'enabled'
    )
  })

  it('keeps remaining changes after a partial failure and retries only failed models', async () => {
    appInfoStore.projectLlmModels = {
      demo: [{ label: 'Claude 3', value: 'claude-3', isDefault: false }],
    }
    vi.mocked(adminModelsStore.bulkSetModelStatus).mockImplementationOnce(
      async (_names, status) => {
        adminModelsStore.models[1].status = status
        return {
          total: 2,
          succeeded: 1,
          failed: 1,
          results: [
            { base_name: 'claude-3', status, success: true, error: null },
            { base_name: 'gemini', status, success: false, error: 'failed' },
          ],
        }
      }
    )
    await renderPage()
    fireEvent.click(modelTable().getByText('Claude 3'))
    fireEvent.click(modelTable().getByText('Gemini Pro'))
    bulkChange('Enable')
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.error).toHaveBeenCalledWith('Failed to update: Gemini Pro.'))
    expect(appInfoStore.projectLlmModels).toEqual({})
    expect(statusValue('gemini')).toBe('Enabled')
    expect(within(row('Claude 3')).queryByLabelText('Unsaved change')).not.toBeInTheDocument()
    expect(within(row('Gemini Pro')).getByLabelText('Unsaved change')).toBeInTheDocument()
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(vi.mocked(adminModelsStore.bulkSetModelStatus).mock.calls[1]).toEqual([
      ['gemini'],
      'enabled',
    ])
    expect(applyButton()).toBeDisabled()
  })

  it('renders Switchyard status read-only and excludes its row from selection', async () => {
    await renderPage()
    const router = within(row('Switchyard Router'))
    expect(router.getByRole('checkbox')).toBeDisabled()
    expect(router.getByText('Enabled')).toBeInTheDocument()
    expect(document.getElementById('model-status-sy-router')).toBeNull()
    fireEvent.click(router.getByText('Switchyard Router'))
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
    expect(writes).toEqual([])
  })

  it('excludes Switchyard routers from Select all and the saved bulk payload', async () => {
    await renderPage()
    fireEvent.click(modelTable().getAllByRole('checkbox')[0])
    expect(screen.getByText('4 selected')).toBeInTheDocument()
    bulkChange('Enable')
    fireEvent.click(applyButton())
    await waitFor(() => expect(toaster.info).toHaveBeenCalledWith('Model settings updated'))
    expect(adminModelsStore.bulkSetModelStatus).toHaveBeenCalledWith(
      ['claude-3', 'gemini'],
      'enabled'
    )
    expect(adminModelsStore.models.find((model) => model.base_name === 'sy-router')?.status).toBe(
      'enabled'
    )
  })

  it('filters by multiple statuses and clears them without changing settings', async () => {
    await renderPage()
    await selectMultiSelectOptions('Status', ['Enabled', 'Deprecated'])
    expect(modelTable().getByText('GPT-4')).toBeInTheDocument()
    expect(modelTable().getByText('Gemini Pro')).toBeInTheDocument()
    expect(modelTable().queryByText('Claude 3')).not.toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Show deprecated' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Clear All/ }))
    expect(modelTable().getByText('Claude 3')).toBeInTheDocument()
    expect(applyButton()).toBeDisabled()
    expect(writes).toEqual([])
  })

  it('drops selected rows hidden by search', async () => {
    await renderPage()
    fireEvent.click(modelTable().getByText('GPT-4'))
    expect(screen.getByText('1 selected')).toBeInTheDocument()
    fireEvent.change(screen.getByPlaceholderText('Search models'), { target: { value: 'claude' } })
    expect(screen.queryByText('1 selected')).not.toBeInTheDocument()
  })
})
