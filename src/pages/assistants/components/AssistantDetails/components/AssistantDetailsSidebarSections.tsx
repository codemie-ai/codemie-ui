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

import { useEffect, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import CodeSvg from '@/assets/icons/code.svg?react'
import ConfluenceSvg from '@/assets/icons/confluence.svg?react'
import DetailsCopyField from '@/components/details/DetailsCopyField'
import DetailsProperty from '@/components/details/DetailsProperty'
import DetailsSidebarSection from '@/components/details/DetailsSidebar/components/DetailsSidebarSection'
import GuardrailAssignmentsDetails from '@/components/guardrails/GuardrailAssignmentsDetails/GuardrailAssignmentsDetails'
import { TOOLKIT_ORDER_KEYS } from '@/constants/assistants'
import { useRequestHedgingEnabled } from '@/hooks/useFeatureFlags'
import { useProjectDisplayNames } from '@/hooks/useProjectDisplayNames'
import ToolkitsViewList from '@/pages/assistants/components/ToolkitsViewList'
import { appInfoStore } from '@/store/appInfo'
import { mcpStore } from '@/store/mcp'
import {
  Assistant,
  AssistantContext,
  AssistantToolkit,
  ContextType,
} from '@/types/entity/assistant'
import { GuardrailEntity } from '@/types/entity/guardrail'
import { Skill } from '@/types/entity/skill'
import { sortToolkitsByOrder } from '@/utils/assistants'
import { isNumberValue } from '@/utils/helpers'
import { getSharedValue, getToolkitFromMcpServers, getRootPath } from '@/utils/utils'

import RequestHedgingDetails from './RequestHedgingDetails'
import SidebarSubassistants from './sidebar_details/SidebarSubassistants'
import SidebarTags from './sidebar_details/SidebarTags'
import { getAssistantLink } from '../../../utils/getAssistantLink'

const SOURCE_ICONS = {
  [ContextType.CODE]: <CodeSvg />,
  [ContextType.KNOWLEDGE_BASE]: <ConfluenceSvg />,
}

interface AssistantDetailsSidebarSectionsProps {
  assistant: Assistant
  isTemplate?: boolean
  // Navigation affordances. When a handler is omitted (embedded side-panel usage),
  // the related items render as plain, non-clickable content so the view never
  // routes away from its host page.
  onContextClick?: (context: AssistantContext) => void | Promise<void>
  onSkillClick?: (skill: Skill) => void
  onSubassistantClick?: (assistant: Assistant) => void
}

/**
 * Sidebar content of the assistant details view (overview, links, categories,
 * configuration, skills, tools, guardrails, hedging). Shared between the full details
 * page (AssistantDetails) and the embedded side-panel view (AssistantDetailsEmbedded);
 * meant to be rendered inside a DetailsSidebar container.
 */
const AssistantDetailsSidebarSections = ({
  assistant,
  isTemplate,
  onContextClick,
  onSkillClick,
  onSubassistantClick,
}: AssistantDetailsSidebarSectionsProps) => {
  const snapshot = useSnapshot(mcpStore)
  const [isRequestHedgingEnabled] = useRequestHedgingEnabled()

  useEffect(() => {
    const idsToFetch = assistant.mcp_servers
      .filter((s) => !!s.mcp_config_id)
      .map((s) => s.mcp_config_id as string)
      .filter((id) => !mcpStore.configs.some((c) => c.id === id))
    idsToFetch.forEach((id) => mcpStore.getConfig(id).catch(() => {}))
  }, [assistant.mcp_servers])

  const projectDisplayNames = useProjectDisplayNames(assistant.project)
  const projectDisplayName =
    (assistant.project && projectDisplayNames.get(assistant.project)) ||
    assistant.display_name?.trim() ||
    ''

  const { assistantDetailsLink, assistantChatLink, assistantTemplateLink } = useMemo(() => {
    const baseUrl = `${getRootPath()}/assistants`

    return {
      assistantDetailsLink: getAssistantLink(assistant),
      assistantChatLink: `${baseUrl}/${encodeURIComponent(assistant.slug || '')}/start`,
      assistantTemplateLink: `${baseUrl}/templates/${encodeURIComponent(assistant.slug || '')}`,
    }
  }, [assistant])

  const unavailableConfigIds = useMemo(() => {
    const catalogMap = new Map(snapshot.configs.map((c) => [c.id, c]))
    return new Set(
      assistant.mcp_servers
        .filter((s) => {
          if (!s.mcp_config_id) return false
          const entry = catalogMap.get(s.mcp_config_id)
          return !entry || !entry.is_active || !entry.is_public
        })
        .map((s) => s.mcp_config_id as string)
    )
  }, [assistant.mcp_servers, snapshot.configs])

  const toolkits = useMemo(() => {
    const baseToolkits: (AssistantToolkit | ReturnType<typeof getToolkitFromMcpServers>)[] =
      assistant.toolkits || []

    if (assistant.mcp_servers.length) {
      const mcpToolkit = getToolkitFromMcpServers(assistant.mcp_servers, true)
      const toolsWithAvailability = mcpToolkit.tools.map((tool) => ({
        ...tool,
        isUnavailable:
          !!tool.serverConfig?.mcp_config_id &&
          unavailableConfigIds.has(tool.serverConfig.mcp_config_id),
      }))
      return baseToolkits.concat({ ...mcpToolkit, tools: toolsWithAvailability })
    }

    return baseToolkits
  }, [assistant.toolkits, assistant.mcp_servers, unavailableConfigIds])

  const contextItems = useMemo(() => {
    return (
      assistant.context?.map((value) => ({
        value: value.name,
        icon: SOURCE_ICONS[value.context_type || ''] || null,
        onClick: onContextClick
          ? () => {
              onContextClick(value)
            }
          : undefined,
      })) || []
    )
  }, [assistant.context, onContextClick])

  const llmModelLabel = useMemo(() => {
    return assistant.llm_model_type ? appInfoStore.findLLMLabel(assistant.llm_model_type) : null
  }, [assistant.llm_model_type])

  return (
    <>
      <DetailsSidebarSection headline="OVERVIEW" itemsWrapperClassName="gap-2 -mt-2">
        <DetailsProperty
          label="Project"
          value={
            projectDisplayName ? (
              <span data-tooltip-id="react-tooltip" data-tooltip-content={projectDisplayName}>
                {assistant?.project}
              </span>
            ) : (
              assistant?.project
            )
          }
        />
        <DetailsProperty
          label="Shared status"
          value={getSharedValue(assistant.is_global, assistant.shared)}
        />
        <DetailsCopyField
          label="ASSISTANT ID"
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
              label="Link to assistant details"
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
            <p className="text-sm text-text-quaternary">LLM model</p>
            <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-sm leading-5">
              {llmModelLabel}
            </div>
          </div>
        )}

        {isNumberValue(assistant.temperature) && (
          <div className="flex flex-row items-center gap-2">
            <p className="text-sm text-text-quaternary">Temperature</p>
            <div className="w-fit px-2 py-1.5 flex items-center bg-surface-base-chat rounded-lg border border-border-specific-panel-outline text-sm leading-5">
              {assistant.temperature}
            </div>
          </div>
        )}

        {isNumberValue(assistant.top_p) && (
          <div className="flex flex-row items-center gap-2">
            <p className="text-sm text-text-quaternary">Top P</p>
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
              onClick: onSkillClick ? () => onSkillClick(skill) : undefined,
            }))}
          />
        </DetailsSidebarSection>
      )}

      <DetailsSidebarSection headline="TOOLS & CAPABILITIES">
        <ToolkitsViewList toolkits={sortToolkitsByOrder(toolkits, TOOLKIT_ORDER_KEYS)} />
        <SidebarSubassistants
          assistants={assistant.nested_assistants}
          onAssistantClick={onSubassistantClick}
        />
      </DetailsSidebarSection>

      {assistant.project && (
        <GuardrailAssignmentsDetails
          project={assistant.project}
          entity={GuardrailEntity.ASSISTANT}
          entityId={assistant.id}
          guardrailAssignments={assistant.guardrail_assignments ?? []}
        />
      )}

      {isRequestHedgingEnabled && assistant.hedging_config && (
        <DetailsSidebarSection headline="REQUEST HEDGING" itemsWrapperClassName="gap-2 -mt-2">
          <RequestHedgingDetails hedgingConfig={assistant.hedging_config} />
        </DetailsSidebarSection>
      )}
    </>
  )
}

export default AssistantDetailsSidebarSections
