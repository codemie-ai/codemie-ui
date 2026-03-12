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

import { User } from '@/types/entity/user'
import { FilterOption } from '@/types/filters'
import { getCredentialUIMapping, getOriginalCredentialType } from '@/utils/settings'

interface UseIntegrationTypeOptionsParams {
  settingType: string
  user: User | null
  checkIfAdminOfAnyProject?: boolean
}

/**
 * Custom hook to generate integration type filter options
 * Returns sorted array of type options with label and value
 */
export const useIntegrationTypeOptions = ({
  settingType,
  user,
  checkIfAdminOfAnyProject = false,
}: UseIntegrationTypeOptionsParams): FilterOption[] => {
  return useMemo(() => {
    const mapping = getCredentialUIMapping({
      settingType,
      user,
      checkIfAdminOfAnyProject,
    })
    return Object.keys(mapping)
      .sort((a, b) => {
        return a.localeCompare(b)
      })
      .map((key) => ({
        label: mapping[key]?.displayName || getOriginalCredentialType(key),
        value: getOriginalCredentialType(key),
      }))
  }, [settingType, user, checkIfAdminOfAnyProject])
}
