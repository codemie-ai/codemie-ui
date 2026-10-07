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

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { ASSISTANT_INDEX_SCOPES } from '@/constants/assistants'
import { assistantsStore } from '@/store/assistants'
import { userStore } from '@/store/user'

import AssistantFilters from '../AssistantFilters'

vi.mock('@/hooks/useProjectOptions', () => ({
  useProjectOptions: () => ({
    projectOptions: [],
    loadProjectOptions: vi.fn().mockResolvedValue(undefined),
  }),
}))

vi.mock('@/hooks/useResolvedProjectOptions', () => ({
  useResolvedProjectOptions: () => [],
}))

vi.mock('@/hooks/useAllIntegrationTypeOptions', () => ({
  useAllIntegrationTypeOptions: () => [
    { label: 'Azure DevOps', value: 'AzureDevOps' },
    { label: 'Jira', value: 'Jira' },
  ],
}))

const defaultFilters = {
  search: '',
  project: [],
  created_by: '',
  is_global: null,
  shared: null,
  categories: [],
  sort_by: null,
  sort_order: 'desc',
  integration_type: [],
}

describe('AssistantFilters', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    assistantsStore.assistantCategories = []
    assistantsStore.getAssistantCategories = vi.fn().mockResolvedValue(undefined) as any
    userStore.loadAssistantsUsers = vi.fn().mockResolvedValue([]) as any
  })

  it('renders integration_type filter in VISIBLE_TO_USER scope', () => {
    render(
      <AssistantFilters
        onFilterChange={vi.fn()}
        filters={defaultFilters}
        activeScope={ASSISTANT_INDEX_SCOPES.VISIBLE_TO_USER}
      />
    )

    expect(screen.getByText('INTEGRATION TYPE')).toBeInTheDocument()
  })

  it('renders integration_type filter in PROJECT_WITH_MARKETPLACE scope', () => {
    render(
      <AssistantFilters
        onFilterChange={vi.fn()}
        filters={defaultFilters}
        activeScope={ASSISTANT_INDEX_SCOPES.PROJECT_WITH_MARKETPLACE}
      />
    )

    expect(screen.getByText('INTEGRATION TYPE')).toBeInTheDocument()
  })

  it('does not render integration_type filter in TEMPLATES scope', () => {
    render(
      <AssistantFilters
        onFilterChange={vi.fn()}
        filters={defaultFilters}
        activeScope={ASSISTANT_INDEX_SCOPES.TEMPLATES}
      />
    )

    expect(screen.queryByText('INTEGRATION TYPE')).not.toBeInTheDocument()
  })

  it('does not render integration_type filter in MARKETPLACE scope', () => {
    render(
      <AssistantFilters
        onFilterChange={vi.fn()}
        filters={defaultFilters}
        activeScope={ASSISTANT_INDEX_SCOPES.MARKETPLACE}
      />
    )

    expect(screen.queryByText('INTEGRATION TYPE')).not.toBeInTheDocument()
  })
})
