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

import { FilterOption } from '@/types/filters'
import { formatProjectLabel } from '@/utils/projectDisplayName'

import { useProjectDisplayNames } from './useProjectDisplayNames'

/**
 * Ensures a persisted/URL-selected project that isn't in `projectOptions`
 * (e.g. an admin-visible project outside the current user's roster) still
 * resolves to the `tech_name (display_name)` label after a page refresh.
 */
export const useResolvedProjectOptions = (
  projectOptions: FilterOption[],
  selectedProjects: string[]
): FilterOption[] => {
  const projectDisplayNames = useProjectDisplayNames(selectedProjects)

  return useMemo(() => {
    const existing = new Set(projectOptions.map((option) => option.value))
    const extras = selectedProjects
      .filter((name): name is string => !!name && !existing.has(name))
      .map((name) => ({
        label: formatProjectLabel({ name, display_name: projectDisplayNames.get(name) }),
        value: name,
      }))
    return [...projectOptions, ...extras]
  }, [projectOptions, selectedProjects, projectDisplayNames])
}
