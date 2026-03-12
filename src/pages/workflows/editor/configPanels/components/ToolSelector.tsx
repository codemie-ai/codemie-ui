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

import React, { useState, useEffect } from 'react'

import ConfigureSvg from '@/assets/icons/configure.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import MCPSvg from '@/assets/icons/mcp.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { useMcpEnabled } from '@/hooks/useFeatureFlags'
import Toolkits from '@/pages/assistants/components/AssistantForm/components/Toolkits/Toolkits'
import ToolkitIcon from '@/pages/assistants/components/ToolkitIcon'
import { AssistantToolkit } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { cn } from '@/utils/utils'

interface ToolSelectorProps {
  toolkits: AssistantToolkit[]
  mcpServers: MCPServerDetails[]
  onToolkitsChange: (toolkits: AssistantToolkit[]) => void
  onMcpServersChange: (mcpServers: MCPServerDetails[]) => void
  showNewIntegrationPopup: (project: string, credentialType: string) => void
  project: string
}

const ToolSelector: React.FC<ToolSelectorProps> = ({
  toolkits,
  mcpServers,
  onToolkitsChange,
  onMcpServersChange,
  showNewIntegrationPopup,
  project,
}) => {
  const [isToolPopupOpen, setIsToolPopupOpen] = useState(false)
  const [isMcpPopupOpen, setIsMcpPopupOpen] = useState(false)
  const [isMCPSelected, setIsMCPSelected] = useState(false)
  const [stagedToolkits, setStagedToolkits] = useState<AssistantToolkit[]>([])
  const [stagedMcpServers, setStagedMcpServers] = useState<MCPServerDetails[]>([])

  const [isMcpFeatureEnabled] = useMcpEnabled()

  const selectedToolkit = toolkits?.[0]
  const selectedTool = selectedToolkit?.tools?.[0]
  const selectedMcpServer = mcpServers?.[0]
  const selectedMcpTool = selectedMcpServer?.tools?.[0]

  useEffect(() => {
    const mcpSelected = mcpServers?.length > 0
    setIsMCPSelected(mcpSelected)

    if (mcpSelected && toolkits?.length > 0) {
      onToolkitsChange([])
    }
  }, [mcpServers?.length])

  const handleOpenToolPopup = () => {
    setStagedToolkits(toolkits)
    setIsToolPopupOpen(true)
  }

  const handleOpenMcpPopup = () => {
    setStagedMcpServers(mcpServers)
    setIsMcpPopupOpen(true)
  }

  const handleCloseToolPopup = () => {
    setIsToolPopupOpen(false)
  }

  const handleCloseMcpPopup = () => {
    setIsMcpPopupOpen(false)
  }

  const handleSubmitToolPopup = () => {
    onToolkitsChange(stagedToolkits)
    setIsToolPopupOpen(false)
  }

  const handleSubmitMcpPopup = () => {
    onMcpServersChange(stagedMcpServers)
    setIsMcpPopupOpen(false)
  }

  const handleClear = () => {
    setIsMCPSelected(false)
    onToolkitsChange([])
    onMcpServersChange([])
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {(selectedToolkit || isMCPSelected) && (
          <div className="flex items-center justify-end">
            <Button type={ButtonType.SECONDARY} onClick={handleClear}>
              <CrossSvg className="w-3.5 h-3.5" />
              Clear
            </Button>
          </div>
        )}

        {!isMCPSelected && (
          <Button
            id="tool-select-btn"
            type={ButtonType.SECONDARY}
            className={cn(
              'h-auto grow justify-start pl-4 py-3 gap-4 bg-surface-base-content select-non'
            )}
            onClick={handleOpenToolPopup}
          >
            {selectedToolkit && selectedTool ? (
              <>
                <div className="flex justify-center items-center size-8 min-w-8 rounded-lg bg-surface-interactive-active border border-border-specific-icon-outline">
                  <ToolkitIcon toolkitType={selectedToolkit.toolkit} />
                </div>
                <div className="flex flex-col items-start">
                  <h2 className="font-medium text-text-primary text-base">
                    {selectedToolkit.label || selectedToolkit.toolkit}
                  </h2>
                  <div className="text-xs text-text-quaternary">{selectedTool.name}</div>
                </div>
              </>
            ) : (
              <div className="flex justify-center text-sm gap-4">
                {' '}
                <ConfigureSvg /> Select tool{' '}
              </div>
            )}
          </Button>
        )}

        {!selectedToolkit && isMcpFeatureEnabled && (
          <Button
            id="mcp-select-btn"
            type={ButtonType.SECONDARY}
            className={cn(
              'h-auto grow justify-start pl-4 py-3 gap-4 bg-surface-base-content select-non'
            )}
            onClick={handleOpenMcpPopup}
          >
            {isMCPSelected ? (
              <>
                <div className="flex justify-center items-center size-8 min-w-8 rounded-lg bg-surface-interactive-active border border-border-specific-icon-outline">
                  <MCPSvg />
                </div>
                <div className="flex flex-col items-start">
                  <h2 className="font-medium text-text-primary text-base">
                    {selectedMcpServer.name}
                  </h2>
                  {selectedMcpTool && (
                    <div className="text-xs text-text-secondary">{selectedMcpTool}</div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex justify-center text-sm gap-4">
                {' '}
                <MCPSvg /> Select MCP tool{' '}
              </div>
            )}
          </Button>
        )}
      </div>

      {/* Tool Selection Popup */}
      <Popup
        visible={isToolPopupOpen}
        onHide={handleCloseToolPopup}
        onSubmit={handleSubmitToolPopup}
        header="Select Tool"
        submitText="Save"
        cancelText="Cancel"
        limitWidth={false}
        className="w-full max-w-4xl"
      >
        <div className="p-4">
          <Toolkits
            toolkits={stagedToolkits}
            mcpServers={[]}
            onToolkitsChange={setStagedToolkits}
            onMcpServersChange={() => {}}
            showNewIntegrationPopup={showNewIntegrationPopup}
            project={project}
            singleToolSelection={true}
            showInternalTools={true}
            showExternalTools={true}
            showMcpServers={false}
          />
        </div>
      </Popup>

      {/* MCP Config/Tool Selection Popup */}
      {isMcpFeatureEnabled && (
        <Popup
          visible={isMcpPopupOpen}
          onHide={handleCloseMcpPopup}
          onSubmit={handleSubmitMcpPopup}
          header="Select MCP Server"
          submitText="Save"
          cancelText="Cancel"
          limitWidth={false}
          className="w-full max-w-4xl"
        >
          <div className="p-4">
            <Toolkits
              toolkits={[]}
              mcpServers={stagedMcpServers}
              onToolkitsChange={() => {}}
              onMcpServersChange={setStagedMcpServers}
              showNewIntegrationPopup={showNewIntegrationPopup}
              project={project}
              singleToolSelection={true}
              showInternalTools={false}
              showExternalTools={false}
              showMcpServers={true}
            />
          </div>
        </Popup>
      )}
    </>
  )
}

export default ToolSelector
