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

import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { workflowsStore } from '@/store/workflows'
import { renderPage, mockAPI } from '@/test-utils/integration'
import toaster from '@/utils/toaster'

describe('WorkflowTemplates - Pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    workflowsStore.workflowTemplatesPagination.page = 0
    workflowsStore.workflowTemplatesPagination.perPage = 12
    workflowsStore.workflowTemplatesPagination.totalPages = 0
    workflowsStore.workflowTemplatesPagination.totalCount = 0
    ;(mockRouterState as any).path = '/workflows/templates'
    ;(mockRouterState as any).query = {}
    ;(mockRouterState.currentRoute.value as any).query = {}
  })

  afterEach(() => {
    ;(mockRouterState as any).path = '/'
    ;(mockRouterState as any).query = {}
    ;(mockRouterState.currentRoute.value as any).query = {}
  })

  const createTemplateFixture = (overrides = {}) => ({
    id: 'wf-template-1',
    slug: 'wf-template-1',
    name: 'Workflow Template',
    description: 'A workflow template',
    icon_url: null,
    ...overrides,
  })

  const createTemplates = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      createTemplateFixture({
        id: `wf-template-${i + 1}`,
        slug: `wf-template-${i + 1}`,
        name: `Workflow Template ${i + 1}`,
      })
    )

  it('shows pagination buttons when templates exceed one page', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(25))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByText('Workflow Template 1')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })
  })

  it('displays total template count', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(25))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByText('25 TEMPLATES')).toBeInTheDocument()
    })
  })

  it('displays only first page items on initial load', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(25))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByText('Workflow Template 1')).toBeInTheDocument()
      expect(screen.queryByText('Workflow Template 13')).not.toBeInTheDocument()
    })
  })

  it('shows next page of templates when pagination button is clicked', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(25))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Workflow Template 13')).toBeInTheDocument()
      expect(screen.queryByText('Workflow Template 1')).not.toBeInTheDocument()
    })
  })

  it('does not show pagination buttons when templates fit on one page', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(6))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
      expect(screen.getByText('Workflow Template 1')).toBeInTheDocument()
    })
  })

  it('navigates back to first page items when page 1 button is clicked after going to page 2', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(25))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Workflow Template 13')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 1' }))

    await waitFor(() => {
      expect(screen.getByText('Workflow Template 1')).toBeInTheDocument()
      expect(screen.queryByText('Workflow Template 13')).not.toBeInTheDocument()
    })
  })

  it('loads the page specified in the URL query param on initial render', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(25))
    ;(mockRouterState as any).query = { page: '2' }

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByText('Workflow Template 13')).toBeInTheDocument()
      expect(screen.queryByText('Workflow Template 1')).not.toBeInTheDocument()
    })
  })

  it('updates the URL when navigating to a new page', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(25))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(mockRouterState.replace).toHaveBeenCalledWith({ query: { page: '2' } })
    })
  })

  it('does not include page param in URL when navigating back to page 1', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(25))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    await waitFor(() => expect(screen.getByText('Workflow Template 13')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Page 1' }))

    await waitFor(() => {
      expect(mockRouterState.replace).toHaveBeenLastCalledWith({ query: {} })
    })
  })

  it('handles paginated {data, pagination} API response format', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', {
      data: createTemplates(12),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })
  })

  it('shows an error toast when the templates API request fails', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', { error: 'server error' }, 500)

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Failed to load workflow templates')
    })
  })

  it('renders workflow template items as a semantic list', async () => {
    mockAPI('GET', 'v1/workflows/prebuilt', createTemplates(3))

    renderPage('/workflows/templates')

    await waitFor(() => {
      expect(screen.getByText('Workflow Template 1')).toBeInTheDocument()
    })

    const list = screen.getByRole('list', { name: 'Workflow templates' })
    expect(list.tagName).toBe('UL')

    const { getAllByRole: getAllByRoleInList } = within(list)
    const items = getAllByRoleInList('listitem')
    expect(items).toHaveLength(3)
    items.forEach((item) => expect(item.tagName).toBe('LI'))
  })
})
