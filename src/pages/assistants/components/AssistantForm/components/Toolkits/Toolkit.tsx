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

import { Fragment, useContext, useState } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import TooltipButton from '@/components/TooltipButton'
import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'
import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { getCredentialType } from '@/utils/settings'
import { cn } from '@/utils/utils'

import { AutoCredentialsSwitch } from './AutoCredentialsSwitch'
import { IntegrationSelectDropdown } from './IntegrationSelectDropdown'
import IntegrationSelector from './IntegrationSelector'
import ToolkitIcon from '../../../ToolkitIcon'

interface ToolkitProps {
  toolkit: AssistantToolkit
  selectedToolkits: AssistantToolkit[]
  settings: Record<string, Setting[]>
  toggleTool: (toolkit: AssistantToolkit, tool: Tool) => void
  toggleAllTools: (toolkit: AssistantToolkit, allToolsSelected: boolean) => void
  updateToolSetting: (toolkit: AssistantToolkit, tool: Tool, setting?: Setting) => void
  updateToolkitSetting: (toolkit: AssistantToolkit, setting?: Setting) => void
  singleToolSelection?: boolean
  onAddSettingClick: (credentialType: string) => void
  searchQuery?: string
  isChatConfig?: boolean
}

const highlightText = (text: string, query: string) => {
  if (!query) return text
  const index = text.toLowerCase().indexOf(query.toLowerCase())
  if (index === -1) return text
  return (
    <Fragment>
      {text.slice(0, index)}
      <span className="text-text-accent-status">{text.slice(index, index + query.length)}</span>
      {text.slice(index + query.length)}
    </Fragment>
  )
}

const Toolkit = ({
  toolkit,
  selectedToolkits,
  settings,
  toggleTool,
  toggleAllTools,
  updateToolSetting,
  updateToolkitSetting,
  singleToolSelection = false,
  onAddSettingClick,
  searchQuery = '',
  isChatConfig: _isChatConfig,
}: ToolkitProps) => {
  const workflowContext = useContext(WorkflowContext)

  const selectedToolkit = selectedToolkits.find(
    (selectedToolkit) => selectedToolkit.toolkit === toolkit.toolkit
  )
  const isToolSelected = (tool: Tool) =>
    !!selectedToolkit?.tools.find((selectedTool) => tool.name === selectedTool.name)

  const toolkitSettingsOptions = settings[getCredentialType(toolkit.toolkit)]

  const allToolsSelected = toolkit.tools.every((tool) => isToolSelected(tool))
  const someToolsSelected = !allToolsSelected && toolkit.tools.some((tool) => isToolSelected(tool))

  const getToolFieldData = (toolName: string): { error?: string; onChange: () => void } | null => {
    if (!workflowContext || !selectedToolkit) return null
    const toolExists = selectedToolkit.tools.some((t) => t.name === toolName)
    if (!toolExists) return null

    const issue = workflowContext.getToolIssue({
      toolkit: toolkit.toolkit,
      tool: toolName,
      path: 'tools',
    })
    if (!issue) return null

    return { error: issue.fieldError, onChange: issue.onChange }
  }

  const getToolkitFieldData = (): { error?: string; onChange: () => void } | null => {
    if (!workflowContext || !selectedToolkit) return null

    const issue = workflowContext.getToolIssue({
      toolkit: toolkit.toolkit,
      path: 'tools',
    })
    if (!issue) return null

    return { error: issue.fieldError, onChange: issue.onChange }
  }

  const markAllToolIssuesDirty = () => {
    if (!workflowContext?.getToolIssue || !selectedToolkit) return

    toolkit.tools.forEach((tool) => {
      const integrationField = getToolFieldData(tool.name)
      integrationField?.onChange()
    })
  }

  const [toolkitAutoMode, setToolkitAutoMode] = useState(!selectedToolkit?.settings)

  const [toolAutoModes, setToolAutoModes] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(
      toolkit.tools.map((tool) => [
        tool.name,
        !selectedToolkit?.tools.find((t) => t.name === tool.name)?.settings,
      ])
    )
  )

  const handleToolAutoModeChange = (toolName: string, isAuto: boolean) => {
    setToolAutoModes((prev) => ({ ...prev, [toolName]: isAuto }))
    if (isAuto) {
      const tool = toolkit.tools.find((t) => t.name === toolName)!
      updateToolSetting(toolkit, tool, undefined)
    }
  }

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="h-[86px] flex items-center gap-4 px-6 bg-surface-base-chat border-b border-border-structural">
        <div className="flex justify-center items-center size-8 min-w-8 rounded-lg bg-accordion-icon-bg border border-border-specific-icon-outline">
          <ToolkitIcon toolkitType={toolkit.toolkit} />
        </div>
        <div className="flex flex-col">
          <h2 className="font-medium text-text-primary">{toolkit.label || toolkit.toolkit}</h2>
        </div>
      </div>

      <div className="flex gap-6 p-6 w-full">
        {/* Left: tools list */}
        <div className="flex flex-col gap-4 flex-1 min-w-0">
          <h3 className="text-xs text-text-tertiary overflow-hidden overflow-ellipsis text-nowrap">
            Features to use:
          </h3>
          {!singleToolSelection && (
            <>
              <Checkbox
                label="Select all"
                hint="Select all tools"
                checked={allToolsSelected}
                mixed={someToolsSelected}
                id={toolkit.toolkit}
                onChange={() => {
                  toggleAllTools(toolkit, allToolsSelected)
                  markAllToolIssuesDirty()
                }}
              />
              <hr className="border-border-structural" />
            </>
          )}
          {toolkit.tools.map((tool) => {
            const integrationField = getToolFieldData(tool.name)
            const description = tool.user_description ?? tool.description
            const lastSpaceIdx = description ? tool.label.lastIndexOf(' ') : -1
            let toolLabel: React.ReactNode
            if (!description) {
              toolLabel = highlightText(tool.label, searchQuery)
            } else if (lastSpaceIdx === -1) {
              toolLabel = (
                <span className="whitespace-nowrap">
                  {highlightText(tool.label, searchQuery)}
                  <TooltipButton className="inline-block align-middle ml-2" content={description} />
                </span>
              )
            } else {
              toolLabel = (
                <>
                  {highlightText(tool.label.slice(0, lastSpaceIdx), searchQuery)}{' '}
                  <span className="whitespace-nowrap">
                    {highlightText(tool.label.slice(lastSpaceIdx + 1), searchQuery)}
                    <TooltipButton
                      className="inline-block align-middle ml-2"
                      content={description}
                    />
                  </span>
                </>
              )
            }
            const showIntegration =
              isToolSelected(tool) && tool.settings_config && !toolkit.is_external
            const toolValue = selectedToolkit?.tools.find((tl) => tool.name === tl.name)?.settings
            const isAutoMode = toolAutoModes[tool.name] ?? !toolValue
            const hasToolOptions = (settings[getCredentialType(tool.name)] ?? []).length > 0

            return (
              <div key={tool.name} className="flex flex-col gap-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Checkbox
                      label={toolLabel}
                      checked={isToolSelected(tool)}
                      onChange={() => {
                        toggleTool(toolkit, tool)
                        integrationField?.onChange()
                      }}
                    />
                  </div>
                  {showIntegration && !hasToolOptions && (
                    <IntegrationSelectDropdown
                      className="ml-auto"
                      isAutoMode={isAutoMode}
                      value={toolValue}
                      settingsDefinitions={settings[getCredentialType(tool.name)]}
                      onAddSettingClick={() => onAddSettingClick(getCredentialType(tool.name))}
                      onChange={(setting) => {
                        updateToolSetting(toolkit, tool, setting)
                        integrationField?.onChange()
                      }}
                      error={integrationField?.error}
                    />
                  )}
                </div>
                {showIntegration && hasToolOptions && (
                  <AutoCredentialsSwitch
                    isAutoMode={isAutoMode}
                    onChange={(auto) => handleToolAutoModeChange(tool.name, auto)}
                  />
                )}
                {showIntegration && hasToolOptions && (
                  <IntegrationSelectDropdown
                    isAutoMode={isAutoMode}
                    value={toolValue}
                    settingsDefinitions={settings[getCredentialType(tool.name)]}
                    onAddSettingClick={() => onAddSettingClick(getCredentialType(tool.name))}
                    onChange={(setting) => {
                      updateToolSetting(toolkit, tool, setting)
                      integrationField?.onChange()
                    }}
                    error={integrationField?.error}
                  />
                )}
              </div>
            )
          })}
        </div>

        {/* Right: integration selector (always reserved to keep left column width stable) */}
        <div
          className={cn(
            'shrink-0',
            selectedToolkit &&
              toolkit.settings_config &&
              !toolkit.is_external &&
              toolkitSettingsOptions?.length
              ? 'w-80'
              : 'min-w-[50px] max-w-[180px]'
          )}
        >
          {toolkit.settings_config &&
            selectedToolkit &&
            !toolkit.is_external &&
            (() => {
              const field = getToolkitFieldData()
              return (
                <div>
                  <div
                    className={cn(
                      'flex flex-col',
                      toolkitSettingsOptions?.length
                        ? cn('justify-between', toolkitAutoMode ? 'h-[50px]' : 'h-[90px]')
                        : 'gap-2'
                    )}
                  >
                    <span className="font-geist-mono text-xs text-text-tertiary">
                      Integrations:
                    </span>
                    <IntegrationSelector
                      value={selectedToolkit.settings}
                      tooltipPosition="left"
                      settingsDefinitions={toolkitSettingsOptions}
                      onAddSettingClick={() =>
                        onAddSettingClick(getCredentialType(toolkit.toolkit))
                      }
                      onChange={(setting) => {
                        updateToolkitSetting(toolkit, setting)
                        field?.onChange()
                      }}
                      onAutoModeChange={setToolkitAutoMode}
                      error={field?.error}
                    />
                  </div>
                </div>
              )
            })()}
        </div>
      </div>
    </div>
  )
}

export default Toolkit
