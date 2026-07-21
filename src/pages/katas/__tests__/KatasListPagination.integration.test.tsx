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

import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { renderPage, mockAPI } from '@/test-utils/integration'
import { KataLevel, KataStatus, KataProgressStatus } from '@/types/entity/kata'

const createKataFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'kata-1',
  title: 'Kata 1',
  description: 'A test kata',
  level: KataLevel.BEGINNER,
  duration_minutes: 30,
  tags: [],
  status: KataStatus.PUBLISHED,
  is_published: true,
  date: '2026-01-01T00:00:00Z',
  unique_likes_count: 0,
  unique_dislikes_count: 0,
  enrollment_count: 0,
  user_progress: {
    id: null,
    user_id: 'test-user-id',
    kata_id: 'kata-1',
    status: KataProgressStatus.NOT_STARTED,
    started_at: null,
    completed_at: null,
    user_reaction: null,
  },
  ...overrides,
})

const createKatas = (count: number) =>
  Array.from({ length: count }, (_, i) =>
    createKataFixture({ id: `kata-${i + 1}`, title: `Kata ${i + 1}` })
  )

describe('KatasPage - ALL_KATAS - Pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockRouterState.push.mockClear()
    mockRouterState.replace.mockClear()
    ;(mockRouterState as any).query = {}
    ;(mockRouterState.currentRoute.value as any).query = {}
    mockAPI('GET', 'v1/katas/tags', [])
    mockAPI('GET', 'v1/katas/roles', [])
  })

  afterEach(() => {
    ;(mockRouterState as any).query = {}
    ;(mockRouterState.currentRoute.value as any).query = {}
  })

  it('shows next page of katas when pagination button is clicked and updates the URL', async () => {
    // useKatasList's own DEFAULT_PER_PAGE (12) — not KATA_CONSTRAINTS.DEFAULT_PER_PAGE (20) —
    // is what its updateURL() compares against to decide whether to include per_page in the
    // query string. Using per_page=12 here keeps the URL assertion focused on the `page` param.
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25),
      pagination: { page: 1, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/katas', {
      data: createKatas(25).slice(12, 24),
      pagination: { page: 2, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Kata 13')).toBeInTheDocument()
      expect(screen.queryByText('Kata 1')).not.toBeInTheDocument()
      expect(mockRouterState.replace).toHaveBeenCalledWith({ query: { page: '2' } })
    })
  })

  it('reloads katas when per-page selection changes and updates the URL', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25),
      pagination: { page: 1, per_page: 20, pages: 2, total: 25 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/katas', {
      data: [createKataFixture({ id: 'kata-perpage', title: 'Kata PerPage' })],
      pagination: { page: 1, per_page: 45, pages: 1, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('45 items'))

    await waitFor(() => {
      expect(screen.getByText('Kata PerPage')).toBeInTheDocument()
      expect(screen.queryByText('Kata 1')).not.toBeInTheDocument()
      expect(mockRouterState.replace).toHaveBeenCalledWith({ query: { per_page: '45' } })
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=45'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when katas fit on one page', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(6),
      pagination: { page: 1, per_page: 20, pages: 1, total: 6 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25),
      pagination: { page: 1, per_page: 20, pages: 2, total: 25 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25).slice(20, 25),
      pagination: { page: 2, per_page: 20, pages: 2, total: 25 },
    })

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 21')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })

  it('loads the page specified in the URL query param on initial render', async () => {
    mockAPI('GET', 'v1/katas', {
      data: createKatas(25).slice(20, 25),
      pagination: { page: 2, per_page: 20, pages: 2, total: 25 },
    })
    ;(mockRouterState as any).query = { page: '2' }
    ;(mockRouterState.currentRoute.value as any).query = { page: '2' }

    renderPage('/katas')

    await waitFor(() => {
      expect(screen.getByText('Kata 21')).toBeInTheDocument()
      expect(screen.queryByText('Kata 1')).not.toBeInTheDocument()
    })
  })
})
