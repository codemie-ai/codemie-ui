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

import { useEffect, useRef, useState } from 'react'

import MCPIconSvg from '@/assets/icons/mcp.svg?react'
import TemplatesSvg from '@/assets/icons/templates.svg?react'
import ToolSvg from '@/assets/icons/tool.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { MCPConfig, MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'
import { cn } from '@/utils/utils'

import MCPEmptyState from './MCPEmptyState'
import MCPMarketplaceModal from './MCPMarketplaceModal'
import MCPServerDetail from './MCPServerDetail'
import MCPServerListItem from './MCPServerListItem'
import MCPToolkitForm from './MCPToolkitForm/index'

interface MCPToolkitProps {
  settingsDefinitions: Setting[]
  mcpServers: MCPServerDetails[]
  onMcpServersChange: (mcpServers: MCPServerDetails[]) => void
  showNewIntegrationPopup: () => void
  project: string
  refreshSettings: () => Promise<any>
  singleToolSelection?: boolean
  isCompactView?: boolean
}

const MCPCompactServerItem = ({ server }: { server: MCPServerDetails }) => {
  const labelRef = useRef<HTMLHeadingElement>(null)
  const isTruncated = useIsTruncated(labelRef)

  return (
    <div className="flex items-center p-3 gap-3 rounded-lg border border-transparent bg-surface-base-float">
      <div className="flex-shrink-0 w-8 h-8 rounded border border-border-structural bg-surface-base-secondary flex items-center justify-center overflow-hidden">
        {server.logo_url ? (
          <img src={server.logo_url} alt={server.name} className="w-full h-full object-cover" />
        ) : (
          <MCPIconSvg className="w-5 h-5 text-text-quaternary" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <h2
          ref={labelRef}
          className="font-geist-mono font-medium text-base text-text-primary truncate"
          data-tooltip-id={isTruncated ? 'react-tooltip' : undefined}
          data-tooltip-content={isTruncated ? server.name : undefined}
        >
          {server.name}
        </h2>
      </div>
    </div>
  )
}

const MCPToolkit = ({
  settingsDefinitions,
  mcpServers,
  onMcpServersChange,
  showNewIntegrationPopup,
  project,
  refreshSettings,
  singleToolSelection = false,
  isCompactView,
}: MCPToolkitProps) => {
  const [selectedMcpServer, setSelectedMcpServer] = useState<MCPServerDetails>()
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [isFormPopupVisible, setIsFormPopupVisible] = useState(false)
  const [isMarketplaceVisible, setIsMarketplaceVisible] = useState(false)
  const [isDeletePopupVisible, setIsDeletePopupVisible] = useState(false)
  const [isDetailModalVisible, setIsDetailModalVisible] = useState(false)

  useEffect(() => {
    setSelectedIndex(0)
  }, [mcpServers.length])

  const isSelected = (mcpServer: MCPServerDetails) =>
    !!mcpServers.some((ms) => ms.name === mcpServer.name && ms.enabled)

  const updateMcpServer = (mcpServer: MCPServerDetails) => {
    const existingMcpServer = mcpServers.find((ms) => ms.name === mcpServer.name)

    if (existingMcpServer) {
      onMcpServersChange(
        mcpServers.map((ms) =>
          ms.name === mcpServer.name ? { ...ms, ...mcpServer, settings: mcpServer.settings } : ms
        )
      )
    } else if (singleToolSelection) {
      onMcpServersChange([mcpServer])
    } else {
      onMcpServersChange([...mcpServers, mcpServer])
    }

    handleHidePopup()
  }

  const deleteMcpServer = () => {
    onMcpServersChange(mcpServers.filter((ms) => ms.name !== selectedMcpServer?.name))
    setIsDeletePopupVisible(false)
  }

  const handleHidePopup = () => {
    setIsFormPopupVisible(false)
    setSelectedMcpServer(undefined)
  }

  const handleSelectFromMarketplace = (config: MCPConfig) => {
    const serverDetails: MCPServerDetails = {
      name: config.name,
      description: config.description,
      enabled: true,
      config: config.config,
      required_env_vars: config.required_env_vars,
      isFromMarketplace: true,
      categories: config.categories,
      logo_url: config.logo_url,
    }

    setSelectedMcpServer(serverDetails)
    setIsMarketplaceVisible(false)
    setIsFormPopupVisible(true)
  }

  const handleBrowseMarketplace = () => {
    setIsMarketplaceVisible(true)
  }

  const handleAddCustom = () => {
    setSelectedMcpServer(undefined)
    setIsFormPopupVisible(true)
  }

  const detailServer = mcpServers[selectedIndex]

  if (mcpServers.length === 0) {
    return (
      <>
        <div className={cn(isCompactView && 'pb-4')}>
          <MCPEmptyState
            onBrowseMarketplace={handleBrowseMarketplace}
            onAddCustom={handleAddCustom}
            isCompactView={isCompactView}
          />
        </div>

        <MCPMarketplaceModal
          visible={isMarketplaceVisible}
          onHide={() => setIsMarketplaceVisible(false)}
          onSelectConfig={handleSelectFromMarketplace}
          existingServerNames={mcpServers.map((s) => s.name)}
        />

        <MCPToolkitForm
          mcpServer={selectedMcpServer}
          isVisible={isFormPopupVisible}
          settingsDefinitions={settingsDefinitions}
          mcpServerNames={mcpServers.map((t) => t.name)}
          onHide={handleHidePopup}
          updateMcpServer={updateMcpServer}
          showNewIntegrationPopup={showNewIntegrationPopup}
          project={project}
          refreshSettings={refreshSettings}
          singleToolSelection={singleToolSelection}
        />
      </>
    )
  }

  const actionButtons = (compact = false) => (
    <div
      className={cn(
        'flex gap-2 p-4 border-t border-border-structural bg-surface-base-primary',
        compact && 'flex-col'
      )}
    >
      <Button variant="primary" className="flex-1" onClick={handleBrowseMarketplace}>
        <TemplatesSvg className="w-4 h-4" /> Browse Catalog
      </Button>
      <Button variant="secondary" className="flex-1" onClick={handleAddCustom}>
        <ToolSvg className="w-4 h-4" /> Manual Setup
      </Button>
    </div>
  )

  return (
    <>
      {isCompactView ? (
        <div className="flex flex-col gap-4 px-4 pb-4">
          {/* Vertical scrollable list of servers */}
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto show-scroll pr-2">
            {mcpServers.map((server) => (
              <MCPCompactServerItem key={server.name} server={server} />
            ))}
          </div>

          {/* Configure button - outside scroll */}
          <Button
            variant="secondary"
            onClick={() => setIsDetailModalVisible(true)}
            className="self-center w-[212px] h-7 px-4 py-1"
          >
            <span className="font-geist-mono font-semibold text-xs leading-4">
              Configure MCP Servers
            </span>
          </Button>

          {/* Action buttons */}
          {actionButtons(true)}
        </div>
      ) : (
        <div className="relative -mt-4">
          <div className="absolute top-0 bottom-0 left-[314px] border-l border-border-structural z-10" />
          <div className="grid grid-cols-[314px_1fr]">
            {/* Left: server list + buttons */}
            <div className="flex flex-col h-[590px]">
              <div className="flex flex-col gap-1 overflow-y-auto flex-1 pt-6 pb-2 pl-4 pr-2 show-scroll">
                {mcpServers.map((server, index) => (
                  <MCPServerListItem
                    key={server.name}
                    server={server}
                    index={index}
                    selectedIndex={selectedIndex}
                    isCompactView={isCompactView}
                    onClick={() => setSelectedIndex(index)}
                  />
                ))}
              </div>
              {actionButtons(true)}
            </div>

            {/* Right: selected server detail */}
            <div className="bg-surface-base-primary h-[590px] overflow-y-auto show-scroll">
              {detailServer ? (
                <MCPServerDetail
                  server={detailServer}
                  settingsDefinitions={settingsDefinitions}
                  isSelected={isSelected(detailServer)}
                  onUpdate={updateMcpServer}
                  onEdit={() => {
                    setSelectedMcpServer(detailServer)
                    setIsFormPopupVisible(true)
                  }}
                  onDelete={() => {
                    setSelectedMcpServer(detailServer)
                    setIsDeletePopupVisible(true)
                  }}
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
      )}

      <MCPMarketplaceModal
        visible={isMarketplaceVisible}
        onHide={() => setIsMarketplaceVisible(false)}
        onSelectConfig={handleSelectFromMarketplace}
        existingServerNames={mcpServers.map((s) => s.name)}
      />

      <MCPToolkitForm
        mcpServer={selectedMcpServer}
        isVisible={isFormPopupVisible}
        settingsDefinitions={settingsDefinitions}
        mcpServerNames={mcpServers.map((t) => t.name)}
        onHide={handleHidePopup}
        updateMcpServer={updateMcpServer}
        showNewIntegrationPopup={showNewIntegrationPopup}
        project={project}
        refreshSettings={refreshSettings}
        singleToolSelection={singleToolSelection}
      />

      <ConfirmationModal
        header="Delete MCP Server?"
        message={`Are you sure you want to delete ${selectedMcpServer?.name}?`}
        visible={isDeletePopupVisible}
        confirmButtonType={ButtonType.DELETE}
        onCancel={() => setIsDeletePopupVisible(false)}
        onConfirm={deleteMcpServer}
      />

      {/* Detail modal for compact view */}
      {isCompactView && (
        <Popup
          visible={isDetailModalVisible}
          onHide={() => setIsDetailModalVisible(false)}
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
                      isCompactView={isCompactView}
                      onClick={() => setSelectedIndex(index)}
                    />
                  ))}
                </div>
                {actionButtons(true)}
              </div>

              {/* Right: selected server detail */}
              <div className="bg-surface-base-primary h-full overflow-y-auto show-scroll">
                {detailServer ? (
                  <MCPServerDetail
                    server={detailServer}
                    settingsDefinitions={settingsDefinitions}
                    isSelected={isSelected(detailServer)}
                    onUpdate={updateMcpServer}
                    onEdit={() => {
                      setSelectedMcpServer(detailServer)
                      setIsFormPopupVisible(true)
                    }}
                    onDelete={() => {
                      setSelectedMcpServer(detailServer)
                      setIsDeletePopupVisible(true)
                    }}
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
      )}
    </>
  )
}

export default MCPToolkit
