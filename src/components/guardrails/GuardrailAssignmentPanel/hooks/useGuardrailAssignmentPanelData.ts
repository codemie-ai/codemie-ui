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

import { useEffect, useState } from 'react'

import { guardrailStore } from '@/store/guardrail'
import { GuardrailAssignment, GuardrailEntity } from '@/types/entity/guardrail'

import { GuardrailSelectorOption } from '../../selectors/GuardrailSelector'
import { filterPresetAssignments } from '../utils/guardrailAssignmentPanelHelpers'

export const useGuardrailAssignmentPanelData = (project: string, entityType: GuardrailEntity) => {
  const [initialOptions, setInitialOptions] = useState<GuardrailSelectorOption[]>([])
  const [presetAssignments, setPresetAssignments] = useState<GuardrailAssignment[]>([])
  const [excludedGuardrailIds, setExcludedGuardrailIds] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [guardrailsResponse, assignmentsResponse] = await Promise.all([
          guardrailStore.fetchGuardrails({ project }, 0, 10000),
          guardrailStore.fetchEntityAssignments(project, entityType),
        ])

        const finalAssignments = filterPresetAssignments(assignmentsResponse)

        setPresetAssignments(finalAssignments)

        const excludedIds = finalAssignments.map((a) => a.guardrail_id)
        setExcludedGuardrailIds(excludedIds)

        const formattedOptions: GuardrailSelectorOption[] = guardrailsResponse.data.map(
          (guardrail) => ({
            id: guardrail.guardrailId,
            name: guardrail.name,
          })
        )
        setInitialOptions(formattedOptions)
      } catch (error) {
        console.error('Error fetching data:', error)
        setInitialOptions([])
        setPresetAssignments([])
      } finally {
        setIsLoading(false)
      }
    }

    if (project) {
      fetchData()
    }
  }, [project, entityType])

  return {
    initialOptions,
    presetAssignments,
    excludedGuardrailIds,
    isLoading,
  }
}
