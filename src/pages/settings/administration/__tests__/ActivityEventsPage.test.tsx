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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi } from 'vitest'

import { activityEventsStore } from '@/store/activityEvents'
import { ActivityEventFilterOptions } from '@/types/entity/activityEvent'

import ActivityEventsPage from '../ActivityEventsPage'
import { computeFilteredOptions, revalidateSelections } from '../components/activityEventsFilters'

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: vi.fn((store: unknown) => store),
  }
})

vi.mock('react-router', async () => {
  const actual = await vi.importActual('react-router')
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  }
})

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ contentTitle, content }: any) => (
    <div>
      <h1>{contentTitle}</h1>
      {content}
    </div>
  ),
}))

vi.mock('@/store/user', () => ({
  userStore: {
    user: { isMaintainer: true },
  },
}))

vi.mock('@/store/activityEvents', () => ({
  activityEventsStore: {
    events: [],
    pagination: { page: 0, perPage: 50, totalPages: 0, totalCount: 0 },
    loading: false,
    filterOptions: { domains: [], event_types: [], entity_types: [], mapping: {} },
    filterOptionsLoading: false,
    listEvents: vi.fn().mockResolvedValue(undefined),
    loadFilterOptions: vi.fn().mockResolvedValue(undefined),
  },
}))

const FILTER_OPTIONS: ActivityEventFilterOptions = {
  domains: ['budget_management', 'user_management', 'project_management'],
  event_types: ['budget.created', 'project.created', 'user.created'],
  entity_types: ['budget', 'project', 'user'],
  mapping: {
    budget_management: {
      event_types: ['budget.created'],
      entity_types: ['budget'],
    },
    user_management: {
      event_types: ['user.created'],
      entity_types: ['user'],
    },
    project_management: {
      event_types: ['project.created'],
      entity_types: ['project'],
    },
  },
}

describe('computeFilteredOptions', () => {
  it('returns all options when no domain is selected', () => {
    const result = computeFilteredOptions(FILTER_OPTIONS, [])
    expect(result.eventTypeOptions).toEqual(['budget.created', 'project.created', 'user.created'])
    expect(result.entityTypeOptions).toEqual(['budget', 'project', 'user'])
  })

  it('returns empty arrays when filterOptions is null', () => {
    const result = computeFilteredOptions(null, ['budget_management'])
    expect(result.eventTypeOptions).toEqual([])
    expect(result.entityTypeOptions).toEqual([])
  })

  it('filters to selected domain only', () => {
    const result = computeFilteredOptions(FILTER_OPTIONS, ['budget_management'])
    expect(result.eventTypeOptions).toEqual(['budget.created'])
    expect(result.entityTypeOptions).toEqual(['budget'])
  })

  it('returns union when multiple domains are selected', () => {
    const result = computeFilteredOptions(FILTER_OPTIONS, ['budget_management', 'user_management'])
    expect(result.eventTypeOptions).toEqual(['budget.created', 'user.created'])
    expect(result.entityTypeOptions).toEqual(['budget', 'user'])
  })
})

describe('revalidateSelections', () => {
  it('clears selections no longer valid after domain change', () => {
    const result = revalidateSelections(
      FILTER_OPTIONS,
      ['budget_management'],
      ['budget.created', 'user.created'],
      ['budget', 'user']
    )
    expect(result.eventType).toEqual(['budget.created'])
    expect(result.entityType).toEqual(['budget'])
  })

  it('keeps all selections when no domain is selected', () => {
    const result = revalidateSelections(
      FILTER_OPTIONS,
      [],
      ['budget.created', 'user.created'],
      ['budget']
    )
    expect(result.eventType).toEqual(['budget.created', 'user.created'])
    expect(result.entityType).toEqual(['budget'])
  })

  it('keeps valid selections when multiple domains are selected', () => {
    const result = revalidateSelections(
      FILTER_OPTIONS,
      ['budget_management', 'user_management'],
      ['budget.created', 'user.created'],
      ['budget', 'user']
    )
    expect(result.eventType).toEqual(['budget.created', 'user.created'])
    expect(result.entityType).toEqual(['budget', 'user'])
  })
})

describe('ActivityEventsPage — shared presentation migration', () => {
  it('renders no raw JSON attribute dump and no Popup; expanding a row shows readable attribute rows', async () => {
    activityEventsStore.events = [
      {
        id: '1',
        domain: 'members',
        event_type: 'member_added',
        entity_type: 'user',
        entity_id: 'u1',
        actor_id: 'a1',
        actor_name: 'Admin',
        actor_email: 'admin@x.com',
        attributes: { role: 'viewer' },
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    render(<ActivityEventsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /expand/i }))
    expect(await screen.findByText('viewer')).toBeInTheDocument()
    expect(screen.queryByText(/^\{/)).not.toBeInTheDocument()
    expect(document.querySelector('[role="dialog"]')).not.toBeInTheDocument()
  })

  it('still surfaces actor_id in the expanded row after the migration', async () => {
    activityEventsStore.events = [
      {
        id: '1',
        domain: 'members',
        event_type: 'member_added',
        entity_type: 'user',
        entity_id: 'u1',
        actor_id: 'a1',
        actor_name: 'Admin',
        actor_email: 'admin@x.com',
        attributes: {},
        created_at: '2026-01-01T00:00:00Z',
      },
    ]
    render(<ActivityEventsPage />)
    await userEvent.click(await screen.findByRole('button', { name: /expand/i }))
    expect(await screen.findByText('a1')).toBeInTheDocument()
  })
})
