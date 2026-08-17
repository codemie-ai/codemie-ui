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

import isEqual from 'lodash/isEqual'
import isEqualWith from 'lodash/isEqualWith'

import { TableProps } from './Table'

const isPrimitive = (val: any): boolean => {
  return (
    val === null ||
    val === undefined ||
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'boolean'
  )
}

// eslint-disable-next-line consistent-return
const shallowPrimitivesCustomizer = (objValue, othValue) => {
  if (isPrimitive(objValue) && isPrimitive(othValue)) {
    return objValue === othValue
  }
}

function areItemsPrimitiveEqual<T>(a: T[], b: T[]): boolean {
  if (a.length !== b.length) return false

  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < a.length; i++) {
    if (!isEqualWith(a[i], b[i], shallowPrimitivesCustomizer)) return false
  }
  return true
}

// Props compared by reference. Callers are expected to memoize callbacks.
const referenceKeys = [
  'innerPagination',
  'loading',
  'perPageOptions',
  'idPath',
  'customRenderColumns',
  'onSort',
  'onPaginationChange',
  'selected',
  'isAllSelected',
  'onToggleExpand',
  'renderExpandedRow',
  'variant',
] as const satisfies ReadonlyArray<keyof TableProps<unknown>>

// Props compared by value, since callers commonly pass a fresh object/array each render.
const deepKeys = [
  'sort',
  'pagination',
  'columnDefinitions',
  'expandedRowIds',
] as const satisfies ReadonlyArray<keyof TableProps<unknown>>

export const propsAreEqual = <T extends Record<string, unknown>>(
  prevProps: Readonly<TableProps<unknown>>,
  nextProps: Readonly<TableProps<unknown>>
) => {
  if (
    prevProps.items !== nextProps.items &&
    !areItemsPrimitiveEqual(prevProps.items as T[], nextProps.items as T[])
  ) {
    return false
  }

  if (referenceKeys.some((key) => prevProps[key] !== nextProps[key])) return false

  if (deepKeys.some((key) => !isEqual(prevProps[key], nextProps[key]))) return false

  return true
}

// Props deliberately excluded from the comparison above. `items` is compared
// specially at the top of propsAreEqual; the rest are static per call site in
// practice. Listing them explicitly is what makes the guard below meaningful.
const ignoredKeys = [
  'items',
  'embedded',
  'noWrap',
  'footer',
  'className',
  'tableClassName',
  'onSelectRow',
  'onSelectAllChange',
] as const satisfies ReadonlyArray<keyof TableProps<unknown>>

// Exhaustiveness guard. propsAreEqual compares props against an explicit
// whitelist, so any prop missing from all three lists is silently treated as
// "equal" and can block re-renders — a bug that is invisible at runtime.
// If you add a prop to TableProps, add it to referenceKeys, deepKeys, or
// ignoredKeys above, or this line fails to compile.
type ComparedKeys =
  | (typeof referenceKeys)[number]
  | (typeof deepKeys)[number]
  | (typeof ignoredKeys)[number]
type MissingKeys = Exclude<keyof TableProps<unknown>, ComparedKeys>
export type AssertAllPropsHandled<K extends never = MissingKeys> = K
