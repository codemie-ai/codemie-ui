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

import { FC, useState } from 'react'
import { FieldErrors } from 'react-hook-form'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import Spinner from '@/components/Spinner'
import Tabs, { Tab } from '@/components/Tabs/Tabs'
import { GuardrailEntity } from '@/types/entity/guardrail'

import { GuardrailAssignmentHeader } from './GuardrailAssignmentHeader'
import { GuardrailAssignmentTab } from './GuardrailAssignmentTab'
import { useGuardrailAssignmentForm } from './hooks/useGuardrailAssignmentForm'
import { GuardrailAssignmentFormContext } from './hooks/useGuardrailAssignmentFormContext'
import { useGuardrailAssignmentOptions } from './hooks/useGuardrailAssignmentOptions'
import { GuardrailAssignmentFormValues } from './schemas/guardrailAssignmentSchema'
import { GUARDRAIL_ENTITY_FORM_KEYS } from './utils/guardrailAssignmentUtils'

export const guardrailAssignmentEntityHumanized: Record<GuardrailEntity, string> = {
  [GuardrailEntity.ASSISTANT]: 'Assistants',
  [GuardrailEntity.KNOWLEDGEBASE]: 'Data Sources',
  [GuardrailEntity.WORKFLOW]: 'Workflows',
  [GuardrailEntity.PROJECT]: 'entities',
}

const tabEntities: Exclude<GuardrailEntity, GuardrailEntity.PROJECT>[] = [
  GuardrailEntity.ASSISTANT,
  GuardrailEntity.WORKFLOW,
  GuardrailEntity.KNOWLEDGEBASE,
]

interface Props {
  visible: boolean
  guardrailId?: string
  guardrailName: string
  onHide: () => void
}

const GuardrailAssignmentPopup: FC<Props> = ({ visible, guardrailId, guardrailName, onHide }) => {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<GuardrailEntity>(tabEntities[0])

  const findFirstTabWithErrors = (
    errors: FieldErrors<GuardrailAssignmentFormValues>
  ): GuardrailEntity | null => {
    for (const entity of tabEntities) {
      const formKey = GUARDRAIL_ENTITY_FORM_KEYS[entity]
      if (errors?.[formKey]) return entity
    }
    return null
  }

  const submitErrorHandler = (errors: FieldErrors<GuardrailAssignmentFormValues>) => {
    const currentTabFormKey = GUARDRAIL_ENTITY_FORM_KEYS[activeTab]
    const currentTabHasErrors = !!errors?.[currentTabFormKey]

    if (!currentTabHasErrors) {
      const firstTabWithError = findFirstTabWithErrors(errors)
      if (firstTabWithError) setActiveTab(firstTabWithError)
    }
  }

  const {
    assignments,
    isProjectLevelEnabled,
    isSubmitting,

    handleSubmit,
    ...methods
  } = useGuardrailAssignmentForm({
    visible,
    guardrailId,
    hidePopup: onHide,
    setIsLoading,
    setError,
    submitErrorHandler,
  })

  const { initialOptions } = useGuardrailAssignmentOptions({ assignments, setIsLoading })

  const tabs: Tab<GuardrailEntity>[] = tabEntities.map((entity) => ({
    id: entity,
    label: guardrailAssignmentEntityHumanized[entity],
    element: (
      <GuardrailAssignmentTab
        key={entity}
        entity={entity}
        project={assignments?.project_name ?? ''}
        initialOptions={initialOptions}
      />
    ),
  }))

  return (
    <Popup
      hideFooter
      dismissableMask={false}
      visible={visible}
      onHide={onHide}
      withBorder={false}
      header={`Guardrail ${guardrailName} management`}
      bodyClassName="!pt-0 pb-4"
      className="w-full max-w-[640px] max-h-[680px] h-full"
      overlayClassName="py-4"
    >
      <div className="h-full flex justify-center items-center">
        {isLoading && <Spinner inline rootClassName="p-0" />}

        {!isLoading && error && (
          <div className="text-failed-secondary text-sm p-4 bg-failed-secondary/10 rounded-lg mb-4">
            {error}
          </div>
        )}

        {!isLoading && !error && !assignments && (
          <div className="text-text-quaternary text-sm text-center py-4">
            No assignment data available
          </div>
        )}

        {!isLoading && !error && assignments && (
          <GuardrailAssignmentFormContext.Provider value={{ ...methods, isProjectLevelEnabled }}>
            <form className="flex flex-col gap-4 h-full min-w-0" onSubmit={handleSubmit}>
              <GuardrailAssignmentHeader entity={GuardrailEntity.PROJECT} />

              <Tabs
                className="max-h-full h-full min-h-0"
                tabClassName="min-h-0"
                isSmall
                tabs={tabs}
                activeTab={activeTab}
                onChange={setActiveTab}
              />

              <div className="flex gap-4 ml-auto mt-auto">
                <Button variant="secondary" onClick={onHide}>
                  Cancel
                </Button>
                <Button disabled={isSubmitting} buttonType="submit">
                  Save
                </Button>
              </div>
            </form>
          </GuardrailAssignmentFormContext.Provider>
        )}
      </div>
    </Popup>
  )
}

export default GuardrailAssignmentPopup
