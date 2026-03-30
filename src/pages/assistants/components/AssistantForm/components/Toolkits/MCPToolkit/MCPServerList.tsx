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

import React, { useContext } from 'react'

import { WorkflowContext } from '@/pages/workflows/editor/hooks/useWorkflowContext'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import MCPEmptyState from './MCPEmptyState'
import MCPServerCard from './MCPServerCard'

interface MCPServerListProps {
  mcpServers: MCPServerDetails[]
  isSelected: (server: MCPServerDetails) => boolean
  onToggle: (server: MCPServerDetails) => void
  onEdit: (server: MCPServerDetails) => void
  onDelete: (server: MCPServerDetails) => void
  onUpdateSettings: (server: MCPServerDetails, settings: Setting | undefined) => void
  settingsDefinitions: Setting[]
  onAddSettingClick: () => void
  onBrowseMarketplace: () => void
  onAddCustom: () => void
}

const MCPServerList: React.FC<MCPServerListProps> = ({
  mcpServers,
  isSelected,
  onToggle,
  onEdit,
  onDelete,
  onUpdateSettings,
  settingsDefinitions,
  onAddSettingClick,
  onBrowseMarketplace,
  onAddCustom,
}) => {
  const workflowContext = useContext(WorkflowContext)

  if (mcpServers.length === 0) {
    return <MCPEmptyState onBrowseMarketplace={onBrowseMarketplace} onAddCustom={onAddCustom} />
  }

  const getMcpServerIssue = (serverName: string) => {
    if (!workflowContext?.getMcpIssue) return null
    const possiblePaths: Array<string | RegExp> = [
      'settings',
      'command',
      'arguments',
      'env',
      'config',
      'integration_alias',
      'name',
      'description',
      /^config\./,
    ]
    for (const path of possiblePaths) {
      const issueResult = workflowContext.getMcpIssue({ mcpName: serverName, path })
      if (issueResult) return issueResult
    }
    return null
  }

  return (
    <div className="flex flex-col gap-3">
      {mcpServers.map((server) => {
        const mcpIssue = getMcpServerIssue(server.name)
        return (
          <MCPServerCard
            key={server.name}
            mcpServer={server}
            isSelected={isSelected(server)}
            onToggle={() => onToggle(server)}
            onEdit={() => onEdit(server)}
            onDelete={() => onDelete(server)}
            settingsDefinitions={settingsDefinitions}
            onSettingsChange={(settings) => onUpdateSettings(server, settings)}
            onAddSettingClick={onAddSettingClick}
            error={mcpIssue?.fieldError}
            onErrorChange={mcpIssue?.onChange}
          />
        )
      })}
    </div>
  )
}

export default MCPServerList
