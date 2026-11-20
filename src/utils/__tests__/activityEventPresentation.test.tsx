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

import {
  getBudgetDifference,
  getEventDisplayLabel,
  getEventTargetLabel,
  getEventActorLabel,
  getEventAttributeRows,
} from '../activityEventPresentation'

describe('getBudgetDifference', () => {
  const base = { event_type: 'budget.updated', created_at: '2026-01-01' }

  it.each([
    ['max_budget', 100, 150, '+$50.00', 'text-success-primary', '▲'],
    ['soft_budget', 150, 100, '-$50.00', 'text-failed-primary', '▼'],
    ['max_budget', 0, 0, '$0.00', 'text-text-primary', ''],
    ['soft_budget', 0, 25, '+$25.00', 'text-success-primary', '▲'],
    ['max_budget', 25, 0, '-$25.00', 'text-failed-primary', '▼'],
    ['soft_budget', 0.3, 0.1 + 0.2, '$0.00', 'text-text-primary', ''],
  ] as const)(
    'formats the %s change from %s to %s',
    (field, before, after, formattedValue, colorClassName, triangle) => {
      expect(
        getBudgetDifference(
          {
            ...base,
            attributes: { [`previous_${field}`]: before, [`new_${field}`]: after },
          },
          field
        )
      ).toMatchObject({ formattedValue, colorClassName, triangle })
    }
  )

  it.each([
    { field: 'max_budget', attributes: undefined },
    { field: 'soft_budget', attributes: null },
    { field: 'max_budget', attributes: {} },
    { field: 'max_budget', attributes: { previous_max_budget: 100 } },
    { field: 'soft_budget', attributes: { new_soft_budget: 100 } },
    {
      field: 'max_budget',
      attributes: { previous_max_budget: null, new_max_budget: 100 },
    },
    {
      field: 'soft_budget',
      attributes: { previous_soft_budget: '100', new_soft_budget: 150 },
    },
    {
      field: 'max_budget',
      attributes: { previous_max_budget: NaN, new_max_budget: 150 },
    },
    {
      field: 'soft_budget',
      attributes: { previous_soft_budget: 100, new_soft_budget: Infinity },
    },
    {
      field: 'max_budget',
      attributes: { previous_max_budget: -Number.MAX_VALUE, new_max_budget: Number.MAX_VALUE },
    },
  ] as const)(
    'does not calculate a difference for invalid values: $attributes',
    ({ field, attributes }) => {
      expect(getBudgetDifference({ ...base, attributes }, field)).toBeNull()
    }
  )
})

describe('activityEventPresentation', () => {
  it('falls back to a humanized event_type when label is missing (old ActivityEvent shape)', () => {
    expect(
      getEventDisplayLabel({ event_type: 'member_role_changed', created_at: '2026-01-01' })
    ).toBe('Member role changed')
  })

  it('prefers entity_label, falls back to entity_type/entity_id, then em dash', () => {
    expect(
      getEventTargetLabel({ event_type: 'x', entity_label: 'Budget A', created_at: '2026-01-01' })
    ).toBe('Budget A')
    expect(
      getEventTargetLabel({
        event_type: 'x',
        entity_type: 'budget',
        entity_id: 'b-1',
        created_at: '2026-01-01',
      })
    ).toBe('budget b-1')
    expect(getEventTargetLabel({ event_type: 'x', created_at: '2026-01-01' })).toBe('—')
  })

  it('renders actor_name/actor_email from the event itself, never a lookup, falling back to "system"', () => {
    expect(
      getEventActorLabel({
        event_type: 'x',
        actor_name: 'Jane',
        actor_email: 'jane@x.com',
        created_at: '2026-01-01',
      })
    ).toBe('Jane (jane@x.com)')
    expect(getEventActorLabel({ event_type: 'x', created_at: '2026-01-01' })).toBe('system')
  })

  it('formats currency-shaped attribute keys with formatCurrency and never dumps raw JSON', () => {
    const rows = getEventAttributeRows({
      event_type: 'unknown_future_event',
      attributes: { max_budget: 120.5, changed_at: '2026-01-01T00:00:00Z', note: 'ok' },
      created_at: '2026-01-01',
    })
    expect(rows).toEqual([
      { label: 'Max budget', value: '$120.50' },
      { label: 'Changed at', value: expect.any(String) },
      { label: 'Note', value: 'ok' },
    ])
  })

  it('returns an empty array, not a placeholder, when there are no attributes', () => {
    expect(getEventAttributeRows({ event_type: 'x', created_at: '2026-01-01' })).toEqual([])
  })

  it('falls back to entity_type alone when entity_id/entity_label are absent', () => {
    expect(
      getEventTargetLabel({ event_type: 'x', entity_type: 'budget', created_at: '2026-01-01' })
    ).toBe('budget')
  })

  it('does not format non-monetary keys containing "limit" or "cost" substrings as currency', () => {
    const rows = getEventAttributeRows({
      event_type: 'x',
      attributes: { retry_limit: 3, cost_center_id: 42 },
      created_at: '2026-01-01',
    })
    expect(rows).toEqual([
      { label: 'Retry limit', value: '3' },
      { label: 'Cost center id', value: '42' },
    ])
  })

  it('renders a nested object attribute as readable key/value pairs, never raw JSON', () => {
    const rows = getEventAttributeRows({
      event_type: 'x',
      attributes: { budget_change: { old_limit: 100, new_limit: 200 } },
      created_at: '2026-01-01',
    })
    expect(rows).toEqual([{ label: 'Budget change', value: 'Old limit: 100, New limit: 200' }])
    expect(rows[0].value).not.toMatch(/^\{/)
  })

  it('appends an actor_id row when present and no entity_label', () => {
    const rows = getEventAttributeRows({
      event_type: 'x',
      actor_id: 'user-42',
      created_at: '2026-01-01',
    })
    expect(rows).toEqual([{ label: 'Actor ID', value: 'user-42' }])
  })

  it('does not format an _id-suffixed key as currency even when it contains amount/budget/spend', () => {
    const rows = getEventAttributeRows({
      event_type: 'x',
      attributes: { budget_id: 42 },
      created_at: '2026-01-01',
    })
    expect(rows).toEqual([{ label: 'Budget id', value: '42' }])
  })

  it('falls back to the raw value when a date-hinted key holds an unparseable string', () => {
    const rows = getEventAttributeRows({
      event_type: 'x',
      attributes: { changed_at: 'not-a-date' },
      created_at: '2026-01-01',
    })
    expect(rows).toEqual([{ label: 'Changed at', value: 'not-a-date' }])
  })

  it('formats a numeric epoch value for a date-hinted key instead of printing the raw number', () => {
    const rows = getEventAttributeRows({
      event_type: 'x',
      attributes: { changed_at: 1700000000000 },
      created_at: '2026-01-01',
    })
    expect(rows[0].value).not.toBe('1700000000000')
    expect(rows[0].value).not.toBe('Invalid DateTime')
  })
})
