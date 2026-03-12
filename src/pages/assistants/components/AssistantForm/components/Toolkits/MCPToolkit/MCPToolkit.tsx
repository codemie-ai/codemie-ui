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

import { useState } from 'react'

import TemplatesSvg from '@/assets/icons/templates.svg?react'
import ToolSvg from '@/assets/icons/tool.svg?react'
import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'
import { MCPConfig, MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import MCPMarketplaceModal from './MCPMarketplaceModal'
import MCPServerList from './MCPServerList'
import MCPToolkitForm from './MCPToolkitForm/index'

interface MCPToolkitProps {
  settingsDefinitions: Setting[]
  mcpServers: MCPServerDetails[]
  onMcpServersChange: (mcpServers: MCPServerDetails[]) => void
  showNewIntegrationPopup: () => void
  project: string
  refreshSettings: () => Promise<any>
  singleToolSelection?: boolean
}

const MCPToolkit = ({
  settingsDefinitions,
  mcpServers,
  onMcpServersChange,
  showNewIntegrationPopup,
  project,
  refreshSettings,
  singleToolSelection = false,
}: MCPToolkitProps) => {
  const [selectedMcpServer, setSelectedMcpServer] = useState<MCPServerDetails>()
  const [isFormPopupVisible, setIsFormPopupVisible] = useState(false)
  const [isMarketplaceVisible, setIsMarketplaceVisible] = useState(false)
  const [isDeletePopupVisible, setIsDeletePopupVisible] = useState(false)

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

  const toggleMcpServer = (mcpServer: MCPServerDetails) => {
    onMcpServersChange(
      mcpServers.map((ms) => (ms.name === mcpServer.name ? { ...ms, enabled: !ms.enabled } : ms))
    )
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
    // Map MCPConfig to MCPServerDetails
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

  return (
    <>
      <div className="flex flex-col p-6 pt-4">
        {/* MCP Server List or Empty State */}
        <MCPServerList
          mcpServers={mcpServers}
          isSelected={isSelected}
          onToggle={toggleMcpServer}
          onEdit={(ms) => {
            setSelectedMcpServer(ms)
            setIsFormPopupVisible(true)
          }}
          onDelete={(ms) => {
            setSelectedMcpServer(ms)
            setIsDeletePopupVisible(true)
          }}
          onUpdateSettings={(ms, settings) => updateMcpServer({ ...ms, settings })}
          settingsDefinitions={settingsDefinitions}
          onAddSettingClick={showNewIntegrationPopup}
          onBrowseMarketplace={handleBrowseMarketplace}
          onAddCustom={handleAddCustom}
        />

        {/* Action Buttons - Only show if there are existing servers */}
        {mcpServers.length > 0 && (
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            <Button variant="secondary" className="flex-1" onClick={handleBrowseMarketplace}>
              <TemplatesSvg className="w-4 h-4" /> Browse Catalog
            </Button>
            <Button variant="secondary" className="flex-1" onClick={handleAddCustom}>
              <ToolSvg className="w-4 h-4" /> Manual Setup
            </Button>
          </div>
        )}
      </div>

      {/* Marketplace Modal */}
      <MCPMarketplaceModal
        visible={isMarketplaceVisible}
        onHide={() => setIsMarketplaceVisible(false)}
        onSelectConfig={handleSelectFromMarketplace}
        existingServerNames={mcpServers.map((s) => s.name)}
      />

      {/* Form Modal */}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        header="Delete MCP Server?"
        message={`Are you sure you want to delete ${selectedMcpServer?.name}?`}
        visible={isDeletePopupVisible}
        confirmButtonType={ButtonType.DELETE}
        onCancel={() => setIsDeletePopupVisible(false)}
        onConfirm={deleteMcpServer}
      />
    </>
  )
}

export default MCPToolkit
