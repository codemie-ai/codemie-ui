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

import { describe, it, expect, vi } from 'vitest'

import { IntegrationScope, SCOPE_ALL } from '@/utils/integrationScope'

import { applyScopeChange, toRequestFilters } from '../integrationFilters'

const bound = {
  DIAL: { scope: IntegrationScope.PROJECT, label: 'DIAL' },
  Other: { scope: IntegrationScope.PROJECT, label: 'Other' },
  GoogleOAuth: { scope: IntegrationScope.USER, label: 'Google OAuth' },
}

vi.mock('@/utils/settings', () => ({
  getTypeScopeBinding: (type: string) => bound[type as keyof typeof bound]?.scope ?? null,
}))

describe('applyScopeChange', () => {
  it('drops types bound to the other scope, clears Global and Created by, reports a notice', () => {
    const { filters, notice } = applyScopeChange(
      { type: ['DIAL', 'Jira'], is_global: 'true', created_by: 'me', scope: 'project' },
      IntegrationScope.USER,
      bound
    )
    expect(filters).toEqual({ type: ['Jira'], scope: 'user' })
    expect(notice).toBe('DIAL was removed from Type: it exists only at Project scope.')
  })

  it('uses the plural notice for several removals', () => {
    const { notice } = applyScopeChange(
      { type: ['DIAL', 'Other', 'GoogleOAuth'], scope: 'all' },
      IntegrationScope.USER,
      bound
    )
    expect(notice).toBe('DIAL, Other were removed from Type: they exist only at Project scope.')
  })

  it('has no notice and no scope at all', () => {
    const { filters, notice } = applyScopeChange(
      { type: ['DIAL'], scope: IntegrationScope.PROJECT },
      SCOPE_ALL,
      bound
    )
    expect(notice).toBeNull()
    expect(filters.scope).toBeUndefined()
    expect(filters.type).toEqual(['DIAL'])
  })
})

describe('toRequestFilters', () => {
  const f = { scope: 'project', is_global: 'true', created_by: 'me', type: ['Jira'], x: null }

  it('drops scope and null values', () => {
    expect(
      toRequestFilters({ ...f }, { visible: true, value: IntegrationScope.PROJECT })
    ).not.toHaveProperty('x')
    expect(
      toRequestFilters({ ...f }, { visible: true, value: IntegrationScope.PROJECT })
    ).not.toHaveProperty('scope')
  })

  it('keeps created_by only at project and is_global only at user or without Scope filter', () => {
    expect(toRequestFilters({ ...f }, { visible: true, value: IntegrationScope.PROJECT })).toEqual({
      created_by: 'me',
      type: ['Jira'],
    })
    expect(toRequestFilters({ ...f }, { visible: true, value: IntegrationScope.USER })).toEqual({
      is_global: 'true',
      type: ['Jira'],
    })
    expect(toRequestFilters({ ...f }, { visible: false, value: IntegrationScope.USER })).toEqual({
      is_global: 'true',
      type: ['Jira'],
    })
  })

  it('drops is_global and created_by at all', () => {
    expect(toRequestFilters({ ...f }, { visible: true, value: 'all' })).toEqual({ type: ['Jira'] })
  })
})
