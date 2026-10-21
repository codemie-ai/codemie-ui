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

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { forwardRef, useImperativeHandle } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { DATASOURCE_DETAILS, DATASOURCES } from '@/constants/routes'
import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { dataSourceStore } from '@/store/dataSources'
import { userStore } from '@/store/user'
import { navigateBack } from '@/utils/helpers'

import DataSourceCreatePage from '../DataSourceCreatePage'

vi.mock('@/store/dataSources', () => ({
  dataSourceStore: {
    indexProviderSchemas: [] as { id: string }[],
    getIndexDetails: vi.fn(),
    getProviderIndexSchemas: vi.fn(),
  },
}))

vi.mock('@/store/user', async () => {
  const { proxy } = await import('valtio')
  return { userStore: proxy({ user: null }) }
})

const submitSpy = vi.fn()

vi.mock('@/utils/helpers', () => ({ navigateBack: vi.fn() }))

vi.mock('@/components/Layouts/Layout', () => ({
  default: ({ children, title, rightContent, onBack }: any) => (
    <div>
      <h1>{title}</h1>
      <button onClick={onBack}>back</button>
      {rightContent}
      {children}
    </div>
  ),
}))
vi.mock('@/components/Sidebar', () => ({ default: () => null }))
vi.mock('@/components/Spinner', () => ({ default: () => <div>loading-spinner</div> }))

vi.mock('../components/DataSourceForm/DataSourceForm', () => ({
  default: forwardRef(({ cloneFrom, index, onReadyChange }: any, ref) => {
    useImperativeHandle(ref, () => ({ submit: submitSpy }))
    return (
      <div data-testid="form" data-clone-id={cloneFrom?.id} data-has-index={String(!!index)}>
        clone form <button onClick={() => onReadyChange?.(true)}>make-ready</button>
      </div>
    )
  }),
}))

const getDetails = dataSourceStore.getIndexDetails as ReturnType<typeof vi.fn>
const getSchemas = dataSourceStore.getProviderIndexSchemas as ReturnType<typeof vi.fn>

const gitSource = { id: 'src-1', repo_name: 'orig', index_type: 'code', project_name: 'proj-a' }

const setUser = (user: Record<string, unknown>) => {
  ;(userStore as { user: unknown }).user = user
}

describe('DataSourceCreatePage in clone mode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRouterState.currentRoute.value.params = { id: 'src-1' }
    dataSourceStore.indexProviderSchemas = []
    getSchemas.mockResolvedValue(undefined)
    setUser({ isAdmin: false, applications: ['proj-a'] })
  })

  it('keeps loading until the user arrives, then renders the form instead of a no-project block', async () => {
    ;(userStore as { user: unknown }).user = null
    getDetails.mockResolvedValue(gitSource)
    const { rerender } = render(<DataSourceCreatePage />)

    await waitFor(() => expect(getDetails).toHaveBeenCalled())
    expect(screen.getByText('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByText(/access to at least one project/)).not.toBeInTheDocument()

    // Unit setup stubs useSnapshot to return the store, so a rerender stands in for the update.
    setUser({ isAdmin: false, applications: ['proj-a'] })
    rerender(<DataSourceCreatePage />)
    expect(await screen.findByTestId('form')).toBeInTheDocument()
  })

  it('gates Save on form readiness, submits once on click, and Cancel navigates back', async () => {
    getDetails.mockResolvedValue(gitSource)
    render(<DataSourceCreatePage />)
    await screen.findByTestId('form')

    const save = screen.getByRole('button', { name: 'Save' })
    expect(save).toBeDisabled()
    fireEvent.click(screen.getByText('make-ready'))
    expect(save).toBeEnabled()

    fireEvent.click(save)
    expect(submitSpy).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(navigateBack).toHaveBeenCalledWith(DATASOURCE_DETAILS, DATASOURCES)
  })

  it('disables Save when the clone is blocked', async () => {
    getDetails.mockResolvedValue({ ...gitSource, index_type: 'bedrock_kb' })
    render(<DataSourceCreatePage />)
    await screen.findByText(/not supported for Bedrock/)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('shows a loading state while the source is fetched', () => {
    getDetails.mockReturnValue(new Promise<never>(() => {}))
    render(<DataSourceCreatePage />)
    expect(screen.getByText('loading-spinner')).toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('fetches by route id and renders the form with cloneFrom and no index', async () => {
    getDetails.mockResolvedValue(gitSource)
    render(<DataSourceCreatePage />)

    const form = await screen.findByTestId('form')
    expect(getDetails).toHaveBeenCalledWith('src-1')
    expect(form).toHaveAttribute('data-clone-id', 'src-1')
    expect(form).toHaveAttribute('data-has-index', 'false')
    expect(screen.getByRole('heading', { name: 'Clone Data Source' })).toBeInTheDocument()
  })

  it('shows not found and no form when the fetch rejects', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    getDetails.mockRejectedValue(new Error('403'))
    render(<DataSourceCreatePage />)

    expect(await screen.findByText('Data source not found')).toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('shows not found and no form when the fetch returns null', async () => {
    getDetails.mockResolvedValue(null)
    render(<DataSourceCreatePage />)

    expect(await screen.findByText('Data source not found')).toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('blocks Bedrock sources', async () => {
    getDetails.mockResolvedValue({ ...gitSource, index_type: 'bedrock_kb' })
    render(<DataSourceCreatePage />)

    expect(await screen.findByText(/not supported for Bedrock/)).toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('blocks platform sources', async () => {
    getDetails.mockResolvedValue({ ...gitSource, index_type: 'platform_project' })
    render(<DataSourceCreatePage />)

    expect(await screen.findByText(/not supported for platform data sources/)).toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('reports a provider schema fetch failure instead of "not found"', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    getDetails.mockResolvedValue({
      ...gitSource,
      index_type: 'provider',
      provider_fields: { provider_id: 'prov-1' },
    })
    getSchemas.mockRejectedValue(new Error('500'))
    render(<DataSourceCreatePage />)

    expect(await screen.findByText(/Failed to load the data needed to clone/)).toBeInTheDocument()
    expect(screen.queryByText('Data source not found')).not.toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('blocks users without a creatable project', async () => {
    setUser({ isAdmin: false, applications: [] })
    getDetails.mockResolvedValue(gitSource)
    render(<DataSourceCreatePage />)

    expect(await screen.findByText(/access to at least one project/)).toBeInTheDocument()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('blocks a provider source whose provider no longer exists', async () => {
    getDetails.mockResolvedValue({
      ...gitSource,
      index_type: 'provider',
      provider_fields: { provider_id: 'gone' },
    })
    dataSourceStore.indexProviderSchemas = [{ id: 'other' }] as never
    render(<DataSourceCreatePage />)

    expect(
      await screen.findByText(/provider for this data source no longer exists/)
    ).toBeInTheDocument()
    expect(getSchemas).toHaveBeenCalled()
    expect(screen.queryByTestId('form')).not.toBeInTheDocument()
  })

  it('opens the form for a provider source whose provider exists', async () => {
    getDetails.mockResolvedValue({
      ...gitSource,
      index_type: 'provider',
      provider_fields: { provider_id: 'prov-1' },
    })
    dataSourceStore.indexProviderSchemas = [{ id: 'prov-1' }] as never
    render(<DataSourceCreatePage />)

    await waitFor(() => expect(screen.getByTestId('form')).toBeInTheDocument())
  })

  // Spec rule 5: AICE-imported sources keep their project_name like any other source; whether
  // it is kept or left unselected is decided by the form (visible to the user or not).
  it('passes an AICE-imported source untouched so the form resolves its project', async () => {
    getDetails.mockResolvedValue({ ...gitSource, aice_datasource_id: 'aice-1' })
    render(<DataSourceCreatePage />)

    expect(await screen.findByTestId('form')).toHaveAttribute('data-clone-id', 'src-1')
  })
})
