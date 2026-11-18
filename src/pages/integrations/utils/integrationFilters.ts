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

import { BoundTypes } from '@/hooks/useIntegrationTypeOptions'
import { cleanObject } from '@/utils/helpers'
import {
  IntegrationScope,
  SCOPE_ALL,
  SCOPE_LABEL,
  ScopeFilterValue,
  scopeFilterParam,
} from '@/utils/integrationScope'
import { getTypeScopeBinding } from '@/utils/settings'

type Filters = Record<string, unknown>

/** Splits the selected types into those available at `scope` and those bound to the other one. */
function splitTypesByScope(filters: Filters, scope: ScopeFilterValue) {
  const types = Array.isArray(filters.type) ? (filters.type as string[]) : []
  const isBoundElsewhere = (type: string) => {
    const binding = getTypeScopeBinding(type)
    return scope !== SCOPE_ALL && !!binding && binding !== scope
  }
  return {
    kept: types.filter((type) => !isBoundElsewhere(type)),
    removed: types.filter(isBoundElsewhere),
  }
}

function removedTypesNotice(removed: string[], boundTypes: BoundTypes): string | null {
  if (!removed.length) return null
  const labels = removed.map((type) => boundTypes[type]?.label ?? type).join(', ')
  const where = SCOPE_LABEL[getTypeScopeBinding(removed[0])!]
  return removed.length === 1
    ? `${labels} was removed from Type: it exists only at ${where} scope.`
    : `${labels} were removed from Type: they exist only at ${where} scope.`
}

/** Filters after a Scope change: Global and Created by are cleared, types bound elsewhere dropped. */
export function applyScopeChange(
  filters: Filters,
  next: ScopeFilterValue,
  boundTypes: BoundTypes
): { filters: Filters; notice: string | null } {
  const { is_global: _global, created_by: _createdBy, ...rest } = filters
  const { kept, removed } = splitTypesByScope(rest, next)
  return {
    filters: { ...rest, type: kept, scope: scopeFilterParam(next) },
    notice: removedTypesNotice(removed, boundTypes),
  }
}

/**
 * Restored filters (address or storage) can hold a type bound to another scope than the one
 * shown. Returns the filters without those types, or null when there is nothing to drop.
 */
export function dropTypesBoundElsewhere(filters: Filters, scope: ScopeFilterValue): Filters | null {
  const { kept, removed } = splitTypesByScope(filters, scope)
  return removed.length ? { ...filters, type: kept } : null
}

/** Filters for the API request: no scope, no empty values; is_global/created_by only while offered. */
export function toRequestFilters(
  filters: Filters,
  scope: { visible: boolean; value: ScopeFilterValue }
): Filters {
  const { scope: _scope, is_global: isGlobal, created_by: createdBy, ...rest } = filters
  const offersGlobal = !scope.visible || scope.value === IntegrationScope.USER
  const offersCreatedBy = scope.value === IntegrationScope.PROJECT
  return cleanObject({
    ...rest,
    is_global: offersGlobal ? isGlobal : null,
    created_by: offersCreatedBy ? createdBy : null,
  })
}
