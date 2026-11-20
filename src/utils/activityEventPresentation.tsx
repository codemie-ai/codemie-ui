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

import { formatCurrency } from '@/utils/currency'
import { formatDate } from '@/utils/helpers'

/**
 * Structural shape shared by both the project-activity-events store's `ActivityEventListItem`
 * and the older `ActivityEvent` type. Presentation helpers depend only on this shape so they
 * work with either type without either one needing to change.
 */
export interface PresentableActivityEvent {
  event_type: string
  label?: string
  category?: string
  entity_type?: string
  entity_id?: string
  entity_label?: string
  actor_name?: string
  actor_email?: string
  actor_id?: string
  attributes?: Record<string, unknown> | null
  created_at: string
}

const AMOUNT_KEY_HINT = /(^|_)(amount|budget|spend)($|_)/i
const DATE_KEY_HINT = /(_at$|date|timestamp)/i
const ID_KEY_SUFFIX = /_id$/i

function humanizeKey(key: string): string {
  const words = key.replace(/_/g, ' ').trim()
  return words.charAt(0).toUpperCase() + words.slice(1)
}

export function getEventDisplayLabel(event: PresentableActivityEvent): string {
  return event.label?.trim() || humanizeKey(event.event_type)
}

export function getEventTargetLabel(event: PresentableActivityEvent): string {
  if (event.entity_label) return event.entity_label
  if (event.entity_type && event.entity_id) return `${event.entity_type} ${event.entity_id}`
  if (event.entity_id) return event.entity_id
  if (event.entity_type) return event.entity_type
  return '—'
}

export function getEventActorLabel(event: PresentableActivityEvent): string {
  if (event.actor_name && event.actor_email) return `${event.actor_name} (${event.actor_email})`
  return event.actor_name || event.actor_email || 'system'
}

function formatDateHintValue(value: string | number): string {
  const dateValue = typeof value === 'number' ? new Date(value).toISOString() : value
  const formatted = formatDate(dateValue)
  return formatted === 'Invalid DateTime' ? String(value) : formatted
}

function formatAttributeValue(key: string, value: unknown): string {
  if (typeof value === 'number' && AMOUNT_KEY_HINT.test(key) && !ID_KEY_SUFFIX.test(key)) {
    return formatCurrency(value)
  }
  if ((typeof value === 'string' || typeof value === 'number') && DATE_KEY_HINT.test(key)) {
    return formatDateHintValue(value)
  }
  if (value === null || value === undefined) return '—'
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => formatAttributeValue(key, item)).join(', ') : '—'
  }
  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (!entries.length) return '—'
    return entries
      .map(
        ([nestedKey, nestedValue]) =>
          `${humanizeKey(nestedKey)}: ${formatAttributeValue(nestedKey, nestedValue)}`
      )
      .join(', ')
  }
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return value.toString()
  return '—'
}

export function getEventAttributeRows(
  event: PresentableActivityEvent
): Array<{ label: string; value: string }> {
  const rows = Object.entries(event.attributes ?? {}).map(([key, value]) => ({
    label: humanizeKey(key),
    value: formatAttributeValue(key, value),
  }))
  if (event.actor_id) rows.push({ label: 'Actor ID', value: event.actor_id })
  return rows
}

export interface BudgetDifferenceInfo {
  difference: number
  sign: '+' | '-' | ''
  colorClassName: string
  triangle: string
  formattedValue: string
}

export function getBudgetDifference(
  event: PresentableActivityEvent,
  field: 'max_budget' | 'soft_budget'
): BudgetDifferenceInfo | null {
  const before = event.attributes?.[`previous_${field}`]
  const after = event.attributes?.[`new_${field}`]
  if (typeof before !== 'number' || !Number.isFinite(before)) return null
  if (typeof after !== 'number' || !Number.isFinite(after)) return null

  const rawDifference = after - before
  if (!Number.isFinite(rawDifference)) return null
  // Match the displayed currency precision so rounding noise cannot show a signed zero.
  const difference = Number(rawDifference.toFixed(2))
  let sign: BudgetDifferenceInfo['sign'] = ''
  let colorClassName = 'text-text-primary'
  let triangle = ''
  if (difference > 0) {
    sign = '+'
    colorClassName = 'text-success-primary'
    triangle = '▲'
  } else if (difference < 0) {
    sign = '-'
    colorClassName = 'text-failed-primary'
    triangle = '▼'
  }
  return {
    difference,
    sign,
    colorClassName,
    triangle,
    formattedValue: `${sign}${formatCurrency(Math.abs(difference))}`,
  }
}
