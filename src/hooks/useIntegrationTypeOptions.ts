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

import { useMemo } from 'react'
import { useSnapshot } from 'valtio'

import { OAUTH_VARIANT_CREDENTIAL_TYPES } from '@/constants/integration'
import { appInfoStore } from '@/store/appInfo'
import { userStore } from '@/store/user'
import { FilterOption } from '@/types/filters'
import {
  IntegrationScope,
  SCOPE_ALL,
  SCOPE_LABEL,
  ScopeFilterValue,
} from '@/utils/integrationScope'
import {
  getCredentialUIMapping,
  getOriginalCredentialType,
  getTypeScopeBinding,
  SETTING_TYPE_PROJECT,
  SETTING_TYPE_USER,
} from '@/utils/settings'
import { canUseProjectScope } from '@/utils/user'

export type BoundTypes = Record<string, { scope: IntegrationScope; label: string }>

const BADGE: Record<IntegrationScope, string> = {
  [IntegrationScope.USER]: 'User only',
  [IntegrationScope.PROJECT]: 'Project only',
}

/**
 * Type filter options for the unified Integrations list: every type the person can see across
 * both scopes (project scope only when they can use it), tagged when bound to one scope and
 * disabled when bound to the scope other than the selected one. Values are serverEnums.
 */
export const useIntegrationTypeOptions = (
  scope: ScopeFilterValue
): { options: FilterOption[]; boundTypes: BoundTypes } => {
  const { configs } = useSnapshot(appInfoStore)
  const { user } = useSnapshot(userStore)

  return useMemo(() => {
    const base = { user, checkIfAdminOfAnyProject: true }
    const mapping = {
      ...getCredentialUIMapping({
        ...base,
        settingType: SETTING_TYPE_USER,
        customerConfig: configs,
      }),
      ...(canUseProjectScope(base.user)
        ? getCredentialUIMapping({
            ...base,
            settingType: SETTING_TYPE_PROJECT,
            customerConfig: configs,
          })
        : {}),
    }
    const boundTypes: BoundTypes = {}
    const options = Object.keys(mapping)
      // EPMCDME-14586/14587: OAuth variants fold into their base type's serverEnum, so including
      // them here would emit a duplicate filter option (e.g. jiraoauth -> 'Jira' alongside jira).
      .filter((key) => !OAUTH_VARIANT_CREDENTIAL_TYPES.has(key))
      .sort((a, b) => a.localeCompare(b))
      .map((key): FilterOption => {
        const value = getOriginalCredentialType(key)
        const label = mapping[key]?.displayName || value
        const binding = getTypeScopeBinding(value)
        if (!binding) return { label, value }
        boundTypes[value] = { scope: binding, label }
        const option: FilterOption = { label, value, badge: BADGE[binding] }
        if (scope !== SCOPE_ALL && scope !== binding) {
          option.disabled = true
          option.hint = `Not available at ${SCOPE_LABEL[scope]} scope`
        }
        return option
      })
    return { options, boundTypes }
  }, [scope, user, configs])
}
