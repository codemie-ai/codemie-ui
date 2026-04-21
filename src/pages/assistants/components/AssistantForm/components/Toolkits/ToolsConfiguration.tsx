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

import isEmpty from 'lodash/isEmpty'
import { ComponentProps, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import Accordion from '@/components/Accordion'
import Spinner from '@/components/Spinner'
import { MCP_SETTINGS_TYPE } from '@/constants/settings'
import { useMcpEnabled } from '@/hooks/useFeatureFlags'
import { useToolkitSelection } from '@/hooks/useToolkitSelection'
import { assistantsStore } from '@/store'
import { settingsStore } from '@/store/settings'
import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'
import { getCredentialType } from '@/utils/settings'
import { cn } from '@/utils/utils'

import AvailableToolsSection from './AvailableToolsSection'
import ExternalToolsSection from './ExternalToolsSection'
import McpServersSection from './McpServersSection'
import Toolkit from './Toolkit'
import { AssistantFormContext } from '../../AssistantForm'

export const DEFAULT_TOOLS_DESCRIPTION = "Extend your assistant's abilities with additional tools"

export const SECTION = {
  TOOLS: 'tools',
  MCP: 'mcp',
} as const

export type ToolkitSection = (typeof SECTION)[keyof typeof SECTION]

interface ToolsConfigurationProps {
  toolkits: AssistantToolkit[]
  mcpServers: MCPServerDetails[]
  onToolkitsChange: (toolkits: AssistantToolkit[]) => void
  onMcpServersChange: (mcpServers: MCPServerDetails[]) => void
  singleToolSelection?: boolean
  defaultOpenSection?: ToolkitSection
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  customToolkitRenderer?: {
    [toolkitType: string]: React.ComponentType<ComponentProps<typeof Toolkit>>
  }
  showInternalTools?: boolean
  showMcpServers?: boolean
  isAIGenerated?: boolean
  renderHint?: () => React.ReactNode
  description?: string
  availableToolsDescription?: string
  showWrapper?: boolean
}

const ToolsConfiguration = ({
  toolkits: selectedToolkits,
  mcpServers,
  onToolkitsChange,
  onMcpServersChange,
  singleToolSelection = false,
  defaultOpenSection = undefined,
  showNewIntegrationPopup,
  customToolkitRenderer,
  showInternalTools = true,
  showMcpServers = true,
  isAIGenerated = false,
  renderHint,
  description = DEFAULT_TOOLS_DESCRIPTION,
  availableToolsDescription,
  showWrapper = true,
}: ToolsConfigurationProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { settings, indexSettings } = useSnapshot(settingsStore)
  const { availableToolkits, getAssistantToolkits } = useSnapshot(assistantsStore)
  const { project, isChatConfig } = useContext(AssistantFormContext)

  const [isMcpFeatureEnabled] = useMcpEnabled()

  const toolsAccordionRef = useRef<HTMLDivElement>(null)
  const mcpAccordionRef = useRef<HTMLDivElement>(null)
  const selectedToolkitsRef = useRef(selectedToolkits)
  selectedToolkitsRef.current = selectedToolkits

  useEffect(() => {
    const timer = setTimeout(() => {
      if (defaultOpenSection === SECTION.TOOLS && toolsAccordionRef.current) {
        toolsAccordionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (defaultOpenSection === SECTION.MCP && mcpAccordionRef.current) {
        mcpAccordionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [defaultOpenSection])

  const internalToolkits = useMemo(
    () => availableToolkits.filter((tk) => !tk.is_external),
    [availableToolkits]
  ) as AssistantToolkit[]

  const filteredSettings = useMemo(() => {
    return Object.fromEntries(
      Object.entries(settings).map(([key, options]) => [
        key,
        (options as Setting[]).filter(
          (setting) => setting.project_name === project || setting.is_global
        ),
      ])
    )
  }, [settings, project]) as Record<string, Setting[]>

  const {
    toggleSingleTool,
    toggleMultiTool,
    toggleAllTools,
    updateToolkitSetting,
    updateToolSetting,
  } = useToolkitSelection({ selectedToolkits, onToolkitsChange })

  useEffect(() => {
    let cancelled = false

    const fetchToolkits = async () => {
      setIsLoading(true)
      try {
        await getAssistantToolkits()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    fetchToolkits()

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    const syncToolSettings = (tool: Tool, fetchedSettings: Record<string, Setting[]>): Tool => {
      const credentialType = getCredentialType(tool.name)
      const toolSettings = fetchedSettings[credentialType]?.find((s) => s.id === tool.settings?.id)
      return { ...tool, settings: toolSettings || tool.settings }
    }

    const syncToolkitSettings = (
      toolkit: AssistantToolkit,
      fetchedSettings: Record<string, Setting[]>
    ): AssistantToolkit => {
      const credentialType = getCredentialType(toolkit.toolkit)
      const toolkitSettings = fetchedSettings[credentialType]?.find(
        (s) => s.id === toolkit.settings?.id
      )
      return {
        ...toolkit,
        settings: toolkitSettings || toolkit.settings,
        tools: toolkit.tools.map((tool) => syncToolSettings(tool, fetchedSettings)),
      }
    }

    if (isEmpty(settings)) return
    const syncedToolkits = selectedToolkitsRef.current.map((toolkit) =>
      syncToolkitSettings(toolkit, settings as Record<string, Setting[]>)
    )
    onToolkitsChange(syncedToolkits)
  }, [project, settings, onToolkitsChange])

  useEffect(() => {
    indexSettings()
  }, [project, indexSettings])

  const toolkitRenderProps = useMemo(
    () => ({
      settings: filteredSettings,
      selectedToolkits,
      toggleTool: singleToolSelection ? toggleSingleTool : toggleMultiTool,
      toggleAllTools,
      updateToolSetting,
      updateToolkitSetting,
      singleToolSelection,
      onAddSettingClick: (credentialType: string) =>
        showNewIntegrationPopup(project, credentialType),
      isChatConfig,
      onToolkitsChange,
    }),
    [
      filteredSettings,
      selectedToolkits,
      singleToolSelection,
      toggleSingleTool,
      toggleMultiTool,
      toggleAllTools,
      updateToolSetting,
      updateToolkitSetting,
      showNewIntegrationPopup,
      project,
      isChatConfig,
      onToolkitsChange,
    ]
  )

  if (isLoading) return <Spinner inline />

  const content = (
    <div className={cn('flex flex-col gap-2', showWrapper && 'px-4 pb-4')}>
      {showInternalTools && (
        <div ref={toolsAccordionRef}>
          <AvailableToolsSection
            internalToolkits={internalToolkits}
            toolkitRenderProps={toolkitRenderProps}
            singleToolSelection={singleToolSelection}
            defaultOpen={
              defaultOpenSection ? defaultOpenSection === SECTION.TOOLS : singleToolSelection
            }
            isCompactView={isChatConfig}
            customToolkitRenderer={customToolkitRenderer}
            availableToolsDescription={availableToolsDescription}
          />
        </div>
      )}

      <ExternalToolsSection
        toolkits={selectedToolkits}
        onToolkitsChange={onToolkitsChange}
        project={project}
        singleToolSelection={singleToolSelection}
        showNewIntegrationPopup={showNewIntegrationPopup}
        isCompactView={isChatConfig}
      />

      {showMcpServers && isMcpFeatureEnabled && (
        <McpServersSection
          mcpServers={mcpServers}
          onMcpServersChange={onMcpServersChange}
          settingsDefinitions={filteredSettings[MCP_SETTINGS_TYPE]}
          project={project}
          showNewIntegrationPopup={() => showNewIntegrationPopup(project, MCP_SETTINGS_TYPE)}
          refreshSettings={indexSettings}
          singleToolSelection={singleToolSelection}
          defaultOpen={defaultOpenSection ? defaultOpenSection === SECTION.MCP : !showInternalTools}
          scrollRef={mcpAccordionRef}
          isCompactView={isChatConfig}
        />
      )}
    </div>
  )

  if (!showWrapper) return content

  return (
    <div data-onboarding="assistant-tools-configuration-accordion">
      <Accordion
        title={<span className="flex items-center gap-2">Tools configuration{renderHint?.()}</span>}
        description={description}
        defaultOpen={true}
        isAIGenerated={isAIGenerated}
      >
        {content}
      </Accordion>
    </div>
  )
}

export default ToolsConfiguration
