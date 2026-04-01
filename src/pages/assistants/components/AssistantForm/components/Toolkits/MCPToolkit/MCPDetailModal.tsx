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

import Popup from '@/components/Popup'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import MCPActionButtons from './MCPActionButtons'
import MCPServerDetail from './MCPServerDetail'
import MCPServerListItem from './MCPServerListItem'

interface MCPDetailModalProps {
  visible: boolean
  onHide: () => void
  mcpServers: MCPServerDetails[]
  selectedIndex: number
  onSelectIndex: (index: number) => void
  isSelected: (server: MCPServerDetails) => boolean
  onToggle: (server: MCPServerDetails) => void
  settingsDefinitions: Setting[]
  onUpdate: (server: MCPServerDetails) => void
  onEdit: (server: MCPServerDetails) => void
  onDelete: (server: MCPServerDetails) => void
  showNewIntegrationPopup: () => void
  onBrowseMarketplace: () => void
  onAddCustom: () => void
}

const MCPDetailModal = ({
  visible,
  onHide,
  mcpServers,
  selectedIndex,
  onSelectIndex,
  isSelected,
  onToggle,
  settingsDefinitions,
  onUpdate,
  onEdit,
  onDelete,
  showNewIntegrationPopup,
  onBrowseMarketplace,
  onAddCustom,
}: MCPDetailModalProps) => {
  const detailServer = mcpServers[selectedIndex]

  return (
    <Popup
      visible={visible}
      onHide={onHide}
      header="MCP Servers"
      hideFooter
      isFullWidth
      bodyClassName="p-0"
    >
      <div className="w-[1128px] h-[662px] bg-surface-base-secondary border border-border-structural rounded-lg overflow-hidden">
        <div className="relative grid grid-cols-[376px_1fr] h-full">
          <div className="absolute top-0 bottom-0 left-[376px] border-l border-border-structural z-10" />

          {/* Left: server list + buttons */}
          <div className="flex flex-col h-full bg-surface-base-primary">
            <div className="flex flex-col gap-1 overflow-y-auto h-[532px] pt-6 pb-2 pl-4 pr-2 show-scroll border-t border-border-structural bg-surface-base-primary">
              {mcpServers.map((server, index) => (
                <MCPServerListItem
                  key={server.name}
                  server={server}
                  index={index}
                  selectedIndex={selectedIndex}
                  isSelected={isSelected(server)}
                  onClick={() => onSelectIndex(index)}
                  onToggle={() => onToggle(server)}
                />
              ))}
            </div>
            <MCPActionButtons
              compact
              onBrowseMarketplace={onBrowseMarketplace}
              onAddCustom={onAddCustom}
            />
          </div>

          {/* Right: selected server detail */}
          <div className="bg-surface-base-primary h-full overflow-y-auto show-scroll">
            {detailServer ? (
              <MCPServerDetail
                server={detailServer}
                settingsDefinitions={settingsDefinitions}
                isSelected={isSelected(detailServer)}
                onUpdate={onUpdate}
                onEdit={() => onEdit(detailServer)}
                onDelete={() => onDelete(detailServer)}
                showNewIntegrationPopup={showNewIntegrationPopup}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-text-quaternary text-sm">
                No available data for display
              </div>
            )}
          </div>
        </div>
      </div>
    </Popup>
  )
}

export default MCPDetailModal
