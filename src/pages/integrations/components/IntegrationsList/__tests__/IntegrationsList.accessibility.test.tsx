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

import IntegrationRowActionsCell from '../../IntegrationRowActionsCell'
import IntegrationsList from '../IntegrationsList'

// Real NavigationMore is intentionally NOT mocked — this test verifies production
// table-column wiring produces correct ARIA accessible names.

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: vi.fn((store) => store) }
})

const makeSetting = (overrides: Record<string, unknown>) => ({
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
  ...overrides,
})

vi.mock('@/store/integrations', () => ({
  integrationsStore: {
    settings: [
      {
        id: 'setting-1',
        alias: 'GitHub Token',
        credential_type: 'github',
        credential_values: [],
        project_name: 'proj',
        is_global: false,
        setting_type: 'user',
      },
      {
        id: 'setting-2',
        alias: '',
        credential_type: 'jira',
        credential_values: [],
        project_name: 'proj',
        is_global: false,
        setting_type: 'project',
      },
    ],
    pagination: { page: 0, perPage: 10, totalPages: 1, totalCount: 2 },
    loading: false,
    fetchSettings: vi.fn().mockResolvedValue(undefined),
    deleteSetting: vi.fn().mockResolvedValue({}),
    takeSavedRow: vi.fn().mockReturnValue(null),
  },
  matchesSavedRow: () => false,
  editRouteName: (scope: string) => `edit-${scope}-integration`,
}))

vi.mock('@/store/user', () => ({
  userStore: { user: { id: 'u1' }, loadProjectSettingsUsers: vi.fn().mockResolvedValue([]) },
}))

vi.mock('@/utils/user', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/user')>()),
  canUseProjectScope: () => true,
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
  useIntegrationTypeOptions: () => ({ options: [], boundTypes: {} }),
}))

// Table mock: calls alias + actions renderers so the alias id is in DOM for aria-labelledby,
// and renders a real <table aria-label> so accessible-name assertions exercise production wiring.
vi.mock('@/components/Table', () => ({
  default: ({ customRenderColumns, items, ariaLabel }: any) => (
    <table aria-label={ariaLabel}>
      <thead>
        <tr>
          <th>Name</th>
        </tr>
      </thead>
      <tbody>
        {items?.map((item: any) => (
          <tr key={item.id} data-testid={`row-${item.id}`}>
            <td>
              {customRenderColumns?.alias?.(item)}
              {customRenderColumns?.actions?.(item)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  ),
}))

vi.mock('@/components/Filters', () => ({ default: () => null }))
vi.mock('@/components/UserFilter', () => ({ default: () => null }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/components/ProjectNameCell', () => ({ renderProjectNameCell: () => null }))
vi.mock('../../IntegrationDeleteWarning', () => ({ default: () => null }))
vi.mock('../../IntegrationStateBadge/renderIntegrationStateCell', () => ({
  renderIntegrationStateCell: () => null,
}))
vi.mock('../../TestIntegration', () => ({ default: () => null }))

vi.mock('@/utils/settings', () => ({
  getSettingCredsURL: vi.fn(() => ''),
  getTestableCredentialTypes: vi.fn(() => []),
  isOAuthProviderSetting: vi.fn(() => false),
  credentialValuesToRecord: vi.fn(() => ({})),
}))
vi.mock('@/utils/helpers', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/utils/helpers')>()),
  humanize: (s: string) => s,
  createdBy: () => '',
}))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <svg /> }))

const renderList = () => render(<IntegrationsList portalSidebarRef={{ current: null }} />)

describe('IntegrationsList accessibility — action button aria-labelledby wiring', () => {
  it('each row trigger is discoverable by its computed accessible name', () => {
    renderList()

    // Row 1: alias "GitHub Token" → accessible name "More options GitHub Token"
    expect(screen.getByRole('button', { name: 'More options GitHub Token' })).toBeInTheDocument()

    // Row 2: empty alias → falls back to credential_type 'jira' → accessible name "More options jira"
    expect(screen.getByRole('button', { name: 'More options jira' })).toBeInTheDocument()
  })

  it('each contextual trigger uses aria-labelledby referencing the alias cell id', () => {
    renderList()

    const trigger1 = screen.getByRole('button', { name: 'More options GitHub Token' })
    const trigger2 = screen.getByRole('button', { name: 'More options jira' })

    expect(trigger1.getAttribute('aria-labelledby')).toContain('integration-name-setting-1')
    expect(trigger2.getAttribute('aria-labelledby')).toContain('integration-name-setting-2')
  })

  it('triggers do not use aria-label when aria-labelledby is set', () => {
    renderList()

    expect(screen.getByRole('button', { name: 'More options GitHub Token' })).not.toHaveAttribute(
      'aria-label'
    )
    expect(screen.getByRole('button', { name: 'More options jira' })).not.toHaveAttribute(
      'aria-label'
    )
  })

  it('the two triggers reference different alias cell ids', () => {
    renderList()

    const trigger1 = screen.getByRole('button', { name: 'More options GitHub Token' })
    const trigger2 = screen.getByRole('button', { name: 'More options jira' })

    expect(trigger1.getAttribute('aria-labelledby')).not.toBe(
      trigger2.getAttribute('aria-labelledby')
    )
  })

  it('each alias cell carries the expected id in the DOM', () => {
    renderList()

    expect(document.getElementById('integration-name-setting-1')).not.toBeNull()
    expect(document.getElementById('integration-name-setting-2')).not.toBeNull()
  })

  it('names the table "Integrations"', () => {
    renderList()
    expect(screen.getByRole('table', { name: 'Integrations' })).toBeInTheDocument()
  })
})

describe('IntegrationRowActionsCell accessibility (contextId pattern)', () => {
  it('More Options button references the alias cell span via aria-labelledby', () => {
    const item = makeSetting({ id: 'ps-1', alias: 'my-github', credential_type: 'github' })
    render(
      <div>
        <span id="integration-name-ps-1">my-github</span>
        <IntegrationRowActionsCell
          item={item as any}
          contextIdPrefix="integration-name"
          onEdit={vi.fn()}
          onDelete={vi.fn()}
        />
      </div>
    )
    const btn = screen.getByRole('button', { name: 'More options my-github' })
    expect(btn).not.toHaveAttribute('aria-label')
    const parts = btn.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('my-github')
  })
})
