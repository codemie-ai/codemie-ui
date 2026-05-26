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

import DeleteSvg from '@/assets/icons/delete.svg?react'
import EditSvg from '@/assets/icons/edit.svg?react'
import Button from '@/components/Button'
import NavigationMore from '@/components/NavigationMore'
import { ButtonType } from '@/constants'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import IntegrationSelector from '../IntegrationSelector'
import { MCPToolkitTestProvider, MCPToolkitTestTrigger } from './MCPToolkitTest'

interface MCPServerDetailProps {
  server: MCPServerDetails
  settingsDefinitions: Setting[]
  isSelected: boolean
  isUnavailable?: boolean
  onUpdate: (server: MCPServerDetails) => void
  onEdit: () => void
  onDelete: () => void
  showNewIntegrationPopup: () => void
}

const MCPServerDetail = ({
  server,
  settingsDefinitions,
  isSelected,
  isUnavailable,
  onUpdate,
  onEdit,
  onDelete,
  showNewIntegrationPopup,
}: MCPServerDetailProps) => {
  const menuItems = isUnavailable
    ? [{ title: 'Delete', icon: <DeleteSvg />, onClick: onDelete }]
    : [
        { title: 'Edit', icon: <EditSvg />, onClick: onEdit },
        { title: 'Delete', icon: <DeleteSvg />, onClick: onDelete },
      ]

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="font-geist-mono font-normal text-xs leading-none text-text-primary">
            Description
          </span>
          {!isUnavailable && (
            <MCPToolkitTestProvider mcpServer={server}>
              <NavigationMore renderInRoot alignment="end" hideOnClickInside items={menuItems}>
                <MCPToolkitTestTrigger inline />
              </NavigationMore>
            </MCPToolkitTestProvider>
          )}
        </div>
        {isUnavailable ? (
          <>
            <p className="font-geist-mono font-normal text-sm text-text-error pr-10">
              This MCP server is no longer available. You can safely delete it.
            </p>
            <div>
              <Button variant={ButtonType.DELETE} onClick={onDelete}>
                <DeleteSvg className="w-4 h-4" />
                Delete
              </Button>
            </div>
          </>
        ) : (
          server.description && (
            <p className="font-geist-mono font-normal text-sm text-text-quaternary pr-10">
              {server.description}
            </p>
          )
        )}
      </div>

      {!isUnavailable && server.tools && server.tools.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="font-geist-mono text-xs text-text-primary">Selected Tools:</span>
          <p className="text-xs text-text-secondary">{server.tools.join(', ')}</p>
        </div>
      )}

      {!isUnavailable && isSelected && (
        <div className="flex flex-col gap-2">
          <span className="font-geist-mono text-xs text-text-primary">Environment Variables</span>
          <IntegrationSelector
            value={server.settings}
            tooltipPosition="left"
            settingsDefinitions={settingsDefinitions}
            addButtonLabel="Add Environment Variables"
            placeholder="Environment Variables"
            onChange={(settings) => onUpdate({ ...server, settings })}
            onAddSettingClick={showNewIntegrationPopup}
            selectClassName={'!mr-auto ml-0 w-[280px]'}
            buttonClassName={'mr-auto ml-0 w-[210px]'}
          />
        </div>
      )}
    </div>
  )
}

export default MCPServerDetail
