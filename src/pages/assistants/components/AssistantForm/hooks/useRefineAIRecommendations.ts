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
  AssistantAIFieldMarkers,
  AssistantAIRefineFields,
  AssistantContext,
  AssistantToolkit,
  FieldRecommendation,
  RecommendationAction,
} from '@/types/entity/assistant'
import { applyToolRecommendationsToToolkits } from '@/utils/toolkit'

interface UseRefineAIRecommendationsProps {
  toolkits: AssistantToolkit[]
  setToolkits: (toolkits: AssistantToolkit[]) => void
  context: AssistantContext[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setValue: UseFormSetValue<any>
  setAiGeneratedFieldMarkers: (
    markers: AssistantAIFieldMarkers | ((prev: AssistantAIFieldMarkers) => AssistantAIFieldMarkers)
  ) => void
}

export const useRefineAIRecommendations = ({
  toolkits,
  setToolkits,
  context,
  setValue,
  setAiGeneratedFieldMarkers,
}: UseRefineAIRecommendationsProps) => {
  const { assistantCategories, availableToolkits } = useSnapshot(assistantsStore)

  const applyStringField = useCallback(
    (fieldName: string, value: unknown) => {
      if (typeof value === 'string') {
        setValue(fieldName, value, { shouldValidate: true })
        setAiGeneratedFieldMarkers((prev) => ({ ...prev, [fieldName]: true }))
      }
    },
    [setValue, setAiGeneratedFieldMarkers]
  )

  const applyArrayField = useCallback(
    (fieldName: string, value: unknown) => {
      if (Array.isArray(value)) {
        setValue(fieldName, value, { shouldValidate: true })
        setAiGeneratedFieldMarkers((prev) => ({ ...prev, [fieldName]: true }))
      }
    },
    [setValue, setAiGeneratedFieldMarkers]
  )

  const applyFieldRecommendations = useCallback(
    (fields: FieldRecommendation[]) => {
      for (const field of fields) {
        switch (field.name) {
          case 'name':
          case 'description':
          case 'system_prompt':
            applyStringField(field.name, field.recommended)
            break
          case 'conversation_starters':
          case 'categories':
            applyArrayField(field.name, field.recommended)
            break
          default:
            break
        }
      }
    },
    [applyStringField, applyArrayField]
  )

  const applyToolRecommendations = useCallback(
    (tools: Array<{ toolkitName: string; name: string; action: string }>) => {
      setToolkits(
        applyToolRecommendationsToToolkits(toolkits, tools, availableToolkits as AssistantToolkit[])
      )
      setAiGeneratedFieldMarkers((prev) => ({ ...prev, toolkits: true }))
    },
    [toolkits, setToolkits, availableToolkits, setAiGeneratedFieldMarkers]
  )

  const processContextDeletion = useCallback((updatedContext: any[], contextName: string) => {
    const index = updatedContext.findIndex((c) => c.name === contextName)
    if (index !== -1) {
      updatedContext.splice(index, 1)
    }
  }, [])

  const processContextAddition = useCallback((updatedContext: any[], contextName: string) => {
    const contextExists = updatedContext.some((c) => c.name === contextName)
    if (!contextExists) {
      const newContext = { name: contextName, context_type: 'knowledge_base' as any }
      updatedContext.push(newContext)
    }
  }, [])

  const applyContextRecommendations = useCallback(
    (contexts: Array<{ name: string; action: string }>) => {
      const updatedContext = [...(context ?? [])]

      // First, process all DELETE actions
      contexts
        .filter((c) => c.action === RecommendationAction.DELETE)
        .forEach((context) => processContextDeletion(updatedContext, context.name))

      // Then, process all ADD/CHANGE actions
      contexts
        .filter(
          (c) => c.action === RecommendationAction.ADD || c.action === RecommendationAction.CHANGE
        )
        .forEach((context) => processContextAddition(updatedContext, context.name))

      // Apply all changes in one setValue call
      setValue('context', updatedContext, { shouldValidate: true })
      setAiGeneratedFieldMarkers((prev) => ({ ...prev, context: true }))
    },
    [context, setValue, processContextDeletion, processContextAddition, setAiGeneratedFieldMarkers]
  )

  const getRefineFieldValue = useCallback(
    (fieldName: string, refineFields: AssistantAIRefineFields) => {
      switch (fieldName) {
        case 'name':
          return refineFields.name
        case 'description':
          return refineFields.description
        case 'system_prompt':
          return refineFields.system_prompt
        case 'conversation_starters':
          return refineFields.conversation_starters ?? []
        case 'categories':
          return (refineFields.categories ?? []).map(
            (catId) => assistantCategories.find((cat) => cat.id === catId)?.name ?? catId
          )
        default:
          return null
      }
    },
    [assistantCategories]
  )

  const getRefineFieldRecommendation = useCallback(
    (fieldRecommendation: FieldRecommendation, refineFields: AssistantAIRefineFields) => {
      if (fieldRecommendation.action === RecommendationAction.KEEP) {
        return getRefineFieldValue(fieldRecommendation.name, refineFields)
      }

      if (
        fieldRecommendation.name === 'categories' &&
        Array.isArray(fieldRecommendation.recommended)
      ) {
        return fieldRecommendation.recommended.map(
          (catId) => assistantCategories.find((cat) => cat.id === catId)?.name ?? catId
        )
      }
      return fieldRecommendation.recommended
    },
    [getRefineFieldValue, assistantCategories]
  )

  return {
    applyFieldRecommendations,
    applyToolRecommendations,
    applyContextRecommendations,
    getRefineFieldValue,
    getRefineFieldRecommendation,
  }
}
