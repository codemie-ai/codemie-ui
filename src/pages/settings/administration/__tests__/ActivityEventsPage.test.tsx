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
import { describe, it, expect } from 'vitest'

import { ActivityEventFilterOptions } from '@/types/entity/activityEvent'

import { computeFilteredOptions, revalidateSelections } from '../components/activityEventsFilters'

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
