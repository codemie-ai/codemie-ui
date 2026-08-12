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

import UserSettings from '../UserSettings'

// Real NavigationMore is intentionally NOT mocked — this test verifies production
// table-column wiring produces correct ARIA accessible names.

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: vi.fn((store) => store) }
})

vi.mock('@/store/userSettings', () => ({
  userSettingsStore: {
    userSettings: [
      {
        id: 'setting-1',
        alias: 'GitHub Token',
        credential_type: 'github',
        credential_values: [],
        user_id: 'u1',
        date: '2026-01-01',
        update_date: '2026-01-01',
        project_name: 'proj',
        default: false,
        setting_hash: null,
        is_global: false,
        setting_type: 'user',
        display_name: null,
      },
      {
        id: 'setting-2',
        alias: '',
        credential_type: 'jira',
        credential_values: [],
        user_id: 'u1',
        date: '2026-01-01',
        update_date: '2026-01-01',
        project_name: 'proj',
        default: false,
        setting_hash: null,
        is_global: false,
        setting_type: 'user',
        display_name: null,
      },
    ],
    userSettingsPagination: { page: 0, perPage: 10, totalPages: 1 },
    deleteUserSetting: vi.fn().mockResolvedValue({}),
    fetchUserSettings: vi.fn().mockResolvedValue(undefined),
    resetIsSettingsIndexed: vi.fn(),
  },
}))

vi.mock('@/store', () => ({
  userStore: { user: { id: 'u1', name: 'Test User' } },
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

// Table mock: calls alias + actions renderers so the alias id is in DOM for aria-labelledby.
vi.mock('@/components/Table', () => ({
  default: ({ customRenderColumns, items }: any) => (
    <div>
      {items?.map((item: any) => (
        <div key={item.id} data-testid={`row-${item.id}`}>
          {customRenderColumns?.alias?.(item)}
          {customRenderColumns?.actions?.(item)}
        </div>
      ))}
    </div>
  ),
}))

vi.mock('@/components/Filters', () => ({ default: () => null }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/components/ProjectNameCell', () => ({ renderProjectNameCell: () => null }))
vi.mock('../IntegrationDeleteWarning', () => ({ default: () => null }))
vi.mock('../IntegrationStateBadge/renderIntegrationStateCell', () => ({
  renderIntegrationStateCell: () => null,
}))
vi.mock('../TestIntegration', () => ({ default: () => null }))

vi.mock('@/pages/integrations/IntegrationsTab', () => ({ INITIAL_FILTERS: {} }))
vi.mock('@/utils/filters', () => ({
  checkEmptyFilters: vi.fn(() => true),
  FILTER_ENTITY: { USER_SETTINGS: 'user_settings' },
}))
vi.mock('@/utils/settings', () => ({
  getSettingCredsURL: vi.fn(() => ''),
  getTestableCredentialTypes: vi.fn(() => []),
  SETTING_TYPE_USER: 'user',
}))
vi.mock('@/utils/helpers', () => ({ humanize: (s: string) => s }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))
vi.mock('@/constants', () => ({
  ButtonType: { DELETE: 'delete' },
  DECIMAL_PAGINATION_OPTIONS: [10, 25],
}))

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <svg /> }))

describe('UserSettings accessibility — action button aria-labelledby wiring', () => {
  it('each row trigger is discoverable by its computed accessible name', () => {
    render(<UserSettings tableColumns={[]} portalSidebarRef={{ current: null }} />)

    // Row 1: alias "GitHub Token" → accessible name "More options GitHub Token"
    expect(screen.getByRole('button', { name: 'More options GitHub Token' })).toBeInTheDocument()

    // Row 2: empty alias → falls back to credential_type 'jira' → accessible name "More options jira"
    expect(screen.getByRole('button', { name: 'More options jira' })).toBeInTheDocument()
  })

  it('each contextual trigger uses aria-labelledby referencing the alias cell id', () => {
    render(<UserSettings tableColumns={[]} portalSidebarRef={{ current: null }} />)

    const trigger1 = screen.getByRole('button', { name: 'More options GitHub Token' })
    const trigger2 = screen.getByRole('button', { name: 'More options jira' })

    expect(trigger1.getAttribute('aria-labelledby')).toContain('user-setting-name-setting-1')
    expect(trigger2.getAttribute('aria-labelledby')).toContain('user-setting-name-setting-2')
  })

  it('triggers do not use aria-label when aria-labelledby is set', () => {
    render(<UserSettings tableColumns={[]} portalSidebarRef={{ current: null }} />)

    const trigger1 = screen.getByRole('button', { name: 'More options GitHub Token' })
    const trigger2 = screen.getByRole('button', { name: 'More options jira' })

    expect(trigger1).not.toHaveAttribute('aria-label')
    expect(trigger2).not.toHaveAttribute('aria-label')
  })

  it('the two triggers reference different alias cell ids', () => {
    render(<UserSettings tableColumns={[]} portalSidebarRef={{ current: null }} />)

    const trigger1 = screen.getByRole('button', { name: 'More options GitHub Token' })
    const trigger2 = screen.getByRole('button', { name: 'More options jira' })

    expect(trigger1.getAttribute('aria-labelledby')).not.toBe(
      trigger2.getAttribute('aria-labelledby')
    )
  })

  it('each alias cell carries the expected id in the DOM', () => {
    render(<UserSettings tableColumns={[]} portalSidebarRef={{ current: null }} />)

    expect(document.getElementById('user-setting-name-setting-1')).not.toBeNull()
    expect(document.getElementById('user-setting-name-setting-2')).not.toBeNull()
  })
})
