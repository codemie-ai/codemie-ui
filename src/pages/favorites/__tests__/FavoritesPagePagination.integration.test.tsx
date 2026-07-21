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
import { describe, it, expect, beforeEach } from 'vitest'

import { renderPage, mockAPI } from '@/test-utils/integration'

const createAssistantFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'assistant-1',
  name: 'Assistant 1',
  slug: 'assistant-1',
  description: 'Test description',
  is_global: false,
  shared: false,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  system_prompt: 'You are a helpful assistant',
  llm_model_type: 'gpt-4',
  mcp_servers: [],
  system_prompt_history: [],
  guardrail_assignments: [],
  is_liked: false,
  is_disliked: false,
  is_favorited: true,
  is_pinned: false,
  unique_likes_count: 0,
  unique_dislikes_count: 0,
  user_abilities: ['read', 'write'],
  ...overrides,
})

const createSkillFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'skill-1',
  name: 'Skill 1',
  description: 'A test skill',
  content: 'Skill content',
  project: 'test-project',
  visibility: 'project',
  categories: [],
  version: '1.0.0',
  is_favorited: true,
  ...overrides,
})

const createWorkflowFixture = (overrides: Record<string, unknown> = {}) => ({
  id: 'workflow-1',
  name: 'Workflow 1',
  slug: 'workflow-1',
  description: 'Test workflow description',
  is_global: false,
  shared: false,
  is_favorited: true,
  update_date: '2024-01-01T00:00:00Z',
  yaml_config: 'test: config',
  yaml_config_history: [],
  user_abilities: ['read', 'write', 'delete'],
  unique_users_count: 5,
  ...overrides,
})

const createItems = (
  factory: (overrides: Record<string, unknown>) => Record<string, unknown>,
  count: number,
  namePrefix: string
) =>
  Array.from({ length: count }, (_, i) =>
    factory({ id: `${namePrefix.toLowerCase()}-${i + 1}`, name: `${namePrefix} ${i + 1}` })
  )

describe('FavoritesPage - Pagination (narrowed: no pagination UI in production)', () => {
  beforeEach(() => {
    mockAPI('GET', 'v1/config', [])
  })

  it('never shows pagination controls and always fetches fixed page=0&per_page=12 for the "all" view', async () => {
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/assistants', {
      data: createItems(createAssistantFixture, 25, 'Assistant'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createItems(createSkillFixture, 25, 'Skill'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/workflows', {
      data: createItems(createWorkflowFixture, 25, 'Workflow'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })
    mockAPI('GET', 'v1/user/reactions', { items: [] })

    renderPage('/favorites')

    await waitFor(() => {
      expect(screen.getByText('Assistant 1')).toBeInTheDocument()
      // FavoritesPage renders every item the API returns with no client-side
      // slicing (fetchFavoriteAssistants/Skills/Workflows just assign the response
      // array to the store) — asserting item 13 is absent would assert behavior the
      // page doesn't implement. The only real guarantee is that pagination controls
      // never appear and the fetch always requests the fixed page=0&per_page=12.
      expect(screen.getByText('Assistant 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/assistants?page=0&per_page=12'),
      expect.anything()
    )
  })

  it('never shows pagination controls and always fetches fixed page=0&per_page=12 for the "assistant" view', async () => {
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/assistants', {
      data: createItems(createAssistantFixture, 25, 'Assistant'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/favorites/assistants')

    await waitFor(() => {
      expect(screen.getByText('Assistant 1')).toBeInTheDocument()
      // See note in the "all" view test above — no client-side slicing exists.
      expect(screen.getByText('Assistant 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/assistants?page=0&per_page=12'),
      expect.anything()
    )
  })

  it('never shows pagination controls and always fetches fixed page=0&per_page=12 for the "skill" view', async () => {
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/skills', {
      data: createItems(createSkillFixture, 25, 'Skill'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })
    mockAPI('GET', 'v1/user/reactions', { items: [] })

    renderPage('/favorites/skills')

    await waitFor(() => {
      expect(screen.getByText('Skill 1')).toBeInTheDocument()
      // See note in the "all" view test above — no client-side slicing exists.
      expect(screen.getByText('Skill 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/skills?page=0&per_page=12'),
      expect.anything()
    )
  })

  it('never shows pagination controls and always fetches fixed page=0&per_page=12 for the "workflow" view', async () => {
    mockAPI('GET', 'v1/preferences/test-user-id/favorites/workflows', {
      data: createItems(createWorkflowFixture, 25, 'Workflow'),
      page: 0,
      per_page: 12,
      pages: 3,
      total: 25,
    })

    renderPage('/favorites/workflows')

    await waitFor(() => {
      expect(screen.getByText('Workflow 1')).toBeInTheDocument()
      // See note in the "all" view test above — no client-side slicing exists.
      expect(screen.getByText('Workflow 25')).toBeInTheDocument()
    })

    expect(screen.queryByRole('button', { name: 'Page 2' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Previous page' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next page' })).not.toBeInTheDocument()
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/favorites/workflows?page=0&per_page=12'),
      expect.anything()
    )
  })
})
