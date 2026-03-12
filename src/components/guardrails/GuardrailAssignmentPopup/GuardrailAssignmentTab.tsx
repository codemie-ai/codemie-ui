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

import { FC } from 'react'
import { useFieldArray } from 'react-hook-form'

import BasketSvg from '@/assets/icons/delete.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Button from '@/components/Button'
import { GuardrailEntity, GuardrailMode, GuardrailSource } from '@/types/entity/guardrail'

import GuardrailAssignmentEntitySelector from './GuardrailAssignmentEntitySelector'
import { GuardrailAssignmentHeader } from './GuardrailAssignmentHeader'
import { GuardrailAssignmentSettings } from './GuardrailAssignmentSettings'
import { useGuardrailAssignmentFormContext } from './hooks/useGuardrailAssignmentFormContext'
import { GuardrailAssignmentOptions } from './hooks/useGuardrailAssignmentOptions'
import {
  getItemsPath,
  getSettingsPath,
  GUARDRAIL_ENTITY_FORM_KEYS,
} from './utils/guardrailAssignmentUtils'

interface GuardrailAssignmentTabProps {
  entity: Exclude<GuardrailEntity, GuardrailEntity.PROJECT>
  project: string
  initialOptions: GuardrailAssignmentOptions
}

export const GuardrailAssignmentTab: FC<GuardrailAssignmentTabProps> = ({
  entity,
  project,
  initialOptions,
}) => {
  const { isProjectLevelEnabled, control, watch, validateDuplicates } =
    useGuardrailAssignmentFormContext()

  const itemsPath = getItemsPath(entity)
  const isEntityLevelEnabled = !!watch(getSettingsPath(entity))?.length

  const { fields, append, remove, update } = useFieldArray({
    control,
    keyName: 'fieldId',
    name: `${GUARDRAIL_ENTITY_FORM_KEYS[entity]}.items`,
  })

  const handleAddConnection = () => {
    append({ id: '', settings: { mode: GuardrailMode.ALL, source: GuardrailSource.INPUT } })
    validateDuplicates(itemsPath)
  }

  const handleRemoveConnection = (itemIndex: number) => {
    remove(itemIndex)
    validateDuplicates(itemsPath)
  }

  const shouldHideConnections = isProjectLevelEnabled || isEntityLevelEnabled

  return (
    <div className="h-full flex flex-col">
      <GuardrailAssignmentHeader entity={entity} disabled={isProjectLevelEnabled} />

      {!shouldHideConnections && (
        <>
          <div className="mt-4 mb-2 flex justify-between items-center">
            <h5 className="text-xs font-500">Manage connections</h5>
            <Button variant="secondary" onClick={handleAddConnection}>
              <PlusSvg />
              Add
            </Button>
          </div>

          <div className="flex flex-col gap-2 overflow-y-auto show-scroll grow min-h-32">
            {fields.map((item, itemIndex) => {
              const formKey = itemsPath.split('.')[0]
              const itemErrors = control._formState.errors?.[formKey]?.items?.[itemIndex]
              const rowError = itemErrors?.message ?? itemErrors?.root?.message

              return (
                <div key={item.fieldId} className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <GuardrailAssignmentEntitySelector
                      entity={entity}
                      initialOptions={initialOptions}
                      isEntityLevelEnabled={isEntityLevelEnabled}
                      project={project}
                      item={item}
                      itemIndex={itemIndex}
                      updateItem={update}
                    />

                    <GuardrailAssignmentSettings
                      entity={entity}
                      itemIndex={itemIndex}
                      disabled={false}
                    />

                    <button
                      type="button"
                      aria-label="Delete connection"
                      className="-ml-1 h-5 min-w-8 mt-1.5 text-text-quaternary hover:text-text-primary transition"
                      onClick={() => handleRemoveConnection(itemIndex)}
                    >
                      <BasketSvg className="size-4 mb-px mx-auto" />
                    </button>
                  </div>
                  {rowError && <div className="text-failed-secondary text-xs ml-1">{rowError}</div>}
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}
