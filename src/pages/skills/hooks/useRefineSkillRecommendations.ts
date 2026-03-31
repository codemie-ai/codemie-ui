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

import { useCallback } from 'react'
import { UseFormSetValue } from 'react-hook-form'
import { useSnapshot } from 'valtio'

import { assistantsStore } from '@/store'
import {
  AssistantToolkit,
  FieldRecommendation,
  RecommendationAction,
} from '@/types/entity/assistant'
import { SkillAIFieldMarkers, SkillAIRefineFields } from '@/types/entity/skill'
import { applyToolRecommendationsToToolkits } from '@/utils/toolkit'

import { SkillFormData } from './useSkillForm'

interface UseRefineSkillRecommendationsProps {
  toolkits: AssistantToolkit[]
  setValue: UseFormSetValue<SkillFormData>
  setAiGeneratedFieldMarkers: (
    markers: SkillAIFieldMarkers | ((prev: SkillAIFieldMarkers) => SkillAIFieldMarkers)
  ) => void
}

export const useRefineSkillRecommendations = ({
  toolkits,
  setValue,
  setAiGeneratedFieldMarkers,
}: UseRefineSkillRecommendationsProps) => {
  const { availableToolkits } = useSnapshot(assistantsStore)

  const applyFieldRecommendations = useCallback(
    (fields: FieldRecommendation[]) => {
      for (const field of fields) {
        switch (field.name) {
          case 'name':
          case 'description':
            if (typeof field.recommended === 'string') {
              setValue(field.name, field.recommended, { shouldValidate: true, shouldDirty: true })
              setAiGeneratedFieldMarkers((prev) => ({ ...prev, [field.name]: true }))
            }
            break
          case 'instructions':
            if (typeof field.recommended === 'string') {
              setValue('content', field.recommended, { shouldValidate: true, shouldDirty: true })
              setAiGeneratedFieldMarkers((prev) => ({ ...prev, instructions: true }))
            }
            break
          case 'categories':
            if (Array.isArray(field.recommended)) {
              setValue('categories', field.recommended, {
                shouldValidate: true,
                shouldDirty: true,
              })
              setAiGeneratedFieldMarkers((prev) => ({ ...prev, categories: true }))
            }
            break
          default:
            break
        }
      }
    },
    [setValue, setAiGeneratedFieldMarkers]
  )

  const applyToolRecommendations = useCallback(
    (tools: Array<{ toolkitName: string; name: string; action: string }>) => {
      setValue(
        'toolkits',
        applyToolRecommendationsToToolkits(
          toolkits,
          tools,
          availableToolkits as AssistantToolkit[]
        ),
        { shouldDirty: true }
      )
      setAiGeneratedFieldMarkers((prev) => ({ ...prev, toolkits: true }))
    },
    [toolkits, setValue, availableToolkits, setAiGeneratedFieldMarkers]
  )

  const getRefineFieldValue = useCallback(
    (fieldName: string, refineFields: SkillAIRefineFields): string | string[] | null => {
      switch (fieldName) {
        case 'name':
          return refineFields.name ?? null
        case 'description':
          return refineFields.description ?? null
        case 'instructions':
          return refineFields.instructions ?? null
        case 'categories':
          return refineFields.categories ?? []
        default:
          return null
      }
    },
    []
  )

  const getRefineFieldRecommendation = useCallback(
    (
      fieldRecommendation: FieldRecommendation,
      refineFields: SkillAIRefineFields
    ): string | string[] | null => {
      if (fieldRecommendation.action === RecommendationAction.KEEP) {
        return getRefineFieldValue(fieldRecommendation.name, refineFields)
      }
      return fieldRecommendation.recommended ?? null
    },
    [getRefineFieldValue]
  )

  return {
    applyFieldRecommendations,
    applyToolRecommendations,
    getRefineFieldValue,
    getRefineFieldRecommendation,
  }
}
