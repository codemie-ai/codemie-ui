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

import { useState, useEffect, useRef } from 'react'
import {
  Control,
  useFieldArray,
  UseFormTrigger,
  UseFormGetValues,
  Path,
  FormState,
  ArrayPath,
} from 'react-hook-form'

import BasketSvg from '@/assets/icons/delete.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import Spinner from '@/components/Spinner'
import TooltipButton from '@/components/TooltipButton'
import { ButtonType } from '@/constants'
import { GuardrailEntity, GuardrailMode, GuardrailSource } from '@/types/entity/guardrail'
import { cn } from '@/utils/utils'

import GuardrailAssignmentPanelAccordion from './GuardrailAssignmentPanelAccordion'
import GuardrailAssignmentModeSelector from '../selectors/GuardrailAssignmentModeSelector'
import GuardrailAssignmentSourceSelector from '../selectors/GuardrailAssignmentSourceSelector'
import GuardrailSelector from '../selectors/GuardrailSelector'
import { useGuardrailAssignmentPanelData } from './hooks/useGuardrailAssignmentPanelData'
import { useGuardrailPanelValidation } from './hooks/useGuardrailAssignmentPanelValidation'
import {
  GuardrailAssignmentItemSchema,
  GuardrailAssignmentsSchema,
} from './schemas/guardrailAssignmentSchema'
import {
  getFieldError,
  isPresetGuardrail,
  getPresetTooltipMessage,
} from './utils/guardrailAssignmentPanelHelpers'

interface GuardrailAssignmentPanelProps<TFormSchema extends GuardrailAssignmentsSchema> {
  project: string
  entityType: GuardrailEntity
  control: Control<TFormSchema>
  formState: FormState<TFormSchema>
  isEmbedded?: boolean
  trigger: UseFormTrigger<TFormSchema>
  getValues: UseFormGetValues<TFormSchema>
}

const GuardrailAssignmentPanel = <TFormSchema extends GuardrailAssignmentsSchema>({
  project,
  entityType,
  control,
  formState,
  isEmbedded,
  trigger,
  getValues,
}: GuardrailAssignmentPanelProps<TFormSchema>) => {
  const { initialOptions, presetAssignments, excludedGuardrailIds, isLoading } =
    useGuardrailAssignmentPanelData(project, entityType)

  const { fields, append, remove, update } = useFieldArray({
    control,
    keyName: 'fieldId',
    name: 'guardrail_assignments' as ArrayPath<TFormSchema>,
  })

  const typedFields = fields as unknown as Array<
    GuardrailAssignmentItemSchema & { fieldId: string }
  >

  const hasAssignments = presetAssignments.length > 0 || typedFields.length > 0
  const [isAccordionOpen, setIsAccordionOpen] = useState(hasAssignments)

  const { validateCompletedItems } = useGuardrailPanelValidation(trigger, getValues)

  const previousProjectRef = useRef(project)

  useEffect(() => {
    if (previousProjectRef.current !== project) {
      for (let i = fields.length - 1; i >= 0; i -= 1) {
        remove(i)
      }
      previousProjectRef.current = project
    }
  }, [project, fields.length, remove])

  const handleAddConnection = () => {
    append({
      guardrail_id: '',
      mode: GuardrailMode.ALL,
      source: GuardrailSource.INPUT,
      editable: true,
    } as any)
  }

  const handleRemoveConnection = (itemIndex: number) => {
    remove(itemIndex)
    validateCompletedItems()
  }

  const handleGuardrailChange = async (itemIndex: number, value: any[]) => {
    const currentItem = typedFields[itemIndex]
    let newGuardrailId = ''
    let newName = ''

    if (value && value[0]) {
      newGuardrailId = value[0].id
      newName = value[0].name
    }

    update(itemIndex, {
      ...currentItem,
      guardrail_id: newGuardrailId,
      guardrail_name: newName,
    } as any)

    await trigger(`guardrail_assignments.${itemIndex}.guardrail_id` as Path<TFormSchema>)

    if (newGuardrailId && currentItem.mode && currentItem.source) {
      validateCompletedItems()
    }
  }

  const handleSourceChange = async (itemIndex: number, value: GuardrailSource) => {
    const currentItem = typedFields[itemIndex]
    update(itemIndex, {
      ...currentItem,
      source: value,
    } as any)

    await trigger(`guardrail_assignments.${itemIndex}.source` as Path<TFormSchema>)

    if (currentItem.guardrail_id && currentItem.mode && value) {
      validateCompletedItems()
    }
  }

  const handleModeChange = async (itemIndex: number, value: GuardrailMode) => {
    const currentItem = typedFields[itemIndex]
    update(itemIndex, {
      ...currentItem,
      mode: value,
    } as any)

    await trigger(`guardrail_assignments.${itemIndex}.mode` as Path<TFormSchema>)

    if (currentItem.guardrail_id && value && currentItem.source) {
      validateCompletedItems()
    }
  }

  if (!initialOptions.length) {
    return null
  }

  return (
    <GuardrailAssignmentPanelAccordion isOpen={isAccordionOpen} onToggle={setIsAccordionOpen}>
      {isLoading ? (
        <Spinner inline rootClassName="py-8" />
      ) : (
        <>
          <div className="flex justify-between items-center">
            <h5 className="text-xs font-500">Manage connections</h5>
            <Button variant={ButtonType.SECONDARY} onClick={handleAddConnection}>
              <PlusSvg />
              Add
            </Button>
          </div>

          {!!(presetAssignments.length || fields.length) && (
            <div className={cn('flex flex-col gap-2 overflow-y-auto mt-2', isEmbedded && 'gap-4')}>
              {presetAssignments.map((assignment) => {
                const tooltipMessage = getPresetTooltipMessage(entityType)

                return (
                  <div key={assignment.id} className="flex flex-col gap-1">
                    <div className="flex gap-2">
                      <div className={cn('flex gap-2 grow min-w-0', isEmbedded && 'flex-col')}>
                        <GuardrailSelector
                          project={project}
                          value={[{ id: assignment.guardrail_id, name: '' }]}
                          onChange={() => {}}
                          singleValue={true}
                          className="grow min-w-48"
                          errorClassName="text-xs mt-1"
                          initialOptions={initialOptions}
                          disabled
                        />

                        <div className="flex gap-2 min-w-0">
                          <GuardrailAssignmentSourceSelector
                            className={isEmbedded ? 'w-auto min-w-0 flex-1 shrink-0' : ''}
                            value={assignment.source}
                            onChange={() => {}}
                            disabled
                          />

                          <GuardrailAssignmentModeSelector
                            className={isEmbedded ? 'w-auto min-w-0 flex-1 shrink-0' : ''}
                            value={assignment.mode}
                            onChange={() => {}}
                            disabled
                          />
                        </div>
                      </div>

                      <TooltipButton
                        content={tooltipMessage}
                        wrapperClassName={cn(
                          'size-5 min-w-5 mt-1.5 ml-2 opacity-100',
                          isEmbedded && 'min-w-4 size-4'
                        )}
                      />
                    </div>
                  </div>
                )
              })}

              {typedFields.map((item, itemIndex) => {
                if (isPresetGuardrail(item.guardrail_id, presetAssignments)) {
                  return null
                }

                const rowError = getFieldError(
                  `guardrail_assignments.${itemIndex}`,
                  formState.errors
                )

                const guardrailError = getFieldError(
                  `guardrail_assignments.${itemIndex}.guardrail_id`,
                  formState.errors
                )
                const sourceError = getFieldError(
                  `guardrail_assignments.${itemIndex}.source`,
                  formState.errors
                )
                const modeError = getFieldError(
                  `guardrail_assignments.${itemIndex}.mode`,
                  formState.errors
                )

                return (
                  <div key={item.fieldId} className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <div className={cn('flex gap-2 grow min-w-0', isEmbedded && 'flex-col')}>
                        <GuardrailSelector
                          project={project}
                          value={
                            item.guardrail_id
                              ? [{ id: item.guardrail_id, name: item.guardrail_name ?? '' }]
                              : []
                          }
                          onChange={(value) => handleGuardrailChange(itemIndex, value)}
                          singleValue
                          className="grow min-w-48"
                          errorClassName="text-xs mt-1"
                          initialOptions={initialOptions}
                          excludeIds={excludedGuardrailIds}
                          error={guardrailError}
                        />

                        <div className="flex gap-2 min-w-0">
                          <GuardrailAssignmentSourceSelector
                            className={isEmbedded ? 'w-auto min-w-0 flex-1 shrink-0' : ''}
                            value={item.source}
                            onChange={(value) => handleSourceChange(itemIndex, value)}
                            error={sourceError}
                          />

                          <GuardrailAssignmentModeSelector
                            className={isEmbedded ? 'w-auto min-w-0 flex-1 shrink-0' : ''}
                            value={item.mode}
                            onChange={(value) => handleModeChange(itemIndex, value)}
                            error={modeError}
                          />
                        </div>
                      </div>

                      <button
                        type="button"
                        aria-label="Delete connection"
                        onClick={() => handleRemoveConnection(itemIndex)}
                        className={cn(
                          'size-5 min-w-5 mt-1.5 text-text-quaternary hover:text-text-primary transition ml-2',
                          isEmbedded && 'min-w-4 size-4'
                        )}
                      >
                        <BasketSvg className="size-4" />
                      </button>
                    </div>
                    {rowError && <div className="text-failed-secondary text-xs ml-1">{rowError}</div>}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </GuardrailAssignmentPanelAccordion>
  )
}

export default GuardrailAssignmentPanel
