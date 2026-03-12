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
import { Path } from 'react-hook-form'

import InfoBox from '@/components/form/InfoBox'
import Switch from '@/components/form/Switch'
import { GuardrailEntity, GuardrailMode, GuardrailSource } from '@/types/entity/guardrail'

import { guardrailAssignmentEntityHumanized } from './GuardrailAssignmentPopup'
import {
  GuardrailAssignmentSettings,
  GuardrailAssignmentSettingsProps,
} from './GuardrailAssignmentSettings'
import { useGuardrailAssignmentFormContext } from './hooks/useGuardrailAssignmentFormContext'
import { GuardrailAssignmentFormValues } from './schemas/guardrailAssignmentSchema'
import {
  getItemsPath,
  getSettingsPath,
  GUARDRAIL_ENTITY_FORM_KEYS,
} from './utils/guardrailAssignmentUtils'

interface GuardrailAssignmentHeaderProps extends GuardrailAssignmentSettingsProps {
  entity: GuardrailEntity
  disabled?: boolean
}

export const GuardrailAssignmentHeader: FC<GuardrailAssignmentHeaderProps> = ({
  entity,
  disabled = false,
  ...settingsProps
}) => {
  const { watch, setValue, clearErrors, getValues } = useGuardrailAssignmentFormContext()
  const humanizedEntityName = guardrailAssignmentEntityHumanized[entity]

  const label = `Apply to all project ${humanizedEntityName}`

  let description: string
  if (entity === GuardrailEntity.PROJECT) {
    description =
      'When enabled, this guardrail will automatically apply to all assistants, workflows and data sources within the project.'
  } else if (entity === GuardrailEntity.KNOWLEDGEBASE) {
    description = `When enabled, this guardrail will automatically apply to all newly created Data Sources. To apply it to existing Data Sources, re-indexing is required.`
  } else {
    description = `When enabled, this guardrail will automatically apply to all ${humanizedEntityName}.`
  }

  const settingsPath = getSettingsPath(entity)
  const isSwitchEnabled = !!watch(settingsPath)?.length

  const clearEntityErrors = () => {
    if (entity === GuardrailEntity.PROJECT) {
      clearErrors()
    } else {
      const formKey = GUARDRAIL_ENTITY_FORM_KEYS[entity]

      clearErrors(`${formKey}.settings.0.source` as Path<GuardrailAssignmentFormValues>)
      clearErrors(`${formKey}.settings.0.mode` as Path<GuardrailAssignmentFormValues>)

      const items = getValues(getItemsPath(entity)) ?? []
      items.forEach((_, index) => {
        clearErrors(`${formKey}.items.${index}` as Path<GuardrailAssignmentFormValues>)
      })
    }
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 mb-2">
        <Switch
          className="grow h-fit mt-1.5"
          label={label}
          value={isSwitchEnabled}
          styledDisabled
          disabled={disabled}
          onChange={() => {
            if (!isSwitchEnabled)
              setValue(settingsPath, [{ mode: GuardrailMode.ALL, source: GuardrailSource.INPUT }])
            else setValue(settingsPath, [])
            clearEntityErrors()
          }}
        />

        <GuardrailAssignmentSettings
          entity={entity}
          disabled={disabled || !isSwitchEnabled}
          {...settingsProps}
        />
      </div>

      <InfoBox>{description}</InfoBox>
    </div>
  )
}
