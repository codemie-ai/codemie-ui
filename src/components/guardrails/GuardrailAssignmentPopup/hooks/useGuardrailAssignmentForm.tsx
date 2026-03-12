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

import { yupResolver } from '@hookform/resolvers/yup'
import { useEffect, useState } from 'react'
import { FieldErrors, Path, useForm } from 'react-hook-form'

import { guardrailStore } from '@/store/guardrail'
import { GuardrailAssignmentResponse, GuardrailSettings } from '@/types/entity/guardrail'

import {
  EntityAssignmentFormItem,
  GuardrailAssignmentFormKeys,
  guardrailAssignmentformSchema,
  GuardrailAssignmentFormValues,
} from '../schemas/guardrailAssignmentSchema'
import { GUARDRAIL_DUPLICATE_TEST_TYPE } from '../schemas/guardrailAssignmentSchemaUtils'
import {
  flattenGuardrailAssignmentItems,
  isValidGuardrailAssignmentSettings,
  unflattenGuardrailAssignmentItems,
} from '../utils/guardrailAssignmentUtils'

interface UseGuardrailAssignmentFormProps {
  visible: boolean
  guardrailId?: string
  hidePopup: () => void
  setIsLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  submitErrorHandler: (errors: FieldErrors<GuardrailAssignmentFormValues>) => void
}

export const useGuardrailAssignmentForm = ({
  visible,
  guardrailId,
  hidePopup,
  setIsLoading,
  setError,
  submitErrorHandler,
}: UseGuardrailAssignmentFormProps) => {
  const [assignments, setAssignments] = useState<GuardrailAssignmentResponse | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { handleSubmit, ...methods } = useForm<GuardrailAssignmentFormValues>({
    mode: 'all',
    resolver: yupResolver(guardrailAssignmentformSchema) as any,
  })

  const { reset, watch, getValues, getFieldState, clearErrors } = methods

  const validateDuplicates = (itemsPath: Path<GuardrailAssignmentFormValues>) => {
    const values = getValues()
    const isProjectEnabled = !!(values.project?.settings && values.project.settings.length > 0)

    if (isProjectEnabled) return

    const pathParts = itemsPath.split('.')
    const entityKey = pathParts[0] as Exclude<
      GuardrailAssignmentFormKeys,
      GuardrailAssignmentFormKeys.project
    >
    const items = values[entityKey]?.items ?? []

    const isEntityEnabled = !!(
      values[entityKey]?.settings && values[entityKey]!.settings!.length > 0
    )

    if (isEntityEnabled) return

    items.forEach((_, index) => {
      const itemsFieldPath = `${itemsPath}.${index}` as Path<GuardrailAssignmentFormValues>
      if (getFieldState(itemsFieldPath).error?.type === GUARDRAIL_DUPLICATE_TEST_TYPE) {
        clearErrors(itemsFieldPath)
      }
    })

    const seen = new Map<string, number[]>()
    items.forEach((item, index) => {
      if (!item.id || !item.settings.mode || !item.settings.source) return

      const key = `${item.id}|${item.settings.mode}|${item.settings.source}`

      if (!seen.has(key)) seen.set(key, [])
      seen.get(key)!.push(index)
    })

    seen.forEach((indices) => {
      if (indices.length > 1) {
        indices.forEach((index) => {
          methods.setError(`${itemsPath}.${index}` as any, {
            type: GUARDRAIL_DUPLICATE_TEST_TYPE,
            message: 'Connection with these parameters already exists',
          })
        })
      }
    })
  }

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        if (!visible || !guardrailId) return

        setError(null)
        setIsLoading(true)
        setAssignments(null)

        const fetchedAssignments = await guardrailStore.fetchGuardrailAssignments(guardrailId)

        setAssignments(fetchedAssignments)

        reset({
          project: fetchedAssignments.project,
          assistants: {
            settings: fetchedAssignments.assistants?.settings,
            items: flattenGuardrailAssignmentItems(fetchedAssignments.assistants?.items),
          },
          workflows: {
            settings: fetchedAssignments.workflows?.settings,
            items: flattenGuardrailAssignmentItems(fetchedAssignments.workflows?.items),
          },
          datasources: {
            settings: fetchedAssignments.datasources?.settings,
            items: flattenGuardrailAssignmentItems(fetchedAssignments.datasources?.items),
          },
        })
      } catch (error: any) {
        setError(error.message ?? 'Failed to load guardrail assignments')
        setIsLoading(false)
      }
    }

    loadAssignments()
  }, [visible, guardrailId])

  const submitHandler = async () => {
    if (!guardrailId) return

    const values = getValues()
    setIsSubmitting(true)

    try {
      const filterItemsWithId = (items?: EntityAssignmentFormItem[]) => {
        return items?.filter((item) => item.id && item.id.trim() !== '') ?? []
      }

      type SettingsArray = NonNullable<GuardrailAssignmentFormValues['project']>['settings']
      const filterSettings = (settings?: SettingsArray): GuardrailSettings[] => {
        return settings?.filter(isValidGuardrailAssignmentSettings) ?? []
      }

      await guardrailStore.saveGuardrailAssignments(guardrailId, {
        project: {
          settings: filterSettings(values.project?.settings),
        },
        assistants: {
          settings: filterSettings(values.assistants?.settings),
          items: unflattenGuardrailAssignmentItems(filterItemsWithId(values.assistants?.items)),
        },
        workflows: {
          settings: filterSettings(values.workflows?.settings),
          items: unflattenGuardrailAssignmentItems(filterItemsWithId(values.workflows?.items)),
        },
        datasources: {
          settings: filterSettings(values.datasources?.settings),
          items: unflattenGuardrailAssignmentItems(filterItemsWithId(values.datasources?.items)),
        },
      })

      hidePopup()
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    assignments,
    isSubmitting,
    isProjectLevelEnabled: !!watch('project.settings')?.[0],
    validateDuplicates,

    handleSubmit: handleSubmit(submitHandler, submitErrorHandler),
    ...methods,
  }
}
