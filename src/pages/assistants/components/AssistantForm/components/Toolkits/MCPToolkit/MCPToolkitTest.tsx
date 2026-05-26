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

import { createContext, ReactNode, useCallback, useContext, useMemo, useRef, useState } from 'react'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import Checker from '@/components/Checker'
import Popup from '@/components/Popup'
import { CHECKER_STATUSES, CheckerStatus, ButtonSize, ButtonType } from '@/constants'
import { useMCPAuthPrompt } from '@/hooks/useMCPAuthPrompt'
import AssistantAuthGateRow from '@/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow'
import { assistantsStore } from '@/store'
import { MCPServerDetails } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

interface MCPToolkitTestContextValue {
  status: CheckerStatus
  onCheck: (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => Promise<void>
}

const MCPToolkitTestContext = createContext<MCPToolkitTestContextValue | null>(null)

interface MCPToolkitTestProviderProps {
  mcpServer: MCPServerDetails
  children: ReactNode
}

const MCPToolkitTestProvider = ({ mcpServer, children }: MCPToolkitTestProviderProps) => {
  const { testMCP } = useSnapshot(assistantsStore)
  const [status, setStatus] = useState<CheckerStatus>(CHECKER_STATUSES.UNDEFINED)
  const [brokerLoginUrl, setBrokerLoginUrl] = useState<string | null>(null)
  const isRetryingRef = useRef(false)
  const handleAuthRequiredErrorRef = useRef<(error: unknown) => Promise<boolean>>(() =>
    Promise.resolve(false)
  )

  const runTest = useCallback(async () => {
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
    } catch (error) {
      const handled = await handleAuthRequiredErrorRef.current(error)
      if (handled) {
        setStatus(CHECKER_STATUSES.UNDEFINED)
        return
      }
      if (error instanceof Response) {
        const loginUrl = error.headers.get('x-user-mcp-auth-location')
        if (loginUrl) {
          setBrokerLoginUrl(loginUrl)
          setStatus(CHECKER_STATUSES.FAILED)
          return
        }
      }
      setStatus(CHECKER_STATUSES.FAILED)
    }
  }, [mcpServer, testMCP])

  const {
    rows,
    handleAuthRequiredError,
    initiate,
    continue: continueAuth,
    cancel: cancelAuth,
    clearRows,
  } = useMCPAuthPrompt({
    onAllAuthenticated: () => {
      if (isRetryingRef.current) return
      isRetryingRef.current = true
      runTest().finally(() => {
        isRetryingRef.current = false
      })
    },
  })

  handleAuthRequiredErrorRef.current = handleAuthRequiredError

  const check = useCallback(
    async (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
      e.stopPropagation()
      if (status === CHECKER_STATUSES.IN_PROGRESS) return
      await runTest()
    },
    [status, runTest]
  )

  const contextValue = useMemo(() => ({ status, onCheck: check }), [status, check])

  return (
    <MCPToolkitTestContext.Provider value={contextValue}>
      {children}
      <Popup
        visible={rows.length > 0}
        onHide={clearRows}
        header="MCP authentication required"
        hideFooter
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-secondary">
            Complete sign-in for the MCP server below, then the integration test will re-run
            automatically.
          </p>
          {rows.map((row) => (
            <AssistantAuthGateRow
              key={`${row.mcp_config_id}-${row.status}`}
              row={row}
              onAuthenticate={initiate}
              onContinue={continueAuth}
              onCancel={cancelAuth}
            />
          ))}
        </div>
      </Popup>
      <Popup
        visible={!!brokerLoginUrl}
        onHide={() => setBrokerLoginUrl(null)}
        header="Authentication required"
        hideFooter
      >
        <div className="flex flex-col gap-3">
          <p className="text-xs text-text-secondary">
            Please log in to access the MCP server, then run the test again.
          </p>
          <Button
            type={ButtonType.SECONDARY}
            size={ButtonSize.SMALL}
            onClick={() => window.open(brokerLoginUrl!, '_blank', 'noopener,noreferrer')}
          >
            Login to MCP Server
          </Button>
        </div>
      </Popup>
    </MCPToolkitTestContext.Provider>
  )
}

interface MCPToolkitTestTriggerProps {
  inline?: boolean
}

const MCPToolkitTestTrigger = ({ inline }: MCPToolkitTestTriggerProps) => {
  const ctx = useContext(MCPToolkitTestContext)
  if (!ctx) {
    throw new Error('MCPToolkitTestTrigger must be used within MCPToolkitTestProvider')
  }
  return (
    <Checker
      status={ctx.status}
      onCheck={ctx.onCheck}
      classNames={
        inline
          ? 'border-none flex items-center justify-start gap-4 px-1 h-[34px] text-text-primary hover:bg-surface-specific-dropdown-hover hover:text-text-accent'
          : ''
      }
    />
  )
}

interface MCPToolkitTestProps {
  inline?: boolean
  mcpServer: MCPServerDetails
}

const MCPToolkitTest = ({ inline, mcpServer }: MCPToolkitTestProps) => (
  <MCPToolkitTestProvider mcpServer={mcpServer}>
    <MCPToolkitTestTrigger inline={inline} />
  </MCPToolkitTestProvider>
)

export { MCPToolkitTestProvider, MCPToolkitTestTrigger }
export default MCPToolkitTest
