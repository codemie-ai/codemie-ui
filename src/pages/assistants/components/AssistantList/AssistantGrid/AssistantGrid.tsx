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

import { classNames as cn } from 'primereact/utils'
import React from 'react'

import AssistantCard from '@/pages/assistants/components/AssistantList/AssistantCard'
import { getAssistantCardInfo } from '@/pages/assistants/components/AssistantList/AssistantCard/getAssistantCardInfo'
import { Assistant, AssistantTemplate } from '@/types/entity/assistant'
import { User } from '@/types/entity/user'
import { pluralize } from '@/utils/helpers'

import AssistantActions from '../../../AssistantActions/AssistantActions'

interface AssistantGridProps {
  assistants: Assistant[]
  user: User | null
  showAssistant: (assistant: Assistant) => void
  exportAssistant?: (assistant: Assistant) => void
  isTemplate?: boolean
  assistantTemplates: AssistantTemplate[]
  reloadAssistants: () => void
  totalCount: number | null
}

const AssistantGrid: React.FC<AssistantGridProps> = ({
  assistants,
  user,
  showAssistant,
  exportAssistant,
  isTemplate,
  assistantTemplates,
  reloadAssistants,
  totalCount,
}) => {
  const assistantList = isTemplate ? assistantTemplates : assistants
  const totalCountInfo = `${totalCount} ${
    isTemplate
      ? pluralize(totalCount, 'template').toUpperCase()
      : pluralize(totalCount, 'assistant').toUpperCase()
  }`

  if (assistantList.length === 0) {
    return (
      <>
        <div className="flex justify-center m-40">
          <h2>No assistants found.</h2>
        </div>
      </>
    )
  }

  return (
    <section>
      {totalCount && (
        <div className="flex-row px-1 w-full text-xs text-text-quaternary font-semibold pb-4 pt-6 bg-surface-base-primary">
          {totalCountInfo}
        </div>
      )}

      <div
        className={cn(
          'min-w-80 grid auto-rows-min grid-cols-1 card-grid-2:grid-cols-2 card-grid-3:grid-cols-3 gap-2.5 justify-items-center',
          {
            'pb-20': !isTemplate,
          }
        )}
      >
        {assistantList.map((assistant) => {
          const { description, isShared, isOwned, name } = getAssistantCardInfo(assistant, user)
          return (
            <AssistantCard
              key={assistant.id || assistant.slug}
              assistant={assistant}
              description={description}
              isShared={isShared}
              isOwned={isOwned}
              name={name}
              isTemplate={isTemplate}
              navigation={
                !isTemplate && (
                  <AssistantActions
                    assistant={assistant}
                    onView={showAssistant}
                    onExport={exportAssistant}
                    reloadAssistants={reloadAssistants}
                  />
                )
              }
              onViewAssistant={() => showAssistant(assistant)}
            />
          )
        })}
      </div>
    </section>
  )
}

export default React.memo(AssistantGrid)
