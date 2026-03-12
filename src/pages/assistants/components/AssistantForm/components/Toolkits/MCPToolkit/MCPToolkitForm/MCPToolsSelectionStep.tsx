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

import { useState, useEffect, useMemo } from 'react'

import RefreshIcon from '@/assets/icons/refresh.svg?react'
import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import InfoBox from '@/components/form/InfoBox/InfoBox'
import InfoWarning from '@/components/InfoWarning/InfoWarning'
import Spinner from '@/components/Spinner'
import { ButtonType, InfoWarningType } from '@/constants'
import { assistantsStore } from '@/store'
import { Tool } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'

const MCP_TOOLS_STATUS = {
  PENDING: 'pending',
  LOADING: 'loading',
  LOADED: 'loaded',
  ERROR: 'error',
} as const

type ToolsStatus = (typeof MCP_TOOLS_STATUS)[keyof typeof MCP_TOOLS_STATUS]

interface MCPToolsSelectionStepProps {
  isEditing: boolean
  mcpServer: MCPServerDetails
  selectedTools: Tool[]
  onToolsChange: (tools: Tool[]) => void
  onBack: () => void
  onCancel: () => void
  onSave: () => void
  singleToolSelection?: boolean
}

const MCPToolsSelectionStep = ({
  isEditing,
  mcpServer,
  selectedTools,
  onToolsChange,
  onBack,
  onCancel,
  onSave,
  singleToolSelection = false,
}: MCPToolsSelectionStepProps) => {
  const [toolsStatus, setToolsStatus] = useState<ToolsStatus>(MCP_TOOLS_STATUS.PENDING)
  const [tools, setTools] = useState<Tool[]>([])
  const [error, setError] = useState<string | null>(null)
  const [useAllTools, setUseAllTools] = useState(false)
  const [initialSelectedTools, setInitialSelectedTools] = useState<Tool[]>([])

  const isToolSelected = (tool: Tool) => {
    return selectedTools.some((t) => t.name === tool.name)
  }

  const unavailableTools = useMemo(
    () =>
      initialSelectedTools.filter(
        (tool) => !tools.some((loadedTool) => loadedTool.name === tool.name)
      ),
    [initialSelectedTools, tools]
  )

  const getStatusText = () => {
    if (singleToolSelection) {
      return selectedTools.length > 0 ? 'Select a tool (1 selected)' : 'Select a tool'
    }
    if (useAllTools) {
      return 'All available tools will be used'
    }
    return `Select tools to include (${selectedTools.length} selected)`
  }

  const handleToggleUseAll = () => {
    const newUseAllState = !useAllTools
    setUseAllTools(newUseAllState)
    onToolsChange([])
  }

  const handleToggleToolSingle = (tool: Tool) => {
    setUseAllTools(false)
    if (isToolSelected(tool)) {
      onToolsChange([])
    } else {
      onToolsChange([tool])
    }
  }

  const handleToggleToolMulti = (tool: Tool) => {
    setUseAllTools(false)
    if (isToolSelected(tool)) {
      onToolsChange(selectedTools.filter((t) => t.name !== tool.name))
    } else {
      onToolsChange([...selectedTools, tool])
    }
  }

  const fetchTools = async () => {
    setToolsStatus(MCP_TOOLS_STATUS.LOADING)
    setError(null)

    try {
      const toolkits = await assistantsStore.getMcpTools(mcpServer)
      const fetchedTools = toolkits[0]?.tools ?? []
      setTools(fetchedTools)
      setToolsStatus(MCP_TOOLS_STATUS.LOADED)
    } catch (err) {
      console.error('Error fetching MCP tools:', err)
      const { details, message } = (err as any).parsedError || {}
      setError(message ? `${message}\n${details || ''}` : 'Failed to fetch tools')
      setTools([])
      setToolsStatus(MCP_TOOLS_STATUS.ERROR)
    }
  }

  useEffect(() => {
    if (mcpServer) {
      fetchTools()
    }
    if (selectedTools.length > 0) {
      setInitialSelectedTools(selectedTools)
    }
  }, [])

  useEffect(() => {
    if (isEditing && selectedTools.length === 0) {
      setUseAllTools(true)
    } else if (selectedTools.length > 0) {
      setUseAllTools(false)
    }
  }, [selectedTools.length, isEditing])

  return (
    <>
      <div className="flex flex-col gap-4 min-h-[200px]">
        {toolsStatus === MCP_TOOLS_STATUS.ERROR && (
          <InfoWarning type={InfoWarningType.ERROR} message={error || 'Failed to fetch tools'} />
        )}

        {toolsStatus === MCP_TOOLS_STATUS.PENDING && (
          <div className="flex flex-col items-center justify-center flex-1">
            <p className="text-text-secondary">Preparing to load tools...</p>
          </div>
        )}

        {toolsStatus === MCP_TOOLS_STATUS.LOADING && (
          <div className="flex flex-col items-center justify-center flex-1">
            <Spinner inline rootClassName="pt-2" />
            <p className="text-text-secondary mt-4">Loading tools from MCP server...</p>
          </div>
        )}

        {(toolsStatus === MCP_TOOLS_STATUS.LOADED || toolsStatus === MCP_TOOLS_STATUS.ERROR) && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary">{getStatusText()}</p>

            {!singleToolSelection && (
              <Checkbox
                label="Use all available tools"
                hint="The assistant will have access to all tools provided by this MCP server"
                checked={useAllTools}
                onChange={handleToggleUseAll}
              />
            )}

            {toolsStatus === MCP_TOOLS_STATUS.LOADED && (
              <>
                {tools.length === 0 ? (
                  <div className="flex items-center justify-center py-8">
                    <p className="text-text-secondary">No tools available</p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3 max-h-[400px] overflow-y-auto show-scroll">
                    {tools.map((tool) => (
                      <div key={tool.name} className="flex flex-col gap-1">
                        <Checkbox
                          label={tool.label || tool.name}
                          hint={tool.description || ''}
                          checked={isToolSelected(tool)}
                          onChange={() =>
                            singleToolSelection
                              ? handleToggleToolSingle(tool)
                              : handleToggleToolMulti(tool)
                          }
                        />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {unavailableTools.length > 0 && (
              <InfoBox text={'The following tools are not reachable'} />
            )}

            {unavailableTools.map((tool) => (
              <div key={`unavailable-${tool.name}`} className="flex flex-col gap-1 opacity-80">
                <Checkbox
                  label={tool.label || tool.name}
                  hint={tool.description || ''}
                  checked={isToolSelected(tool)}
                  onChange={() =>
                    singleToolSelection ? handleToggleToolSingle(tool) : handleToggleToolMulti(tool)
                  }
                />
              </div>
            ))}

            <div className="flex justify-center px-6">
              <Button type={ButtonType.SECONDARY} onClick={fetchTools}>
                <RefreshIcon className="w-3.5 h-3.5" />
                {toolsStatus === MCP_TOOLS_STATUS.ERROR ? 'Retry' : 'Reload'}
              </Button>
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between gap-4">
        <Button variant="secondary" onClick={onBack}>
          Back
        </Button>
        <div className="flex gap-4">
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>

          <Button
            onClick={onSave}
            disabled={
              toolsStatus === MCP_TOOLS_STATUS.LOADING ||
              (!useAllTools && !selectedTools.length) ||
              (singleToolSelection && !selectedTools.length)
            }
          >
            {isEditing ? 'Save' : 'Add'}
          </Button>
        </div>
      </div>
    </>
  )
}

export default MCPToolsSelectionStep
