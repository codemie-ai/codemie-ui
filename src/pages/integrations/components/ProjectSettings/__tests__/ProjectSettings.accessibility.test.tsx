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
import { describe, expect, it, vi } from 'vitest'

import ProjectSettings from '../ProjectSettings'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: vi.fn((store) => store) }
})

vi.mock('@/store/projectSettings', () => ({
  projectSettingsStore: {
    projectSettings: [],
    projectSettingsPagination: { page: 0, perPage: 10, totalPages: 1 },
    deleteProjectSetting: vi.fn().mockResolvedValue({}),
    fetchProjectSettings: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/store', () => ({
  userStore: {
    user: { id: 'u1', name: 'Test User' },
    loadProjectSettingsUsers: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('@/hooks/useTableFilters', () => ({
  useTableFilters: () => ({
    onPaginationUpdate: vi.fn(),
    pagination: { page: 0, perPage: 10 },
    filters: {},
    applyFilters: vi.fn(),
  }),
}))

vi.mock('@/hooks/useProjectOptions', () => ({
  useProjectOptions: () => ({ projectOptions: [], loadProjectOptions: vi.fn() }),
}))

vi.mock('@/hooks/useResolvedProjectOptions', () => ({
  useResolvedProjectOptions: () => [],
}))

vi.mock('@/hooks/useIntegrationTypeOptions', () => ({
  useIntegrationTypeOptions: () => [],
}))

vi.mock('@/components/Table', () => ({
  default: ({ ariaLabel }: any) => (
    <table aria-label={ariaLabel}>
      <thead>
        <tr>
          <th>Name</th>
        </tr>
      </thead>
    </table>
  ),
}))

vi.mock('@/components/Filters', () => ({ default: () => null }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/components/ProjectNameCell', () => ({ renderProjectNameCell: () => null }))
vi.mock('@/components/UserFilter', () => ({ default: () => null }))
vi.mock('../IntegrationDeleteWarning', () => ({ default: () => null }))
vi.mock('../IntegrationRowActionsCell', () => ({ default: () => null }))
vi.mock('../IntegrationStateBadge/renderIntegrationStateCell', () => ({
  renderIntegrationStateCell: () => null,
}))

vi.mock('@/pages/integrations/IntegrationsTab', () => ({ INITIAL_FILTERS: {} }))
vi.mock('@/utils/filters', () => ({
  checkEmptyFilters: vi.fn(() => true),
  FILTER_ENTITY: { PROJECT_SETTINGS: 'project_settings' },
}))
vi.mock('@/utils/settings', () => ({
  getSettingCredsURL: vi.fn(() => ''),
  SETTING_TYPE_PROJECT: 'project',
}))
vi.mock('@/utils/helpers', () => ({ humanize: (s: string) => s, createdBy: () => '' }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))
vi.mock('@/constants', () => ({
  ButtonType: { DELETE: 'delete' },
  DECIMAL_PAGINATION_OPTIONS: [10, 25],
  CREATED_BY: 'created_by',
  // Consumed transitively via OAuthTestAction -> OAuthTestButton for OAuth integration rows.
  CHECKER_STATUSES: {
    UNDEFINED: 'undefined',
    IN_PROGRESS: 'in-progress',
    FAILED: 'failed',
    SUCCESS: 'success',
  },
}))

vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <svg /> }))

describe('ProjectSettings accessibility', () => {
  it('names the table "Project integrations"', () => {
    render(<ProjectSettings tableColumns={[]} portalSidebarRef={{ current: null }} />)
    expect(screen.getByRole('table', { name: 'Project integrations' })).toBeInTheDocument()
  })
})
