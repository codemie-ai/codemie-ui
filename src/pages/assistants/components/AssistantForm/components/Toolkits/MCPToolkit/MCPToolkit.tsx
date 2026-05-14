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

import { useEffect, useMemo, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import ConfirmationModal from '@/components/ConfirmationModal'
import InfoWarning from '@/components/InfoWarning'
import { ButtonType, InfoWarningType } from '@/constants'
import { MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID } from '@/constants/mcp'
import { appInfoStore } from '@/store/appInfo'
import { mcpStore } from '@/store/mcp'
import { MCPConfig, MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import MCPActionButtons from './MCPActionButtons'
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

const sanitizeForCatalogRef = (server: MCPServerDetails): MCPServerDetails => {
  if (!server.mcp_config_id) return server
  const { config, command, arguments: args, mcp_connect_url, ...rest } = server
  return rest
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

  const snapshot = useSnapshot(mcpStore)
  const appInfoSnapshot = useSnapshot(appInfoStore)
  const isRestricted = appInfoSnapshot.configs.some(
    (c) => c.id === MCP_CUSTOM_SERVERS_DISABLED_CONFIG_ID && c.settings.enabled === true
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [mcpServers.length])

  useEffect(() => {
    const idsToFetch = mcpServers
      .filter((s) => !!s.mcp_config_id)
      .map((s) => s.mcp_config_id as string)
      .filter((id) => !mcpStore.configs.some((c) => c.id === id))
    idsToFetch.forEach((id) => mcpStore.getConfig(id).catch(() => {}))
  }, [mcpServers])

  const catalogMap = useMemo(
    () => new Map(snapshot.configs.map((c) => [c.id, c])),
    [snapshot.configs]
  )

  const unavailableIds = useMemo(() => {
    return mcpServers
      .filter((s) => {
        if (!s.mcp_config_id) return false
        const entry = catalogMap.get(s.mcp_config_id)
        return !entry || !entry.is_active || !entry.is_public
      })
      .map((s) => s.mcp_config_id as string)
  }, [mcpServers, catalogMap])

  const showCustomSetup = !isRestricted

  const warningBanner =
    unavailableIds.length > 0 ? (
      <InfoWarning
        type={InfoWarningType.WARNING}
        message="Some MCP servers are unavailable. Remove them or contact your administrator."
      />
    ) : null

  const isServerUnavailable = (server: MCPServerDetails): boolean =>
    !!server.mcp_config_id && unavailableIds.includes(server.mcp_config_id)

  const isSelected = (mcpServer: MCPServerDetails) =>
    !!mcpServers.some((ms) => ms.name === mcpServer.name && ms.enabled)

  const toggleMcpServer = (mcpServer: MCPServerDetails) => {
    onMcpServersChange(
      mcpServers.map((ms) => (ms.name === mcpServer.name ? { ...ms, enabled: !ms.enabled } : ms))
    )
  }

  const updateMcpServer = (mcpServer: MCPServerDetails) => {
    const sanitized = sanitizeForCatalogRef(mcpServer)
    const existingMcpServer = mcpServers.find((ms) => ms.name === sanitized.name)

    if (existingMcpServer) {
      onMcpServersChange(
        mcpServers.map((ms) =>
          ms.name === sanitized.name ? { ...ms, ...sanitized, settings: sanitized.settings } : ms
        )
      )
    } else if (singleToolSelection) {
      onMcpServersChange([sanitized])
    } else {
      onMcpServersChange([...mcpServers, sanitized])
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
    let serverDetails: MCPServerDetails

    if (isRestricted) {
      serverDetails = {
        name: config.name,
        description: config.description,
        enabled: true,
        mcp_config_id: config.id,
        required_env_vars: config.required_env_vars,
      }
    } else {
      serverDetails = {
        name: config.name,
        description: config.description,
        enabled: true,
        config: config.config,
        required_env_vars: config.required_env_vars,
        isFromMarketplace: true,
        categories: config.categories,
        logo_url: config.logo_url,
      }
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
            customSetupEnabled={showCustomSetup}
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
          isCatalogRef={!!selectedMcpServer?.mcp_config_id}
        />
      </>
    )
  }

  return (
    <>
      {isCompactView ? (
        <div className="flex flex-col gap-4 px-4 pb-4">
          {warningBanner}
          <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto show-scroll pr-2">
            {mcpServers.map((server, index) => (
              <MCPServerListItem
                key={server.name}
                server={server}
                index={index}
                selectedIndex={-1}
                isSelected={isSelected(server)}
                isActive
                isUnavailable={isServerUnavailable(server)}
                catalogEntry={
                  server.mcp_config_id
                    ? (catalogMap.get(server.mcp_config_id) as MCPConfig)
                    : undefined
                }
                onClick={() => {}}
                onToggle={() => toggleMcpServer(server)}
              />
            ))}
          </div>

          <Button
            variant="secondary"
            onClick={() => setIsDetailModalVisible(true)}
            className="self-center w-52 h-7 px-4 py-1"
          >
            <span className="font-geist-mono font-semibold text-xs leading-4">
              Configure MCP Servers
            </span>
          </Button>

          <MCPActionButtons
            compact
            onBrowseMarketplace={handleBrowseMarketplace}
            onAddCustom={handleAddCustom}
            customSetupEnabled={showCustomSetup}
          />
        </div>
      ) : (
        <div className="relative -mt-4">
          <div className="absolute top-0 bottom-0 left-[314px] border-l border-border-structural z-10" />
          <div className="grid grid-cols-[314px_1fr]">
            <div className="flex flex-col h-[590px]">
              {warningBanner && <div className="px-4 pt-4">{warningBanner}</div>}
              <div className="flex flex-col gap-1 overflow-y-auto flex-1 pt-6 pb-2 pl-4 pr-2 show-scroll">
                {mcpServers.map((server, index) => (
                  <MCPServerListItem
                    key={server.name}
                    server={server}
                    index={index}
                    selectedIndex={selectedIndex}
                    isSelected={isSelected(server)}
                    isUnavailable={isServerUnavailable(server)}
                    catalogEntry={
                      server.mcp_config_id
                        ? (catalogMap.get(server.mcp_config_id) as MCPConfig)
                        : undefined
                    }
                    onClick={() => setSelectedIndex(index)}
                    onToggle={() => toggleMcpServer(server)}
                  />
                ))}
              </div>
              <MCPActionButtons
                compact
                onBrowseMarketplace={handleBrowseMarketplace}
                onAddCustom={handleAddCustom}
                customSetupEnabled={showCustomSetup}
              />
            </div>

            <div className="bg-surface-base-primary h-[590px] overflow-y-auto show-scroll">
              {detailServer ? (
                <MCPServerDetail
                  server={detailServer}
                  settingsDefinitions={settingsDefinitions}
                  isSelected={isSelected(detailServer)}
                  isUnavailable={isServerUnavailable(detailServer)}
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
        isCatalogRef={!!selectedMcpServer?.mcp_config_id}
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
          customSetupEnabled={showCustomSetup}
        />
      )}
    </>
  )
}

export default MCPToolkit
