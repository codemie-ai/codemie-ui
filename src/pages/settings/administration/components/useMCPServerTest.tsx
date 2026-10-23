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

import { ReactNode, useCallback, useRef, useState } from 'react'

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType, CHECKER_STATUSES, CheckerStatus } from '@/constants'
import { useMCPAuthPrompt } from '@/hooks/useMCPAuthPrompt'
import AssistantAuthGateRow from '@/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow'
import { mcpStore } from '@/store/mcp'
import { MCPConfig, MCPTestResult } from '@/types/entity/mcp'
import toaster from '@/utils/toaster'

import MCPTestIntegrationModal from './MCPTestIntegrationModal'
import { needsIntegration } from './mcpTestRequirements'

export interface UseMCPServerTestResult {
  /** Opens the integration modal when the server needs one, otherwise runs the test directly. */
  start: (server: MCPConfig) => void
  /** The integration modal and auth prompts; the caller MUST render this node. */
  modal: ReactNode
}

interface LastTest {
  id: string
  settingsId: string | undefined
  isModal: boolean
}

const reportResult = (result: MCPTestResult) => {
  if (result.status === 'success') {
    const count = result.tools_count
    toaster.success(
      typeof count === 'number'
        ? `MCP connection test successful (${count} tools)`
        : 'MCP connection test successful'
    )
  } else if (result.status === 'warning') {
    toaster.info(result.message || 'Connected, but the server returned no tools.')
  } else {
    toaster.error(result.message || 'MCP connection test failed')
  }
}

const reportError = (error: unknown) => {
  if (error instanceof Response) {
    if (error.status === 401) {
      toaster.error('Authentication required — please add your credentials')
    }
  } else if (error instanceof Error) {
    toaster.error(error.message)
  } else {
    toaster.error('MCP connection test failed')
  }
}

export const useMCPServerTest = (): UseMCPServerTestResult => {
  const [modalServer, setModalServer] = useState<MCPConfig | undefined>(undefined)
  const [status, setStatus] = useState<CheckerStatus>(CHECKER_STATUSES.UNDEFINED)
  const [brokerLoginUrl, setBrokerLoginUrl] = useState<string | null>(null)
  const lastTestRef = useRef<LastTest | null>(null)
  const isRetryingRef = useRef(false)
  const handleAuthRequiredErrorRef = useRef<(error: unknown) => Promise<boolean>>(() =>
    Promise.resolve(false)
  )

  const applyModalStatus = useCallback((result: MCPTestResult) => {
    if (result.status === 'failure') {
      setStatus(CHECKER_STATUSES.FAILED)
    } else if (result.status === 'warning') {
      setStatus(CHECKER_STATUSES.WARNING)
    } else {
      setStatus(CHECKER_STATUSES.SUCCESS)
    }
  }, [])

  const handleTestError = useCallback(async (error: unknown, isModal: boolean) => {
    const handled = await handleAuthRequiredErrorRef.current(error)
    if (handled) {
      if (isModal) setStatus(CHECKER_STATUSES.UNDEFINED)
      return
    }

    const loginUrl =
      error instanceof Response ? error.headers.get('x-user-mcp-auth-location') : null
    if (loginUrl) {
      setBrokerLoginUrl(loginUrl)
    } else {
      reportError(error)
    }
    if (isModal) setStatus(CHECKER_STATUSES.FAILED)
  }, [])

  const runTest = useCallback(
    async (id: string, settingsId: string | undefined, isModal: boolean) => {
      lastTestRef.current = { id, settingsId, isModal }
      if (isModal) setStatus(CHECKER_STATUSES.IN_PROGRESS)
      try {
        const result = await mcpStore.testConfig(id, settingsId)
        reportResult(result)
        if (isModal) applyModalStatus(result)
      } catch (error) {
        await handleTestError(error, isModal)
      }
    },
    [applyModalStatus, handleTestError]
  )

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
      const last = lastTestRef.current
      if (!last) return
      isRetryingRef.current = true
      runTest(last.id, last.settingsId, last.isModal).finally(() => {
        isRetryingRef.current = false
      })
    },
  })

  handleAuthRequiredErrorRef.current = handleAuthRequiredError

  const start = useCallback(
    (server: MCPConfig) => {
      if (needsIntegration(server)) {
        setModalServer(server)
        setStatus(CHECKER_STATUSES.UNDEFINED)
      } else {
        runTest(server.id, undefined, false).catch(() => {
          /* reported via toaster inside runTest */
        })
      }
    },
    [runTest]
  )

  const handleModalTest = useCallback(
    (settingsId: string) => {
      if (!modalServer) return
      runTest(modalServer.id, settingsId, true).catch(() => {
        /* reported via toaster inside runTest */
      })
    },
    [modalServer, runTest]
  )

  const handleModalHide = useCallback(() => {
    setModalServer(undefined)
  }, [])

  const modal = (
    <>
      {modalServer && (
        <MCPTestIntegrationModal
          visible
          server={modalServer}
          status={status}
          onHide={handleModalHide}
          onTest={handleModalTest}
        />
      )}

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
    </>
  )

  return { start, modal }
}
