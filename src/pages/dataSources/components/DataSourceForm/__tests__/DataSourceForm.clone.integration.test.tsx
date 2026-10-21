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

import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MASKED_VALUE } from '@/constants/settings'
import { UnsavedChangesProvider } from '@/hooks/useUnsavedChangesWarning'
import { dataSourceStore } from '@/store/dataSources'
import { userStore } from '@/store/user'
import { mockAPI } from '@/test-utils/integration'
import { DataSourceDetailsResponse } from '@/types/entity/dataSource'

import DataSourceForm, { DataSourceFormRef } from '../DataSourceForm'

vi.mock('@/utils/toaster', () => ({
  default: { error: vi.fn(), info: vi.fn(), success: vi.fn() },
}))

const providerSchema = {
  id: 'prov-1',
  provider_name: 'acme',
  name: 'Acme',
  toolkit_id: 'tk-1',
  base_schema: {
    description: '',
    parameters: [
      { name: 'api_key', parameter_type: 'Secret', required: true, enum: null },
      { name: 'endpoint', parameter_type: 'String', required: true, enum: null },
    ],
  },
  create_schema: { description: '', parameters: [] },
}

const baseSource = {
  id: 'src-1',
  repo_name: 'original-source',
  project_name: 'proj-a',
  description: 'Original description',
  project_space_visible: true,
  guardrail_assignments: [],
  user_abilities: ['read'],
} as unknown as DataSourceDetailsResponse

const gitSource = {
  ...baseSource,
  index_type: 'code',
  link: 'https://github.com/org/repo',
  branch: 'main',
} as DataSourceDetailsResponse

const providerSource = {
  ...baseSource,
  index_type: 'provider',
  provider_fields: {
    provider_id: 'prov-1',
    base_params: { api_key: 'c2VjcmV0', endpoint: 'https://acme.io' },
    create_params: {},
  },
} as unknown as DataSourceDetailsResponse

const fileSource = {
  ...baseSource,
  index_type: 'knowledge_base_file',
  uploaded_files: ['a.txt'],
} as DataSourceDetailsResponse

const renderClone = (cloneFrom: DataSourceDetailsResponse) => {
  const ref = createRef<DataSourceFormRef>()
  const router = createMemoryRouter(
    [
      {
        path: '/',
        element: (
          <UnsavedChangesProvider>
            <DataSourceForm cloneFrom={cloneFrom} onClose={vi.fn()} ref={ref} />
          </UnsavedChangesProvider>
        ),
      },
    ],
    { initialEntries: ['/'] }
  )
  render(<RouterProvider router={router} />)
  return ref
}

const waitForForm = () =>
  waitFor(() => expect(screen.getByRole('textbox', { name: 'Name' })).toBeInTheDocument(), {
    timeout: 10000,
  })

describe('DataSourceForm clone mode', () => {
  let createGit: ReturnType<typeof vi.spyOn>
  let createProvider: ReturnType<typeof vi.spyOn>
  let updateGit: ReturnType<typeof vi.spyOn>
  let updateProvider: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    userStore.user = {
      userId: 'u1',
      isAdmin: false,
      applications: ['proj-a'],
    } as unknown as typeof userStore.user
    mockAPI('GET', 'v1/providers/datasource_schemas', [providerSchema])
    vi.spyOn(dataSourceStore, 'healthCheckDatasource').mockResolvedValue({
      implemented: false,
    } as never)
    createGit = vi
      .spyOn(dataSourceStore, 'createApplicationGitIndex')
      .mockResolvedValue({} as never)
    createProvider = vi.spyOn(dataSourceStore, 'createProviderIndex').mockResolvedValue({} as never)
    updateGit = vi.spyOn(dataSourceStore, 'updateApplicationIndex').mockResolvedValue({} as never)
    updateProvider = vi.spyOn(dataSourceStore, 'updateProviderIndex').mockResolvedValue({} as never)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders create mode: empty enabled name, type selector visible', async () => {
    renderClone(gitSource)
    await waitForForm()

    const name = screen.getByRole('textbox', { name: 'Name' })
    expect(name).toBeEnabled()
    expect(name).toHaveValue('')
    expect(screen.getByText('Datasource Type')).toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Description' })).toHaveValue('Original description')
  })

  it('submits through the create path, never an update', async () => {
    const user = userEvent.setup()
    const ref = renderClone(gitSource)
    await waitForForm()

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'cloned-source')
    await act(async () => {
      await ref.current?.submit()
    })

    await waitFor(() => expect(createGit).toHaveBeenCalledTimes(1))
    const [project, request] = createGit.mock.calls[0] as [string, Record<string, unknown>]
    expect(project).toBe('proj-a')
    expect(request).toMatchObject({ name: 'cloned-source', link: 'https://github.com/org/repo' })
    expect(updateGit).not.toHaveBeenCalled()
  })

  it('blocks provider submit while the secret is blank and never sends the masked value', async () => {
    const user = userEvent.setup()
    const ref = renderClone(providerSource)
    await waitForForm()
    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'cloned-provider')

    await waitFor(() => expect(screen.getByDisplayValue('https://acme.io')).toBeInTheDocument())
    expect(screen.queryByDisplayValue(MASKED_VALUE)).not.toBeInTheDocument()

    await act(async () => {
      await ref.current?.submit()
    })
    expect(createProvider).not.toHaveBeenCalled()

    const secret = document.getElementById('api_key') as HTMLInputElement
    await user.type(secret, 'new-secret')
    await act(async () => {
      await ref.current?.submit()
    })

    await waitFor(() => expect(createProvider).toHaveBeenCalledTimes(1))
    const payload = createProvider.mock.calls[0][2] as Record<string, unknown>
    expect(payload.api_key).toBe('new-secret')
    expect(JSON.stringify(payload)).not.toContain(MASKED_VALUE)
    expect(updateProvider).not.toHaveBeenCalled()
  })

  it('fails validation for a file clone without files', async () => {
    const ref = renderClone(fileSource)
    await waitForForm()
    await userEvent.setup().type(screen.getByRole('textbox', { name: 'Name' }), 'cloned-files')

    await act(async () => {
      await ref.current?.submit()
    })

    expect(await screen.findByText('At least one file is required')).toBeInTheDocument()
    expect(createGit).not.toHaveBeenCalled()
  })

  it('does not prompt on leave when untouched, prompts after editing the name', async () => {
    const user = userEvent.setup()
    const ref = renderClone(gitSource)
    await waitForForm()

    const untouched = vi.fn()
    act(() => ref.current?.attemptFormClose?.(untouched))
    expect(untouched).toHaveBeenCalledTimes(1)

    await user.type(screen.getByRole('textbox', { name: 'Name' }), 'cloned-source')
    const edited = vi.fn()
    act(() => ref.current?.attemptFormClose?.(edited))
    expect(edited).not.toHaveBeenCalled()
  })

  it('does not prompt on leave for an untouched provider clone', async () => {
    const ref = renderClone(providerSource)
    await waitForForm()
    await waitFor(() => expect(screen.getByDisplayValue('https://acme.io')).toBeInTheDocument())

    const untouched = vi.fn()
    act(() => ref.current?.attemptFormClose?.(untouched))
    expect(untouched).toHaveBeenCalledTimes(1)
  })
})
