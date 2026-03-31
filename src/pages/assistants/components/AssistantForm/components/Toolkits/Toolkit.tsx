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

import { Fragment, useContext } from 'react'

import { Checkbox } from '@/components/form/Checkbox'
import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'
import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { getCredentialType } from '@/utils/settings'

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
  isChatConfig,
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

      <div className="flex gap-6 p-6">
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
            return (
              <div key={tool.name} className="flex items-center gap-4">
                <Checkbox
                  label={highlightText(tool.label, searchQuery)}
                  hint={tool.user_description ?? tool.description ?? ''}
                  checked={isToolSelected(tool)}
                  onChange={() => {
                    toggleTool(toolkit, tool)
                    integrationField?.onChange()
                  }}
                />
                {isToolSelected(tool) && tool.settings_config && !toolkit.is_external && (
                  <div className={'min-w-[50px] max-w-[180px] shrink-0'}>
                    <IntegrationSelector
                      className="justify-end"
                      short={isChatConfig}
                      value={selectedToolkit?.tools.find((tl) => tool.name === tl.name)?.settings}
                      settingsDefinitions={settings[getCredentialType(tool.name)]}
                      onAddSettingClick={() => onAddSettingClick(getCredentialType(tool.name))}
                      onChange={(setting) => {
                        updateToolSetting(toolkit, tool, setting)
                        integrationField?.onChange()
                      }}
                      error={integrationField?.error}
                    />
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Right: integration selector (always reserved to keep left column width stable) */}
        <div className="min-w-[50px] max-w-[180px] shrink-0">
          {toolkit.settings_config &&
            selectedToolkit &&
            !toolkit.is_external &&
            (() => {
              const field = getToolkitFieldData()
              return (
                <div>
                  <div className="flex flex-col gap-6">
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
