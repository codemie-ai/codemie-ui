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

import { classNames as cn } from 'primereact/utils'
import React from 'react'

import Hint from '@/components/Hint'

import { IntegrationSelector } from './IntegrationSelector'
import ToolkitIcon from '../../../../ToolkitIcon'
import { type Toolkit as ToolkitItem, UserMappingSettings, UserSetting } from '../types'

interface ToolkitProps {
  toolkit: ToolkitItem
  project: string
  userMappingSettings: UserMappingSettings
  settingsOptions: Record<string, UserSetting[]>
  toolsDescriptions: Record<string, Record<string, string | undefined>>
  onUpdate: (itemKey: string, value: UserSetting | null) => void
  onAdd: (payload: { itemKey: string; settingType: string; originalToolName: string }) => void
}

export const Toolkit: React.FC<ToolkitProps> = ({
  toolkit,
  project,
  userMappingSettings,
  settingsOptions,
  toolsDescriptions,
  onUpdate,
  onAdd,
}) => {
  const { toolkit: toolkitKey, label, tools = [] } = toolkit
  const mapping = userMappingSettings[toolkitKey]
  const isToolkitLevelConfig = toolkit.settings_config && mapping
  const toolkitToolsDescriptions = toolsDescriptions[toolkit.toolkit]

  return (
    <div className="bg-surface-base-primary border border-border-specific-panel-outline p-4 rounded-lg">
      <div className="flex items-center gap-4 mb-2">
        <div className="flex justify-center items-center rounded-lg border border-border-specific-panel-outline size-8">
          <ToolkitIcon toolkitType={toolkit.toolkit} />
        </div>
        <h4 className="font-medium text-base">{label || toolkitKey}</h4>
      </div>

      <div className="flex items-center justify-between mb-2 gap-2">
        <p className="text-sm text-text-quaternary">Connected tool:</p>
        {isToolkitLevelConfig && (
          <div>
            <IntegrationSelector
              itemKey={toolkitKey}
              project={project}
              settingId={mapping.settingId}
              credentialType={mapping.credentialType}
              originalToolName={toolkitKey}
              options={settingsOptions[mapping.credentialType.toLowerCase()] || []}
              onUpdate={onUpdate}
              onAdd={onAdd}
            />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        {tools.map((tool) => {
          const toolKey = `${toolkit.toolkit}_${tool.name}`
          const toolMapping = userMappingSettings[toolKey]
          const isConfigurableTool = !isToolkitLevelConfig && tool.settings_config && toolMapping

          return (
            <div
              key={tool.name}
              className={cn(
                'flex justify-between min-h-[32px]',
                tool.additionalInformation ? 'items-start' : 'items-center'
              )}
            >
              <div>
                <div className="flex items-center gap-2 text-sm">
                  {tool.label || tool.name}
                  {(toolkitToolsDescriptions?.[tool.name] || tool.user_description) && (
                    <Hint
                      id={tool.name}
                      showDelay={0}
                      position="right"
                      hint={toolkitToolsDescriptions?.[tool.name] || tool.user_description}
                    />
                  )}
                </div>
                {tool.additionalInformation && tool.additionalInformation()}
              </div>

              {isConfigurableTool && (
                <IntegrationSelector
                  itemKey={toolKey}
                  project={project}
                  settingId={toolMapping.settingId}
                  credentialType={toolMapping.credentialType}
                  originalToolName={tool.name}
                  options={settingsOptions[toolMapping.credentialType.toLowerCase()] || []}
                  onUpdate={onUpdate}
                  onAdd={onAdd}
                />
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
