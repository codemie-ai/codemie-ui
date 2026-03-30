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

import { RefObject } from 'react'

import McpToolkitSvg from '@/assets/icons/mcp-toolkit.svg?react'
import Accordion from '@/components/Accordion'
import { MCPServerDetails } from '@/types/entity/mcp'
import { Setting } from '@/types/entity/setting'

import MCPToolkit from './MCPToolkit/MCPToolkit'

interface McpServersSectionProps {
  mcpServers: MCPServerDetails[]
  onMcpServersChange: (mcpServers: MCPServerDetails[]) => void
  settingsDefinitions?: Setting[]
  project: string
  showNewIntegrationPopup: () => void
  refreshSettings: () => Promise<void>
  singleToolSelection: boolean
  defaultOpen: boolean
  scrollRef: RefObject<HTMLDivElement | null>
  isCompactView?: boolean
}

const McpServersSection = ({
  mcpServers,
  onMcpServersChange,
  settingsDefinitions,
  project,
  showNewIntegrationPopup,
  refreshSettings,
  singleToolSelection,
  defaultOpen,
  scrollRef,
  isCompactView,
}: McpServersSectionProps) => {
  return (
    <div ref={scrollRef}>
      <Accordion
        title={
          <span className="flex items-center gap-4">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg border border-border-structural bg-border-structural/10">
              <McpToolkitSvg className="w-[18px] h-[18px]" />
            </div>
            MCP Servers
          </span>
        }
        description={
          <div className="ml-12">
            <p className="font-geist-mono text-xs leading-normal text-text-tertiary">
              Model Context Protocol servers provide additional capabilities.
            </p>
          </div>
        }
        defaultOpen={defaultOpen}
      >
        <MCPToolkit
          settingsDefinitions={settingsDefinitions ?? []}
          mcpServers={mcpServers}
          onMcpServersChange={onMcpServersChange}
          showNewIntegrationPopup={showNewIntegrationPopup}
          project={project}
          refreshSettings={refreshSettings}
          singleToolSelection={singleToolSelection}
          isCompactView={isCompactView}
        />
      </Accordion>
    </div>
  )
}

export default McpServersSection
