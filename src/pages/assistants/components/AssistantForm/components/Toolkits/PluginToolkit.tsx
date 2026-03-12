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

import { useMemo, useState, useEffect } from 'react'

import RefreshIcon from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import InfoBox from '@/components/form/InfoBox/InfoBox'
import InfoWarning from '@/components/InfoWarning/InfoWarning'
import Spinner from '@/components/Spinner'
import { ButtonType, InfoWarningType } from '@/constants'
import { assistantsStore } from '@/store'
import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { getCredentialType } from '@/utils/settings'
import { cn } from '@/utils/utils'

import IntegrationSelector from './IntegrationSelector'

type PluginToolsStatus = 'pending' | 'loading' | 'loaded'

const PLUGIN_TOOLS_STATUS = {
  PENDING: 'pending',
  LOADING: 'loading',
  LOADED: 'loaded',
} as const

interface PluginToolkitProps {
  toolkit: AssistantToolkit
  selectedToolkits: AssistantToolkit[]
  settings: Record<string, Setting[]>
  updateToolSetting: (toolkit: AssistantToolkit, tool: Tool, setting?: Setting) => void
  updateToolkitSetting: (toolkit: AssistantToolkit, setting?: Setting) => void
  singleToolSelection?: boolean
  onAddSettingClick: (credentialType: string) => void
  isChatConfig?: boolean
  onToolkitsChange: (toolkits: AssistantToolkit[]) => void
}

const USE_ALL_TOOL = 'Plugin'

const PluginToolkit = ({
  toolkit,
  selectedToolkits,
  settings,
  updateToolSetting,
  updateToolkitSetting,
  singleToolSelection = false,
  onAddSettingClick,
  isChatConfig,
  onToolkitsChange,
}: PluginToolkitProps) => {
  const [pluginToolsStatus, setPluginToolsStatus] = useState<PluginToolsStatus>(
    PLUGIN_TOOLS_STATUS.PENDING
  )
  const [pluginToolsError, setPluginToolsError] = useState<string | null>(null)
  const [pluginTools, setPluginTools] = useState<Tool[]>(toolkit.tools)
  const [initialSelectedTools, setInitialSelectedTools] = useState<Tool[]>([])
  const [selectedSetting, setSelectedSetting] = useState<Setting | null>(null)

  const selectedToolkit = useMemo(
    () => selectedToolkits.find((tk) => tk.toolkit === toolkit.toolkit),
    [selectedToolkits, toolkit.toolkit]
  )

  const useAllTool = useMemo(
    () => toolkit.tools.find((tool) => tool.name === USE_ALL_TOOL),
    [toolkit.tools]
  )

  const isToolSelected = (tool: Tool) => {
    return !!selectedToolkit?.tools.find((selectedTool) => tool.name === selectedTool.name)
  }

  const toolkitSettingsOptions = settings[getCredentialType(toolkit.toolkit)]

  const availableTools = useMemo(
    () => pluginTools.filter((tool) => !toolkit.tools.some((t) => t.name === tool.name)),
    [pluginTools, toolkit.tools]
  )

  const unavailableTools = useMemo(
    () =>
      initialSelectedTools.filter(
        (tool) => !pluginTools.some((loadedTool) => loadedTool.name === tool.name)
      ),
    [initialSelectedTools, pluginTools]
  )

  const fetchPluginTools = async () => {
    setPluginToolsStatus(PLUGIN_TOOLS_STATUS.LOADING)
    setPluginToolsError(null)

    try {
      const pluginSettingId = selectedSetting?.id
      const pluginToolkits = await assistantsStore.getPluginTools(pluginSettingId)
      const fetchedTools = pluginToolkits[0]?.tools ?? []
      setPluginTools(fetchedTools)
      setPluginToolsStatus(PLUGIN_TOOLS_STATUS.LOADED)
    } catch (error) {
      console.error('Error fetching plugin tools:', error)
      const { details, message } = (error as any).parsedError
      setPluginToolsError(message + '\n' + details)
      setPluginTools([])
      setPluginToolsStatus(PLUGIN_TOOLS_STATUS.LOADED)
    }
  }

  const updatePluginToolkit = (tools: Tool[]) => {
    const updatedToolkit = {
      ...toolkit,
      tools,
      settings: selectedToolkit?.settings,
    }

    const otherToolkits = selectedToolkits.filter((tk) => tk.toolkit !== toolkit.toolkit)
    const newToolkits = tools.length > 0 ? [...otherToolkits, updatedToolkit] : otherToolkits

    onToolkitsChange(newToolkits)
  }

  const handleToggleUseAll = () => {
    if (!useAllTool) return
    const tools = isToolSelected({ name: USE_ALL_TOOL } as any) ? [] : [useAllTool]
    updatePluginToolkit(tools)
  }

  const handleToggleToolSingle = (tool: Tool) => {
    const tools = isToolSelected(tool) ? [] : [tool]
    updatePluginToolkit(tools)
  }

  const handleToggleTool = (tool: Tool) => {
    const tools = selectedToolkit
      ? selectedToolkit?.tools
          .filter((t) => t.name !== USE_ALL_TOOL)
          .filter((t) => t.name !== tool.name)
      : []

    if (!isToolSelected(tool)) tools.push(tool)

    updatePluginToolkit(tools)
  }

  const renderToolIntegrationSelector = (tool: Tool) => {
    if (!isToolSelected(tool) || !tool.settings_config || toolkit.is_external) return null

    return (
      <IntegrationSelector
        className="ml-4"
        short={isChatConfig}
        value={selectedToolkit?.tools.find((tl) => tool.name === tl.name)?.settings}
        settingsDefinitions={settings[getCredentialType(tool.name)]}
        onAddSettingClick={() => onAddSettingClick(getCredentialType(tool.name))}
        onChange={(setting) => updateToolSetting(toolkit, tool, setting)}
      />
    )
  }

  useEffect(() => {
    if (pluginToolsStatus === PLUGIN_TOOLS_STATUS.LOADED) fetchPluginTools()
  }, [selectedSetting])

  useEffect(() => {
    if (!selectedToolkit) return

    const knownTools = [...toolkit.tools, ...selectedToolkit.tools, ...pluginTools]

    const uniqueTools = Array.from(new Map(knownTools.map((tool) => [tool.name, tool])).values())

    setInitialSelectedTools(uniqueTools.filter((tool) => tool.name !== USE_ALL_TOOL))
    setSelectedSetting(selectedToolkit?.settings ?? selectedToolkit?.tools[0]?.settings ?? null)
  }, [])

  return (
    <div className="flex flex-col p-6 pt-4">
      <div className="flex flex-wrap justify-start items-center gap-2">
        <h3 className="text-xs text-text-secondary text-nowrap">Integration:</h3>
        {toolkit.settings_config && (
          <div
            className={cn({
              'pointer-events-none opacity-50': pluginToolsStatus === PLUGIN_TOOLS_STATUS.LOADING,
            })}
          >
            <IntegrationSelector
              value={selectedSetting}
              tooltipPosition="left"
              settingsDefinitions={toolkitSettingsOptions}
              onAddSettingClick={() => onAddSettingClick(getCredentialType(toolkit.toolkit))}
              onChange={(setting) => {
                setSelectedSetting(setting ?? null)
                updateToolkitSetting(toolkit, setting)
              }}
            />
          </div>
        )}
      </div>

      <div className="mt-2 flex flex-col gap-4">
        {useAllTool && !singleToolSelection && (
          <div className="flex flex-col gap-2">
            <Checkbox
              label="Use available tools"
              hint={useAllTool.user_description ?? useAllTool.description ?? ''}
              checked={isToolSelected(useAllTool)}
              onChange={handleToggleUseAll}
            />
            {renderToolIntegrationSelector(useAllTool)}
          </div>
        )}

        {pluginToolsStatus === PLUGIN_TOOLS_STATUS.PENDING && (
          <div>
            <Button type={ButtonType.SECONDARY} onClick={fetchPluginTools}>
              Load tools
            </Button>
          </div>
        )}

        {pluginToolsError && (
          <InfoWarning type={InfoWarningType.ERROR} message={pluginToolsError} />
        )}

        {pluginToolsStatus === PLUGIN_TOOLS_STATUS.LOADING && (
          <div className="flex justify-center items-center">
            <Spinner inline rootClassName="pt-2" />
          </div>
        )}

        {pluginToolsStatus === PLUGIN_TOOLS_STATUS.LOADED && (
          <>
            <div>
              <Button type={ButtonType.SECONDARY} onClick={fetchPluginTools}>
                <RefreshIcon className="w-3.5 h-3.5" />
                Reload tools
              </Button>
            </div>

            {availableTools.map((tool) => (
              <div key={tool.name} className="flex flex-col gap-2">
                <Checkbox
                  label={tool.label}
                  hint={tool.user_description ?? tool.description ?? ''}
                  checked={isToolSelected(tool)}
                  onChange={() =>
                    singleToolSelection ? handleToggleToolSingle(tool) : handleToggleTool(tool)
                  }
                />
                {renderToolIntegrationSelector(tool)}
              </div>
            ))}
          </>
        )}

        {unavailableTools.length > 0 && (
          <InfoBox
            text={
              pluginToolsStatus === PLUGIN_TOOLS_STATUS.LOADED
                ? 'The following tools are not reachable with the current integration:'
                : 'The following tools are not reachable until the tools are loaded:'
            }
          />
        )}

        {unavailableTools.map((tool) => (
          <div key={`unavailable-${tool.name}`} className="flex flex-col gap-2 opacity-80">
            <Checkbox
              label={tool.label || tool.name}
              hint={tool.user_description ?? tool.description ?? ''}
              checked={isToolSelected(tool)}
              onChange={() =>
                singleToolSelection ? handleToggleToolSingle(tool) : handleToggleTool(tool)
              }
            />
            {renderToolIntegrationSelector(tool)}
          </div>
        ))}
      </div>
    </div>
  )
}

export default PluginToolkit
