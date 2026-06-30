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

import { useCallback, useMemo, useRef, useState } from 'react'

import {
  AUTH_CALLBACK_TIMEOUT_MESSAGE,
  useAuthCallbackListener,
} from '@/hooks/useAuthCallbackListener'
import { MCPAuthGateServer, MCPAuthInitiateResponse } from '@/types/entity/mcpAuth'
import api from '@/utils/api'
import { parseMCPAuthRequiredErrorPayload } from '@/utils/mcpAuth'
import {
  getPendingInitiate,
  getRecoverableAuthStatus,
  MISSING_REDIRECT_HOSTNAME_MESSAGE,
  POPUP_BLOCKED_AUTH_MESSAGE,
} from '@/utils/mcpAuthInitiate'
import toaster from '@/utils/toaster'

interface UseMCPAuthPromptOptions {
  onAllAuthenticated: () => void
}

interface UseMCPAuthPromptResult {
  rows: MCPAuthGateServer[]
  handleAuthRequiredError: (error: unknown) => Promise<boolean>
  initiate: (mcpConfigId: string) => Promise<void>
  continue: (mcpConfigId: string) => void
  cancel: (mcpConfigId: string) => void
  clearRows: () => void
}

const updateRow = (
  rows: MCPAuthGateServer[],
  mcpConfigId: string,
  mutate: (row: MCPAuthGateServer) => MCPAuthGateServer
): MCPAuthGateServer[] => rows.map((row) => (row.mcp_config_id === mcpConfigId ? mutate(row) : row))

const updateRowByAuthConfigId = (
  rows: MCPAuthGateServer[],
  authConfigId: string,
  mutate: (row: MCPAuthGateServer) => MCPAuthGateServer
): MCPAuthGateServer[] =>
  rows.map((row) => (row.auth_config_id === authConfigId ? mutate(row) : row))

const safeOrigin = (url: string): string | null => {
  try {
    return new URL(url).origin
  } catch {
    return null
  }
}

export const useMCPAuthPrompt = ({
  onAllAuthenticated,
}: UseMCPAuthPromptOptions): UseMCPAuthPromptResult => {
  const [rows, setRows] = useState<MCPAuthGateServer[]>([])
  const onAllAuthenticatedRef = useRef(onAllAuthenticated)
  onAllAuthenticatedRef.current = onAllAuthenticated

  const handleAuthRequiredError = useCallback(async (error: unknown): Promise<boolean> => {
    if (!(error instanceof Response)) return false

    let parsed: MCPAuthGateServer[] | null = null
    try {
      parsed = parseMCPAuthRequiredErrorPayload(await error.clone().json())
    } catch {
      return false
    }

    if (!parsed) return false

    setRows(parsed)
    return true
  }, [])

  const initiate = useCallback(
    async (mcpConfigId: string) => {
      const row = rows.find((item) => item.mcp_config_id === mcpConfigId)
      if (!row?.initiate_url || row.status === 'authenticating' || row.pending_initiate) return

      try {
        const response = await api.post(row.initiate_url.replace(/^\//, ''), {
          mcp_config_id: row.mcp_config_id,
        })
        const payload = (await response.json()) as MCPAuthInitiateResponse

        if (!payload.auth_url) return

        if (row.auth_type === 'oauth2') {
          const pendingInitiate = getPendingInitiate(payload)

          if (!pendingInitiate) {
            toaster.error(MISSING_REDIRECT_HOSTNAME_MESSAGE)
            setRows((current) =>
              updateRow(current, mcpConfigId, (item) => ({
                ...item,
                pending_initiate: null,
                error_context: MISSING_REDIRECT_HOSTNAME_MESSAGE,
                recoverable_status: getRecoverableAuthStatus(item),
              }))
            )
            return
          }

          setRows((current) =>
            updateRow(current, mcpConfigId, (item) => ({
              ...item,
              pending_initiate: pendingInitiate,
              error_context: null,
              recoverable_status: getRecoverableAuthStatus(item),
            }))
          )
          return
        }

        const popup = window.open(payload.auth_url, '_blank')
        console.info('[mcp-auth] opened auth tab', {
          authUrlOrigin: safeOrigin(payload.auth_url),
          windowOrigin: window.location.origin,
          popupBlocked: popup === null,
        })
        setRows((current) =>
          updateRow(current, mcpConfigId, (item) => ({
            ...item,
            status: 'authenticating',
            recoverable_status: getRecoverableAuthStatus(item),
          }))
        )
      } catch (error) {
        console.error('Failed to initiate MCP authentication:', error)
        toaster.error('Failed to start MCP server authentication.')
      }
    },
    [rows]
  )

  const continueAuth = useCallback(
    (mcpConfigId: string) => {
      const pendingInitiate = rows.find(
        (row) => row.mcp_config_id === mcpConfigId
      )?.pending_initiate
      if (!pendingInitiate) return

      const popup = window.open(pendingInitiate.auth_url, '_blank')
      console.info('[mcp-auth] opened auth tab', {
        authUrlOrigin: safeOrigin(pendingInitiate.auth_url),
        windowOrigin: window.location.origin,
        popupBlocked: popup === null,
      })

      setRows((current) =>
        updateRow(current, mcpConfigId, (row) => {
          if (!row.pending_initiate) return row

          if (popup === null) {
            return {
              ...row,
              error_context: POPUP_BLOCKED_AUTH_MESSAGE,
              recoverable_status: getRecoverableAuthStatus(row),
            }
          }

          return {
            ...row,
            status: 'authenticating',
            pending_initiate: null,
            error_context: null,
            recoverable_status: getRecoverableAuthStatus(row),
          }
        })
      )
    },
    [rows]
  )

  const cancel = useCallback((mcpConfigId: string) => {
    setRows((current) =>
      updateRow(current, mcpConfigId, (row) => ({
        ...row,
        pending_initiate: null,
      }))
    )
  }, [])

  const clearRows = useCallback(() => setRows([]), [])

  const trackedAuthConfigIds = useMemo(
    () =>
      rows
        .filter((row) => row.status === 'authenticating' && row.auth_config_id)
        .map((row) => row.auth_config_id as string),
    [rows]
  )

  const onSuccess = useCallback((authConfigId: string) => {
    setRows((current) => {
      const next = updateRowByAuthConfigId(current, authConfigId, (row) => ({
        ...row,
        status: 'authenticated',
        error_context: null,
      }))

      if (next.length > 0 && next.every((row) => row.status === 'authenticated')) {
        queueMicrotask(() => {
          onAllAuthenticatedRef.current()
          setRows([])
        })
      }

      return next
    })
  }, [])

  const onError = useCallback((authConfigId: string, errorCode: string | undefined) => {
    setRows((current) =>
      updateRowByAuthConfigId(current, authConfigId, (row) => ({
        ...row,
        status: getRecoverableAuthStatus(row),
        error_context: errorCode ?? null,
      }))
    )
  }, [])

  const onTimeout = useCallback((authConfigId: string) => {
    setRows((current) =>
      updateRowByAuthConfigId(current, authConfigId, (row) => ({
        ...row,
        status: getRecoverableAuthStatus(row),
        error_context: AUTH_CALLBACK_TIMEOUT_MESSAGE,
      }))
    )
  }, [])

  useAuthCallbackListener({ trackedAuthConfigIds, onSuccess, onError, onTimeout })

  return { rows, handleAuthRequiredError, initiate, continue: continueAuth, cancel, clearRows }
}
