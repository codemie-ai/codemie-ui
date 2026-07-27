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
import { describe, it, expect } from 'vitest'

import { mockAPI, renderPage } from '@/test-utils/integration'

const paginationStub = { page: 0, per_page: 10, pages: 1, total: 1 }

const createSettingFixture = (overrides = {}) => ({
  id: 'setting-1',
  user_id: 'user-1',
  date: '2026-01-01T00:00:00Z',
  update_date: '2026-01-01T00:00:00Z',
  alias: 'my-scheduler',
  // Backend CredentialTypes.SCHEDULER stores "Scheduler"
  credential_type: 'Scheduler',
  project_name: 'test-project',
  display_name: null,
  default: false,
  setting_hash: null,
  is_global: false,
  credential_values: [{ key: 'is_enabled', value: true }],
  setting_type: 'user',
  ...overrides,
})

describe('IntegrationsPage — State column (EPMCDME-8260)', () => {
  it('shows Enabled badge for a Scheduler row with is_enabled: true', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: [createSettingFixture({ credential_values: [{ key: 'is_enabled', value: true }] })],
      pagination: paginationStub,
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('Enabled')).toBeInTheDocument()
    })
  })

  it('shows Disabled badge for a Scheduler row with is_enabled: false', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: [createSettingFixture({ credential_values: [{ key: 'is_enabled', value: false }] })],
      pagination: paginationStub,
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })

  it('shows Disabled badge for a Scheduler row without is_enabled in credential_values', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: [
        createSettingFixture({
          credential_values: [{ key: 'url', value: 'https://scheduler.example.com' }],
        }),
      ],
      pagination: paginationStub,
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('my-scheduler')).toBeInTheDocument()
      expect(screen.queryByText('Enabled')).not.toBeInTheDocument()
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })

  it('shows no badge for a non-scheduler row without is_enabled', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: [
        createSettingFixture({
          alias: 'my-github',
          credential_type: 'GitHub',
          credential_values: [{ key: 'url', value: 'https://github.com' }],
        }),
      ],
      pagination: paginationStub,
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('my-github')).toBeInTheDocument()
      expect(screen.queryByText('Enabled')).not.toBeInTheDocument()
      expect(screen.queryByText('Disabled')).not.toBeInTheDocument()
    })
  })

  it('shows Enabled badge for a non-scheduler row with is_enabled explicitly set to true', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: [
        createSettingFixture({
          alias: 'my-github',
          credential_type: 'GitHub',
          credential_values: [
            { key: 'url', value: 'https://github.com' },
            { key: 'is_enabled', value: true },
          ],
        }),
      ],
      pagination: paginationStub,
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('my-github')).toBeInTheDocument()
      expect(screen.getByText('Enabled')).toBeInTheDocument()
    })
  })

  it('shows Disabled badge for a non-scheduler row with is_enabled explicitly set to false', async () => {
    mockAPI('GET', 'v1/settings/user', {
      data: [
        createSettingFixture({
          alias: 'my-github',
          credential_type: 'GitHub',
          credential_values: [
            { key: 'url', value: 'https://github.com' },
            { key: 'is_enabled', value: false },
          ],
        }),
      ],
      pagination: paginationStub,
    })

    renderPage('/integrations')

    await waitFor(() => {
      expect(screen.getByText('my-github')).toBeInTheDocument()
      expect(screen.getByText('Disabled')).toBeInTheDocument()
    })
  })
})
