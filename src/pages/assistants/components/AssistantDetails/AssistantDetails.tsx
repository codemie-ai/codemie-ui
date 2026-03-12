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

import { useMemo, useState } from 'react'

import CodeSvg from '@/assets/icons/code.svg?react'
import ConfluenceSvg from '@/assets/icons/confluence.svg?react'
import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import DetailsSidebar from '@/components/details/DetailsSidebar'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import GuardrailAssignmentsDetails from '@/components/guardrails/GuardrailAssignmentsDetails/GuardrailAssignmentsDetails'
import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import { TOOLKIT_ORDER_KEYS } from '@/constants/assistants'
import { SKILL_DETAILS } from '@/constants/routes'
import { useVueRouter } from '@/hooks/useVueRouter'
import ToolkitsViewList from '@/pages/assistants/components/ToolkitsViewList'
import { appInfoStore } from '@/store/appInfo'
import { dataSourceStore } from '@/store/dataSources'
import { Assistant, AssistantToolkit, ContextType } from '@/types/entity/assistant'
import { GuardrailEntity } from '@/types/entity/guardrail'
import { sortToolkitsByOrder } from '@/utils/assistants'
import { isNumberValue } from '@/utils/helpers'
import { getSharedValue, getToolkitFromMcpServers, getRootPath } from '@/utils/utils'

import AssistantDetailsActions from './components/AssistantDetailsActions'
import AssistantDetailsProfile from './components/AssistantDetailsProfile'
import AssistantPromptVariables from './components/AssistantPromptVariables'
import ConversationStarters from './components/ConversationStarters'
import SidebarSubassistants from './components/sidebar_details/SidebarSubassistants'
import SidebarTags from './components/sidebar_details/SidebarTags'
import SystemInstructions from './components/SystemInstructions'
import { UserMapping } from './components/UserMapping/UserMapping'
import { getAssistantLink } from '../../utils/getAssistantLink'

const SOURCE_ICONS = {
  [ContextType.CODE]: <CodeSvg />,
  [ContextType.KNOWLEDGE_BASE]: <ConfluenceSvg />,
}

interface AssistantDetailsProps {
  isTemplate?: boolean
  assistant: Assistant
  createChat: (assistant: Assistant) => void
  onNewIntegration?: (project: string, settingType: string, callback: () => void) => void
  exportAssistant?: (assistant: Assistant) => void
  loadAssistant: () => Promise<void>
}

const AssistantDetails = ({
  isTemplate,
  assistant,
  createChat,
  onNewIntegration,
  exportAssistant,
  loadAssistant,
}: AssistantDetailsProps) => {
  const router = useVueRouter()
  const [showUserMappingSection, setShowUserMappingSection] = useState(false)

  const userMappingIsSupported = !!onNewIntegration && assistant.is_global && !isTemplate

  const { assistantDetailsLink, assistantChatLink, assistantTemplateLink } = useMemo(() => {
    const baseUrl = `${getRootPath()}/#/assistants`

    return {
      assistantDetailsLink: getAssistantLink(assistant.id),
      assistantChatLink: `${baseUrl}/${encodeURIComponent(assistant.slug || '')}/start`,
      assistantTemplateLink: `${baseUrl}/templates/${encodeURIComponent(assistant.slug || '')}`,
    }
  }, [assistant])

  const toolkits = useMemo(() => {
    const baseToolkits: (AssistantToolkit | ReturnType<typeof getToolkitFromMcpServers>)[] =
      assistant.toolkits || []

    if (assistant.mcp_servers.length) {
      return baseToolkits.concat(getToolkitFromMcpServers(assistant.mcp_servers, true))
    }

    return baseToolkits
  }, [assistant.toolkits, assistant.mcp_servers])

  const onContextClick = async (context) => {
    const resp = await dataSourceStore.findDatasourceID(
      context.name,
      context.context_type,
      assistant?.project
    )
    router.push({
      name: 'data-source-details',
      params: { id: resp.id },
    })
  }

  const contextItems = useMemo(() => {
    return (
      assistant.context?.map((value) => ({
        value: value.name,
        icon: SOURCE_ICONS[value.context_type || ''] || null,
        onClick: () => onContextClick(value),
      })) || []
    )
  }, [assistant.context])

  const llmModelLabel = useMemo(() => {
    return assistant.llm_model_type ? appInfoStore.findLLMLabel(assistant.llm_model_type) : null
  }, [assistant.llm_model_type])

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
          <div>
            {userMappingIsSupported && showUserMappingSection && (
              <InfoWarning
                className="mb-6"
                type={InfoWarningType.INFO}
                message='You can select your own integrations in the "Your Integration Settings" section below to personalize how this assistant interacts with tools and services.'
                header="This is a marketplace assistant with customizable integrations."
              />
            )}
            <h5 className="font-bold text-sm">About Assistant:</h5>
            <p className="mt-2.5 text-sm text-text-quaternary break-words whitespace-pre-wrap">
              {assistant.description}
            </p>
          </div>
          <ConversationStarters items={assistant.conversation_starters} />
          <SystemInstructions text={assistant.system_prompt} />

          {assistant.is_global && !!assistant.prompt_variables?.length && (
            <AssistantPromptVariables
              promptVariables={assistant.prompt_variables}
              assistantID={assistant.id}
            />
          )}

          {userMappingIsSupported && (
            <UserMapping
              assistant={assistant}
              onNewIntegrationRequest={onNewIntegration}
              onSectionVisibilityChange={setShowUserMappingSection}
            />
          )}
        </div>

        <DetailsSidebar classNames="max-view-details-bp:order-1 max-view-details-bp:min-w-full">
          <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
            <DetailsProperty label="Project" value={assistant?.project} />
            <DetailsProperty
              label="Shared status"
              value={getSharedValue(assistant.is_global, assistant.shared)}
            />
            <DetailsCopyField
              label="ASSISTANT ID:"
              value={assistant.id}
              className="mt-2 font-semibold"
              notification="Assistant ID copied to clipboard"
            />
          </DetailsSidebarSection>

          <DetailsSidebarSection headline="ACCESS LINKS">
            {isTemplate ? (
              <DetailsCopyField
                label="Link to assistant template"
                value={assistantTemplateLink}
                notification="Link to assistant template copied to clipboard"
              />
            ) : (
              <>
                <DetailsCopyField
                  label="Link to assistant details:"
                  value={assistantDetailsLink}
                  notification="Link to assistant copied to clipboard"
                />
                <DetailsCopyField
                  label="Link to start a chat"
                  value={assistantChatLink}
                  notification="Start a chat link copied to clipboard"
                />
              </>
            )}
          </DetailsSidebarSection>

          {assistant?.categories?.length ? (
            <DetailsSidebarSection headline="CATEGORIES">
              <SidebarTags
                noItemsMessage="No categories assigned"
                items={assistant.categories.map((category) => ({
                  value: category.name,
                }))}
              />
            </DetailsSidebarSection>
          ) : null}

          <DetailsSidebarSection headline="CONFIGURATION">
            {llmModelLabel && (
              <div className="flex flex-col gap-2">
                <p className="text-sm text-text-quaternary">LLM model:</p>
                <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-sm leading-5">
                  {llmModelLabel}
                </div>
              </div>
            )}

            {isNumberValue(assistant.temperature) && (
              <div className="flex flex-row items-center gap-2">
                <p className="text-sm text-text-quaternary">Temperature:</p>
                <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-sm leading-5">
                  {assistant.temperature}
                </div>
              </div>
            )}

            {isNumberValue(assistant.top_p) && (
              <div className="flex flex-row items-center gap-2">
                <p className="text-sm text-text-quaternary">Top P:</p>
                <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-sm leading-5">
                  {assistant.top_p}
                </div>
              </div>
            )}

            <SidebarTags
              label="Additional datasource context"
              noItemsMessage="No datasources chosen"
              items={contextItems}
            />
          </DetailsSidebarSection>

          {assistant.skills && assistant.skills.length > 0 && (
            <DetailsSidebarSection headline="SKILLS">
              <SidebarTags
                noItemsMessage="No skills attached"
                items={assistant.skills.map((skill) => ({
                  value: skill.name,
                  onClick: () => router.push({ name: SKILL_DETAILS, params: { id: skill.id } }),
                }))}
              />
            </DetailsSidebarSection>
          )}

          <DetailsSidebarSection headline="TOOLS & CAPABILITIES">
            <ToolkitsViewList toolkits={sortToolkitsByOrder(toolkits, TOOLKIT_ORDER_KEYS)} />
            <SidebarSubassistants assistants={assistant.nested_assistants} />
          </DetailsSidebarSection>

          {assistant.project && (
            <GuardrailAssignmentsDetails
              project={assistant.project}
              entity={GuardrailEntity.ASSISTANT}
              entityId={assistant.id}
              guardrailAssignments={assistant.guardrail_assignments ?? []}
            />
          )}
        </DetailsSidebar>
      </div>
    </div>
  )
}

export default AssistantDetails
