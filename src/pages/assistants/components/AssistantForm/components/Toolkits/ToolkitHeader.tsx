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

import Tooltip from '@/components/Tooltip'
import { TOOLKITS } from '@/constants/assistants'
import { AssistantToolkit } from '@/types/entity/assistant'
import { MCPServerDetails } from '@/types/entity/mcp'
import { cn } from '@/utils/utils'

import ToolkitIcon from '../../../ToolkitIcon'

interface ToolkitHeaderProps {
  toolkit: AssistantToolkit
  selectedToolkits?: AssistantToolkit[]
  mcpServers?: MCPServerDetails[]
  singleToolSelection?: boolean
}

const ToolkitHeader = ({
  toolkit: tk,
  selectedToolkits,
  mcpServers,
  singleToolSelection = false,
}: ToolkitHeaderProps) => {
  const selectedTools = selectedToolkits?.find(
    (selectedTk) => selectedTk.toolkit === tk.toolkit
  )?.tools

  const hasEnabledTools = !!selectedTools?.length
  const isPluginToolkit = tk.toolkit === TOOLKITS.Plugin

  const getToolsDescription = () => {
    if (singleToolSelection) return hasEnabledTools ? 'A tool is selected' : 'Not selected'
    if (!hasEnabledTools) return 'No tools selected'
    if (isPluginToolkit) return `${selectedTools.length} tools selected`
    return `${selectedTools.length} of ${tk.tools.length} tools selected`
  }

  const toolsDescription = getToolsDescription()

  const enabledServers = mcpServers?.reduce((acc, ms) => (ms.enabled ? acc + 1 : acc), 0)

  const hasEnabledServers = !!enabledServers
  const serversDescription = hasEnabledServers
    ? `${enabledServers} of ${mcpServers?.length} servers selected`
    : `No servers selected`

  const getTooltip = (value: string) => {
    return value && value.length > 22 ? value : ''
  }

  return (
    <div className="flex gap-4 transition group-hover/header:opacity-85">
      <div className="flex justify-center items-center size-8 min-w-8 rounded-lg bg-surface-interactive-active border border-border-specific-icon-outline">
        <ToolkitIcon toolkitType={tk.toolkit} />
      </div>
      <div className="flex flex-col gap-px text-text-primary">
        <Tooltip target={`.assistant-form-toolkit-${tk.toolkit}`} />
        <h2
          data-pr-tooltip={getTooltip(tk.label || tk.toolkit)}
          className={cn('font-medium w-fit', `assistant-form-toolkit-${tk.toolkit}`)}
        >
          {tk.label || tk.toolkit}
        </h2>
        <div
          className={cn(
            'text-xs text-text-quaternary',
            (hasEnabledTools || hasEnabledServers) && 'text-text-accent-status'
          )}
        >
          {selectedToolkits && toolsDescription}
          {mcpServers && serversDescription}
        </div>
      </div>
    </div>
  )
}
export default ToolkitHeader
