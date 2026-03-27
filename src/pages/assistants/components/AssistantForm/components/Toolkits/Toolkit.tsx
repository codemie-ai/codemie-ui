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

import { Checkbox } from '@/components/form/Checkbox'
import { AssistantToolkit, Tool } from '@/types/entity/assistant'
import { Setting } from '@/types/entity/setting'
import { getCredentialType } from '@/utils/settings'

import IntegrationSelector from './IntegrationSelector'

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
  isChatConfig?: boolean
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
  isChatConfig,
}: ToolkitProps) => {
  const selectedToolkit = selectedToolkits.find(
    (selectedToolkit) => selectedToolkit.toolkit === toolkit.toolkit
  )

  const isToolSelected = (tool: Tool) =>
    !!selectedToolkit?.tools.find((selectedTool) => tool.name === selectedTool.name)

  const toolkitSettingsOptions = settings[getCredentialType(toolkit.toolkit)]

  const allToolsSelected = toolkit.tools.every((tool) => isToolSelected(tool))
  const someToolsSelected = !allToolsSelected && toolkit.tools.some((tool) => isToolSelected(tool))

  return (
    <div className="flex flex-col p-6 pt-4">
      <div className="flex items-center gap-2 min-h-8">
        <h3 className="text-xs text-text-quaternary shrink-0">Features to use:</h3>
        {toolkit.settings_config && selectedToolkit && !toolkit.is_external && (
          <IntegrationSelector
            value={selectedToolkit.settings}
            tooltipPosition="left"
            settingsDefinitions={toolkitSettingsOptions}
            onAddSettingClick={() => onAddSettingClick(getCredentialType(toolkit.toolkit))}
            onChange={(setting) => updateToolkitSetting(toolkit, setting)}
          />
        )}
      </div>
      <div className="mt-2 flex flex-col gap-4">
        {!singleToolSelection && (
          <Checkbox
            label="Select all"
            hint="Select all tools"
            checked={allToolsSelected}
            mixed={someToolsSelected}
            id={toolkit.toolkit}
            onChange={() => toggleAllTools(toolkit, allToolsSelected)}
          />
        )}

        {toolkit.tools.map((tool) => {
          return (
            <div key={tool.name} className="flex flex-col gap-2">
              <Checkbox
                label={tool.label}
                hint={tool.user_description ?? tool.description ?? ''}
                checked={isToolSelected(tool)}
                onChange={() => toggleTool(toolkit, tool)}
              />
              {isToolSelected(tool) && tool.settings_config && !toolkit.is_external && (
                <IntegrationSelector
                  className="ml-4"
                  short={isChatConfig}
                  value={selectedToolkit?.tools.find((tl) => tool.name === tl.name)?.settings}
                  settingsDefinitions={settings[getCredentialType(tool.name)]}
                  onAddSettingClick={() => onAddSettingClick(getCredentialType(tool.name))}
                  onChange={(setting) => updateToolSetting(toolkit, tool, setting)}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default Toolkit
