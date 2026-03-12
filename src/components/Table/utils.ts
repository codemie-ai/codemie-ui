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

  if (!isEqual(prevProps.sort, nextProps.sort)) return false
  if (prevProps.innerPagination !== nextProps.innerPagination) return false
  if (prevProps.loading !== nextProps.loading) return false
  if (!isEqual(prevProps.pagination, nextProps.pagination)) return false
  if (prevProps.perPageOptions !== nextProps.perPageOptions) return false
  if (prevProps.idPath !== nextProps.idPath) return false
  if (!isEqual(prevProps.columnDefinitions, nextProps.columnDefinitions)) return false
  if (prevProps.customRenderColumns !== nextProps.customRenderColumns) return false
  if (prevProps.onSort !== nextProps.onSort) return false
  if (prevProps.onPaginationChange !== nextProps.onPaginationChange) return false
  return true
}
