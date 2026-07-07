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

import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'
import toaster from '@/utils/toaster'

describe('AssistantTemplates - Pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    ;(mockRouterState as any).query = {}
    ;(mockRouterState.currentRoute.value as any).query = {}
  })

  afterEach(() => {
    ;(mockRouterState as any).query = {}
    ;(mockRouterState.currentRoute.value as any).query = {}
  })

  const createTemplateFixture = (overrides = {}) => ({
    id: 'template-1',
    name: 'Template Assistant',
    slug: 'template-assistant',
    description: 'A template assistant',
    is_global: false,
    shared: false,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
    system_prompt: '',
    llm_model_type: 'gpt-4',
    mcp_servers: [],
    system_prompt_history: [],
    guardrail_assignments: [],
    is_liked: false,
    is_disliked: false,
    is_favorited: false,
    is_pinned: false,
    unique_likes_count: 0,
    unique_dislikes_count: 0,
    user_abilities: ['read'],
    ...overrides,
  })

  const createTemplates = (count: number) =>
    Array.from({ length: count }, (_, i) =>
      createTemplateFixture({
        id: `template-${i + 1}`,
        name: `Template ${i + 1}`,
        slug: `template-${i + 1}`,
      })
    )

  it('shows pagination buttons when templates exceed one page', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', createTemplates(25))

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })
  })

  it('displays only first page items on initial load', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', createTemplates(25))

    renderPage('/assistants/templates')

    // Wait until page 1 data is confirmed: Template 1 visible AND Template 13 not visible
    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument()
      expect(screen.queryByText('Template 13')).not.toBeInTheDocument()
    })
  })

  it('shows next page of templates when pagination button is clicked', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', createTemplates(25))

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    // Wait until page 2 data is confirmed: Template 13 visible AND Template 1 not visible
    await waitFor(() => {
      expect(screen.getByText('Template 13')).toBeInTheDocument()
      expect(screen.queryByText('Template 1')).not.toBeInTheDocument()
    })
  })

  it('does not show pagination buttons when templates fit on one page', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', createTemplates(6))

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
      expect(screen.getByText('Template 1')).toBeInTheDocument()
    })
  })

  it('navigates back to first page when page 1 button is clicked after going to page 2', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', createTemplates(25))

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Template 13')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 1' }))

    await waitFor(() => {
      expect(screen.getByText('Template 1')).toBeInTheDocument()
      expect(screen.queryByText('Template 13')).not.toBeInTheDocument()
    })
  })

  it('loads the page specified in the URL query param on initial render', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', createTemplates(25))
    ;(mockRouterState as any).query = { page: '2' }

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(screen.getByText('Template 13')).toBeInTheDocument()
      expect(screen.queryByText('Template 1')).not.toBeInTheDocument()
    })
  })

  it('updates the URL when navigating to a new page', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', createTemplates(25))

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(mockRouterState.replace).toHaveBeenCalledWith({ query: { page: '2' } })
    })
  })

  it('does not include page param in URL when navigating back to page 1', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', createTemplates(25))

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))
    await waitFor(() => expect(screen.getByText('Template 13')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: 'Page 1' }))

    await waitFor(() => {
      expect(mockRouterState.replace).toHaveBeenLastCalledWith({ query: {} })
    })
  })

  it('handles paginated {data, pagination} API response format', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', {
      data: createTemplates(12),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })
  })

  it('shows an error toast when the templates API request fails', async () => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/assistants/prebuilt', { error: 'server error' }, 500)

    renderPage('/assistants/templates')

    await waitFor(() => {
      expect(toaster.error).toHaveBeenCalledWith('Failed to load assistant templates')
    })
  })
})
