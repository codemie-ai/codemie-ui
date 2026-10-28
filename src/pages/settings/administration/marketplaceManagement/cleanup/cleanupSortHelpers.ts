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

import type { SortState } from '@/types/table'

/**
 * Maps UI column keys to the backend field names used in `order_by` strings.
 * The `assistant` column stores the assistant name — the backend field is
 * `name`, not `assistant` (EPMCDME-15333).
 */
export const COL_TO_BACKEND: Record<string, string> = {
  users: 'users',
  likes: 'likes',
  assistant: 'name',
}

// Columns whose first sort click goes ascending (A→Z). All others start desc (high→low).
export const FIRST_SORT_ASC = new Set(['assistant'])

/**
 * Pure function: derives the `order_by` query-param string from a `SortState`.
 * Returns `undefined` when the sort is cleared.
 *
 * Applies `COL_TO_BACKEND` so the `assistant` column maps to `name`.
 */
export const computeOrderBy = (sort: SortState): string | undefined =>
  sort.sortKey && sort.sortOrder
    ? `${COL_TO_BACKEND[sort.sortKey] ?? sort.sortKey}_${sort.sortOrder}`
    : undefined

export function sortStateFromOrderBy(orderBy: string | null | undefined): SortState {
  if (!orderBy) return {}
  const lastUnderscore = orderBy.lastIndexOf('_')
  if (lastUnderscore === -1) return {}
  const backendField = orderBy.slice(0, lastUnderscore)
  const order = orderBy.slice(lastUnderscore + 1)
  if (order !== 'asc' && order !== 'desc') return {}
  // Build inverse of COL_TO_BACKEND on each call (map is tiny — 3 entries).
  const backendToCol = Object.fromEntries(
    Object.entries(COL_TO_BACKEND).map(([col, be]) => [be, col])
  )
  const sortKey = backendToCol[backendField] ?? backendField
  // Only seed when the column is actually sortable (present in COL_TO_BACKEND
  // either as a key or as a value).
  const knownKeys = new Set([...Object.keys(COL_TO_BACKEND), ...Object.values(COL_TO_BACKEND)])
  if (!knownKeys.has(backendField) && !knownKeys.has(sortKey)) return {}
  return { sortKey, sortOrder: order }
}
