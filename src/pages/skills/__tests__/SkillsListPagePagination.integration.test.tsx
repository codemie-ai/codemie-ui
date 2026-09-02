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
import { describe, it, expect, beforeEach } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'
import { SkillVisibility } from '@/types/entity/skill'

const createSkillFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'skill-1',
  name: 'Skill 1',
  description: 'A test skill',
  content: 'Skill content',
  project: 'test-project',
  visibility: SkillVisibility.PROJECT,
  categories: [],
  version: '1.0.0',
  ...overrides,
})

const createSkills = (
  count: number,
  namePrefix: string,
  visibility: SkillVisibility = SkillVisibility.PROJECT
) =>
  Array.from({ length: count }, (_, i) =>
    createSkillFixture({
      id: `${namePrefix.toLowerCase()}-${i + 1}`,
      name: `${namePrefix} ${i + 1}`,
      visibility,
    })
  )

describe('SkillsListPage - Project tab - Pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockAPI('GET', 'v1/config', [])
  })

  it('shows next page of project skills when pagination button is clicked', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project').slice(12, 24),
      pagination: { page: 1, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Project 13')).toBeInTheDocument()
      expect(screen.queryByText('Project 1')).not.toBeInTheDocument()
    })
  })

  it('reloads project skills when per-page selection changes', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: [createSkillFixture({ id: 'project-perpage', name: 'Project PerPage' })],
      pagination: { page: 0, per_page: 24, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('24 items'))

    await waitFor(() => {
      expect(screen.getByText('Project PerPage')).toBeInTheDocument()
      expect(screen.queryByText('Project 1')).not.toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=24'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when project skills fit on one page', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(6, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 1, total: 6 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page for project tab', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByText('Project 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page for project tab', async () => {
    // Project tab's "current page" is local component state (starts at 0), not the
    // API response's pagination.page — so the last page must be reached via a real
    // click, not just mocked on initial load.
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project'),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/project')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Project').slice(24, 25),
      pagination: { page: 2, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.getByText('Project 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})

describe('SkillsListPage - Marketplace tab - Pagination', () => {
  const user = userEvent.setup()

  beforeEach(() => {
    mockAPI('GET', 'v1/config', [])
    mockAPI('GET', 'v1/user/reactions', { items: [] })
  })

  it('shows next page of marketplace skills when pagination button is clicked', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByText('Marketplace 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC).slice(12, 24),
      pagination: { page: 1, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Marketplace 13')).toBeInTheDocument()
      expect(screen.queryByText('Marketplace 1')).not.toBeInTheDocument()
    })
  })

  it('reloads marketplace skills when per-page selection changes', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByText('Marketplace 1')).toBeInTheDocument()
      expect(document.getElementById('per-page')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: [
        createSkillFixture({
          id: 'marketplace-perpage',
          name: 'Marketplace PerPage',
          visibility: SkillVisibility.PUBLIC,
        }),
      ],
      pagination: { page: 0, per_page: 24, pages: 2, total: 25 },
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('24 items'))

    await waitFor(() => {
      expect(screen.getByText('Marketplace PerPage')).toBeInTheDocument()
      expect(screen.queryByText('Marketplace 1')).not.toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=24'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when marketplace skills fit on one page', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(6, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 1, total: 6 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByText('Marketplace 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page for marketplace tab', async () => {
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByText('Marketplace 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page for marketplace tab', async () => {
    // "Current page" is local component state (starts at 0) — reach the last page
    // via a real click rather than mocking pagination.page on initial load.
    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC),
      pagination: { page: 0, per_page: 12, pages: 3, total: 25 },
    })

    renderPage('/skills/marketplace')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/skills', {
      data: createSkills(25, 'Marketplace', SkillVisibility.PUBLIC).slice(24, 25),
      pagination: { page: 2, per_page: 12, pages: 3, total: 25 },
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.getByText('Marketplace 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})

describe('SkillsListPage - Favorites tab - Pagination', () => {
  const user = userEvent.setup()

  const mockFavoritesFeatureFlag = () =>
    mockAPI('GET', 'v1/config', [{ id: 'features:favorites', settings: { enabled: true } }])

  beforeEach(() => {
    mockAPI('GET', 'v1/user/reactions', { items: [] })
  })

  it('shows next page of favorite skills when pagination button is clicked', async () => {
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByText('Favorite 1')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Page 2' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite').slice(12, 24),
      page: 1,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    await user.click(screen.getByRole('button', { name: 'Page 2' }))

    await waitFor(() => {
      expect(screen.getByText('Favorite 13')).toBeInTheDocument()
      expect(screen.queryByText('Favorite 1')).not.toBeInTheDocument()
    })
  })

  it('reloads favorite skills when per-page selection changes', async () => {
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByText('Favorite 1')).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: [createSkillFixture({ id: 'favorite-perpage', name: 'Favorite PerPage' })],
      page: 0,
      per_page: 24,
      pages: 2,
      total: 25,
    })

    const perPageSelect = document.getElementById('per-page') as HTMLElement
    fireEvent.click(perPageSelect)
    fireEvent.click(screen.getByLabelText('24 items'))

    await waitFor(() => {
      expect(screen.getByText('Favorite PerPage')).toBeInTheDocument()
      expect(screen.queryByText('Favorite 1')).not.toBeInTheDocument()
    })

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('per_page=24'),
      expect.anything()
    )
  })

  it('does not show pagination buttons when favorite skills fit on one page', async () => {
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(6, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 1,
      total: 6,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByText('Favorite 1')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    })
  })

  it('Previous page button absent on first page for favorites tab', async () => {
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByText('Favorite 1')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
  })

  it('Next page button absent on last page for favorites tab', async () => {
    // "Current page" is local component state (starts at 0) — reach the last page
    // via a real click rather than mocking pagination.page on initial load.
    mockFavoritesFeatureFlag()
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/skills/favorites')

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Page 3' })).toBeInTheDocument()
    })

    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createSkills(25, 'Favorite').slice(24, 25),
      page: 2,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    await user.click(screen.getByRole('button', { name: 'Page 3' }))

    await waitFor(() => {
      expect(screen.getByText('Favorite 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
  })
})
