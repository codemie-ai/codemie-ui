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

import DetailsSidebar from '@/components/details/DetailsSidebar'
import { SKILL_DETAILS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import { dataSourceStore } from '@/store/dataSources'
import { Assistant, AssistantContext } from '@/types/entity/assistant'
import { Skill } from '@/types/entity/skill'

import AssistantDetailsActions from './components/AssistantDetailsActions'
import AssistantDetailsMainSections from './components/AssistantDetailsMainSections'
import AssistantDetailsProfile from './components/AssistantDetailsProfile'
import AssistantDetailsSidebarSections from './components/AssistantDetailsSidebarSections'
import { getAssistantRoute } from '../../utils/getAssistantLink'

interface AssistantDetailsProps {
  isTemplate?: boolean
  assistant: Assistant
  createChat: (assistant: Assistant) => void
  onNewIntegration?: (project: string, settingType: string, callback: () => void) => void
  exportAssistant?: (assistant: Assistant) => void
  loadAssistant: () => Promise<void>
}

/**
 * Full-page assistant details view: profile with actions, the main content sections and
 * the details sidebar, all with navigation affordances (skills, datasources and
 * sub-assistants link to their pages). For embedding inside another page without any
 * navigation, use AssistantDetailsEmbedded instead.
 */
const AssistantDetails = ({
  isTemplate,
  assistant,
  createChat,
  onNewIntegration,
  exportAssistant,
  loadAssistant,
}: AssistantDetailsProps) => {
  const router = useVueRouter()

  const onContextClick = async (context: AssistantContext) => {
    const resp = await dataSourceStore.findDatasourceID(
      context.name,
      context.context_type,
      assistant.project
    )
    router.push({
      name: 'data-source-details',
      params: { id: resp.id },
    })
  }

  const onSkillClick = (skill: Skill) => {
    router.push({ name: SKILL_DETAILS, params: { id: skill.id } })
  }

  const onSubassistantClick = (subAssistant: Assistant) => {
    router.push(getAssistantRoute(subAssistant))
  }

  return (
    <div className="flex flex-col max-w-5xl mx-auto py-8">
      <div className="flex justify-between flex-row gap-3 max-view-details-bp:flex-col">
        <AssistantDetailsProfile assistant={assistant} />
        <AssistantDetailsActions
          isTemplate={isTemplate}
          assistant={assistant}
          createChat={createChat}
          exportAssistant={exportAssistant}
          loadAssistant={loadAssistant}
        />
      </div>

      <div className="mt-8 flex flex-row gap-9 z-10 max-view-details-bp:flex-col">
        <div className="flex flex-col gap-6 grow min-w-0 max-view-details-bp:order-2">
          <AssistantDetailsMainSections
            assistant={assistant}
            isTemplate={isTemplate}
            onNewIntegration={onNewIntegration}
          />
        </div>

        <DetailsSidebar classNames="max-view-details-bp:order-1 max-view-details-bp:min-w-full">
          <AssistantDetailsSidebarSections
            assistant={assistant}
            isTemplate={isTemplate}
            onContextClick={onContextClick}
            onSkillClick={onSkillClick}
            onSubassistantClick={onSubassistantClick}
          />
        </DetailsSidebar>
      </div>
    </div>
  )
}

export default AssistantDetails
