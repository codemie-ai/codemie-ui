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
import {
  ComponentProps,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useSnapshot } from 'valtio'

import Spinner from '@/components/Spinner'
import { TOOLKITS } from '@/constants/assistants'
import { MCP_SETTINGS_TYPE } from '@/constants/settings'
import { useMcpEnabled } from '@/hooks/useFeatureFlags'
import { assistantsStore } from '@/store'
import { settingsStore } from '@/store/settings'
import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'
import { getCredentialType } from '@/utils/settings'

import MCPToolkit from './MCPToolkit/MCPToolkit'
import PluginToolkit from './PluginToolkit'
import Toolkit from './Toolkit'
import ToolkitHeader from './ToolkitHeader'
import { AssistantFormContext } from '../../AssistantForm'
import FormAccordion from '../FormAccordion/FormAccordion'

export const SECTION = {
  TOOLS: 'tools',
  MCP: 'mcp',
} as const

export type ToolkitSection = (typeof SECTION)[keyof typeof SECTION]

interface ToolkitsProps {
  toolkits: AssistantToolkit[]
  mcpServers: MCPServerDetails[]
  onToolkitsChange: (toolkits: AssistantToolkit[]) => void
  onMcpServersChange: (mcpServers: MCPServerDetails[]) => void
  project?: string
  singleToolSelection?: boolean
  defaultOpenSection?: ToolkitSection
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  customToolkitRenderer?: {
    [toolkitType: string]: React.ComponentType<ComponentProps<typeof Toolkit>>
  }
  showInternalTools?: boolean
  showExternalTools?: boolean
  showMcpServers?: boolean
}

const Toolkits = ({
  toolkits: selectedToolkits,
  mcpServers,
  onToolkitsChange,
  onMcpServersChange,
  project: projectProps,
  singleToolSelection = false,
  defaultOpenSection = undefined,

  showNewIntegrationPopup,

  customToolkitRenderer,
  showInternalTools = true,
  showExternalTools = true,
  showMcpServers = true,
}: ToolkitsProps) => {
  const [isLoading, setIsLoading] = useState(false)
  const { settings, indexSettings } = useSnapshot(settingsStore)
  const { availableToolkits, getAssistantToolkits } = useSnapshot(assistantsStore)
  const { project: projectContext, isChatConfig } = useContext(AssistantFormContext)
  const project = projectProps || projectContext

  const [isMcpFeatureEnabled] = useMcpEnabled()

  const toolsAccordionRef = useRef<HTMLDivElement>(null)
  const externalToolsAccordionRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (defaultOpenSection === SECTION.TOOLS && toolsAccordionRef.current) {
        toolsAccordionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      } else if (defaultOpenSection === SECTION.MCP && externalToolsAccordionRef.current) {
        externalToolsAccordionRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
    }, 100)

    return () => clearTimeout(timer)
  }, [defaultOpenSection])

  const internalToolkits = useMemo(
    () => availableToolkits.filter((tk) => !tk.is_external),
    [availableToolkits]
  ) as AssistantToolkit[]

  const externalToolkits = useMemo(
    () => availableToolkits.filter((tk) => tk.is_external),
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

  const updateSelectedToolkits = (toolkit: AssistantToolkit, updatedTools: Tool[]) => {
    const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

    if (updatedTools.length === 0) {
      onToolkitsChange(selectedToolkits.filter((tk) => tk.toolkit !== toolkit.toolkit))
    } else if (existingToolkit) {
      onToolkitsChange(
        selectedToolkits.map((tk) =>
          tk.toolkit === toolkit.toolkit ? { ...tk, tools: updatedTools } : tk
        )
      )
    } else {
      onToolkitsChange([
        ...selectedToolkits,
        {
          ...toolkit,
          tools: updatedTools,
          settings: undefined,
        },
      ])
    }
  }

  const toggleSingleTool = (toolkit: AssistantToolkit, tool: Tool) => {
    const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)
    const toolExists = existingToolkit?.tools.find((t) => t.name === tool.name)

    if (toolExists) {
      onToolkitsChange([])
    } else {
      onToolkitsChange([
        {
          ...toolkit,
          tools: [tool],
          settings: undefined,
        },
      ])
    }
  }

  const toggleMultiTool = (toolkit: AssistantToolkit, tool: Tool) => {
    const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

    let updatedTools: Tool[] = []
    if (existingToolkit) {
      const toolExists = existingToolkit.tools.find((t) => t.name === tool.name)
      if (toolExists) {
        updatedTools = existingToolkit.tools.filter((t) => t.name !== tool.name)
      } else {
        updatedTools = [...existingToolkit.tools, tool]
      }
    } else {
      updatedTools = [tool]
    }

    updateSelectedToolkits(toolkit, updatedTools)
  }

  const toggleAllTools = (toolkit: AssistantToolkit, allToolsSelected: boolean) => {
    const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

    let updatedTools: Tool[] = []
    if (allToolsSelected) {
      updateSelectedToolkits(toolkit, [])
    } else if (existingToolkit) {
      updatedTools = [
        ...toolkit.tools.filter(
          (tl) => !existingToolkit.tools.some((existingTl) => tl.name === existingTl.name)
        ),
        ...existingToolkit.tools,
      ]
    } else {
      updatedTools = toolkit.tools
    }

    updateSelectedToolkits(toolkit, updatedTools)
  }

  const updateToolkitSetting = (toolkit: AssistantToolkit, setting?: Setting | null) => {
    const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

    if (existingToolkit) {
      onToolkitsChange(
        selectedToolkits.map((tk) =>
          tk.toolkit === toolkit.toolkit ? { ...tk, settings: setting || undefined } : tk
        )
      )
    }
  }

  const updateToolSetting = (toolkit: AssistantToolkit, tool: Tool, settings?: Setting | null) => {
    const existingToolkit = selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit)

    if (existingToolkit) {
      const updatedTools = existingToolkit.tools.map((t) =>
        t.name === tool.name ? { ...t, settings: settings || undefined } : t
      )
      updateSelectedToolkits(toolkit, updatedTools)
    }
  }

  useEffect(() => {
    const fetchToolkits = async () => {
      setIsLoading(true)
      try {
        await getAssistantToolkits()
      } finally {
        setIsLoading(false)
      }
    }

    fetchToolkits()
  }, [])

  useEffect(() => {
    const syncToolSettings = (tool: Tool, fetchedSettings: Record<string, Setting[]>): Tool => {
      const credentialType = getCredentialType(tool.name)
      const toolSettings = fetchedSettings[credentialType]?.find((s) => s.id === tool.settings?.id)
      return { ...tool, settings: toolSettings || tool.settings }
    }

    const syncToolkitTools = (
      toolkit: AssistantToolkit,
      fetchedSettings: Record<string, Setting[]>
    ): Tool[] => {
      return toolkit.tools.map((tool) => syncToolSettings(tool, fetchedSettings))
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
        tools: syncToolkitTools(toolkit, fetchedSettings),
      }
    }

    const fetchSettings = async () => {
      if (isEmpty(settings)) return
      const syncedToolkits = selectedToolkits.map((toolkit) =>
        syncToolkitSettings(toolkit, settings as Record<string, Setting[]>)
      )
      onToolkitsChange(syncedToolkits)
    }

    fetchSettings()
  }, [project, settings])

  useEffect(() => {
    indexSettings()
  }, [project])

  const toolkitProps = {
    settings: filteredSettings,
    selectedToolkits,
    toggleTool: singleToolSelection ? toggleSingleTool : toggleMultiTool,
    toggleAllTools,
    updateToolSetting,
    updateToolkitSetting,
    singleToolSelection,
    onAddSettingClick: (credentialType: string) => {
      showNewIntegrationPopup(project, credentialType)
    },
    isChatConfig,
    onToolkitsChange,
  }

  const mcpToolkit = { label: 'MCP Servers', toolkit: TOOLKITS.MCP } as AssistantToolkit

  const renderInternalToolkitHeader = useCallback(
    (tk: AssistantToolkit) => (
      <ToolkitHeader
        toolkit={tk}
        selectedToolkits={selectedToolkits}
        singleToolSelection={singleToolSelection}
      />
    ),
    [selectedToolkits, singleToolSelection]
  )

  const renderInternalToolkitContent = useCallback(
    (tk: AssistantToolkit) => {
      const CustomComponent = customToolkitRenderer?.[tk.toolkit]
      if (CustomComponent) return <CustomComponent toolkit={tk} {...toolkitProps} />

      if (tk.toolkit === TOOLKITS.Plugin) {
        return <PluginToolkit toolkit={tk} {...toolkitProps} />
      }

      return <Toolkit toolkit={tk} {...toolkitProps} />
    },
    [toolkitProps, customToolkitRenderer]
  )

  const renderExternalToolkitHeader = useCallback(
    (tk: AssistantToolkit) => (
      <ToolkitHeader
        toolkit={tk}
        selectedToolkits={tk.toolkit === TOOLKITS.MCP ? undefined : selectedToolkits}
        mcpServers={tk.toolkit === TOOLKITS.MCP ? mcpServers : undefined}
        singleToolSelection={singleToolSelection}
      />
    ),
    [selectedToolkits, mcpServers, singleToolSelection]
  )

  const renderExternalToolkitContent = useCallback(
    (tk: AssistantToolkit) =>
      tk.toolkit === TOOLKITS.MCP ? (
        <MCPToolkit
          settingsDefinitions={filteredSettings[MCP_SETTINGS_TYPE]}
          mcpServers={mcpServers}
          onMcpServersChange={onMcpServersChange}
          showNewIntegrationPopup={() => showNewIntegrationPopup(project, MCP_SETTINGS_TYPE)}
          project={project}
          refreshSettings={indexSettings}
          singleToolSelection={singleToolSelection}
        />
      ) : (
        <Toolkit toolkit={tk} {...toolkitProps} />
      ),
    [
      filteredSettings,
      mcpServers,
      onMcpServersChange,
      showNewIntegrationPopup,
      project,
      indexSettings,
      toolkitProps,
      singleToolSelection,
    ]
  )

  if (isLoading) return <Spinner inline />

  return (
    <div className="flex flex-col gap-2">
      {showInternalTools && (
        <div ref={toolsAccordionRef}>
          <FormAccordion
            title="Available Tools"
            description={
              singleToolSelection
                ? ''
                : 'Select the tools your assistant may need. If Smart Tools selection is disabled, choose only relevant tools as selecting too many can negatively affect results, slow down responses, and increase costs. When Smart Tools selection is enabled, the assistant will automatically choose the most appropriate tools from your selection.'
            }
            items={internalToolkits}
            itemHeader={renderInternalToolkitHeader}
            itemContent={renderInternalToolkitContent}
            defaultOpen={
              defaultOpenSection ? defaultOpenSection === SECTION.TOOLS : singleToolSelection
            }
          />
        </div>
      )}

      {showExternalTools && externalToolkits.length > 0 && (
        <div>
          <FormAccordion
            title="External Tools"
            description="These toolkits are provided by third-party vendors."
            items={externalToolkits}
            itemHeader={renderExternalToolkitHeader}
            itemContent={renderExternalToolkitContent}
            defaultOpen={false}
          />
        </div>
      )}

      {showMcpServers && isMcpFeatureEnabled && (
        <div ref={externalToolsAccordionRef}>
          <FormAccordion
            title="MCP Servers"
            description="Model Context Protocol servers provide additional capabilities."
            items={[mcpToolkit]}
            itemHeader={renderExternalToolkitHeader}
            itemContent={renderExternalToolkitContent}
            defaultOpen={
              defaultOpenSection
                ? defaultOpenSection === SECTION.MCP
                : !showInternalTools && !showExternalTools
            }
            defaultOpenIndexes={[0]}
          />
        </div>
      )}
    </div>
  )
}

export default Toolkits
