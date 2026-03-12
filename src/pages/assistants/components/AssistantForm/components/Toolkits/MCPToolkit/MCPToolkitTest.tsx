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
import { useSnapshot } from 'valtio'

import Checker from '@/components/Checker'
import { CHECKER_STATUSES, CheckerStatus } from '@/constants'
import { assistantsStore } from '@/store'
import { MCPServerDetails } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

interface MCPToolkitTestProps {
  inline?: boolean
  mcpServer: MCPServerDetails
}

const MCPToolkitTest = ({ inline, mcpServer }: MCPToolkitTestProps) => {
  const { testMCP } = useSnapshot(assistantsStore)
  const [status, setStatus] = useState<CheckerStatus>(CHECKER_STATUSES.UNDEFINED)

  const check = async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    e.stopPropagation()
    if (status === CHECKER_STATUSES.IN_PROGRESS) return
    setStatus(CHECKER_STATUSES.IN_PROGRESS)

    try {
      const response = await testMCP(mcpServer)
      if (!response.success) {
        toaster.error(`MCP server configuration test failed: ${response.message}`)
        setStatus(CHECKER_STATUSES.FAILED)
      } else {
        toaster.info('MCP Server configuration test successful')
        setStatus(CHECKER_STATUSES.SUCCESS)
      }
    } catch {
      setStatus(CHECKER_STATUSES.FAILED)
    }
  }

  return (
    <Checker
      status={status}
      onCheck={check}
      classNames={
        inline
          ? 'border-none flex items-center justify-start gap-4 px-1 h-[34px] text-text-primary hover:bg-surface-specific-dropdown-hover hover:text-text-accent'
          : ''
      }
    />
  )
}

export default MCPToolkitTest
