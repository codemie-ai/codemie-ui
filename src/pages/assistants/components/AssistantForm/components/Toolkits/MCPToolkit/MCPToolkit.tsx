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

import { useEffect, useState } from 'react'

import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { MCPConfig, MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import MCPActionButtons from './MCPActionButtons'
import MCPCompactServerItem from './MCPCompactServerItem'
import MCPDetailModal from './MCPDetailModal'
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
  refreshSettings: () => Promise<void>
  singleToolSelection?: boolean
  isCompactView?: boolean
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

  const toggleMcpServer = (mcpServer: MCPServerDetails) => {
    onMcpServersChange(
      mcpServers.map((ms) => (ms.name === mcpServer.name ? { ...ms, enabled: !ms.enabled } : ms))
    )
  }

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

  const handleBrowseMarketplace = () => setIsMarketplaceVisible(true)

  const handleAddCustom = () => {
    setSelectedMcpServer(undefined)
    setIsFormPopupVisible(true)
  }

  const detailServer = mcpServers[selectedIndex]
  if (mcpServers.length === 0) {
    return (
      <>
        <div className={isCompactView ? 'pb-4' : undefined}>
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
            className="self-center w-52 h-7 px-4 py-1"
          >
            <span className="font-geist-mono font-semibold text-xs leading-4">
              Configure MCP Servers
            </span>
          </Button>

          {/* Action buttons */}
          <MCPActionButtons
            compact
            onBrowseMarketplace={handleBrowseMarketplace}
            onAddCustom={handleAddCustom}
          />
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
                    isSelected={isSelected(server)}
                    isCompactView={isCompactView}
                    onClick={() => setSelectedIndex(index)}
                    onToggle={() => toggleMcpServer(server)}
                  />
                ))}
              </div>
              <MCPActionButtons
                compact
                onBrowseMarketplace={handleBrowseMarketplace}
                onAddCustom={handleAddCustom}
              />
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

      {isCompactView && (
        <MCPDetailModal
          visible={isDetailModalVisible}
          onHide={() => setIsDetailModalVisible(false)}
          mcpServers={mcpServers}
          selectedIndex={selectedIndex}
          onSelectIndex={setSelectedIndex}
          isSelected={isSelected}
          onToggle={toggleMcpServer}
          settingsDefinitions={settingsDefinitions}
          onUpdate={updateMcpServer}
          onEdit={(server) => {
            setSelectedMcpServer(server)
            setIsFormPopupVisible(true)
          }}
          onDelete={(server) => {
            setSelectedMcpServer(server)
            setIsDeletePopupVisible(true)
          }}
          showNewIntegrationPopup={showNewIntegrationPopup}
          onBrowseMarketplace={handleBrowseMarketplace}
          onAddCustom={handleAddCustom}
        />
      )}
    </>
  )
}

export default MCPToolkit
