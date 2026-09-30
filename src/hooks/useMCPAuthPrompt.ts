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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  AUTH_CALLBACK_HINT_MESSAGE,
  useAuthCallbackListener,
} from '@/hooks/useAuthCallbackListener'
import { MCPAuthGateServer, MCPAuthInitiateResponse } from '@/types/entity/mcpAuth'
import api from '@/utils/api'
import {
  getLiveAuthConfigIds,
  isAuthenticatingGateRow,
  parseMCPAuthRequiredErrorPayload,
} from '@/utils/mcpAuth'
import {
  getPendingInitiate,
  getRecoverableAuthStatus,
  INVALID_AUTH_URL_MESSAGE,
  MISSING_REDIRECT_HOSTNAME_MESSAGE,
  POPUP_BLOCKED_AUTH_MESSAGE,
  SIGN_IN_WINDOW_CLOSED_MESSAGE,
} from '@/utils/mcpAuthInitiate'
import { openSignInWindow } from '@/utils/openSignInWindow'
import toaster from '@/utils/toaster'
import { watchSignInWindow } from '@/utils/watchSignInWindow'

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

const OPEN_FAILURE_MESSAGES = {
  blocked: POPUP_BLOCKED_AUTH_MESSAGE,
  invalid_url: INVALID_AUTH_URL_MESSAGE,
} as const

export const useMCPAuthPrompt = ({
  onAllAuthenticated,
}: UseMCPAuthPromptOptions): UseMCPAuthPromptResult => {
  const [rows, setRows] = useState<MCPAuthGateServer[]>([])
  const onAllAuthenticatedRef = useRef(onAllAuthenticated)
  onAllAuthenticatedRef.current = onAllAuthenticated
  const watchersRef = useRef<Map<string, () => void>>(new Map())

  const stopWatcher = useCallback((authConfigId: string | null | undefined) => {
    if (!authConfigId) return

    watchersRef.current.get(authConfigId)?.()
    watchersRef.current.delete(authConfigId)
  }, [])

  const stopAllWatchers = useCallback(() => {
    watchersRef.current.forEach((stop) => stop())
    watchersRef.current.clear()
  }, [])

  useEffect(() => stopAllWatchers, [stopAllWatchers])

  const handleAuthRequiredError = useCallback(
    async (error: unknown): Promise<boolean> => {
      if (!(error instanceof Response)) return false

      let parsed: MCPAuthGateServer[] | null = null
      try {
        parsed = parseMCPAuthRequiredErrorPayload(await error.clone().json())
      } catch {
        return false
      }

      if (!parsed) return false

      stopAllWatchers()
      setRows(parsed)
      return true
    },
    [stopAllWatchers]
  )

  const onSuccess = useCallback(
    (authConfigId: string) => {
      stopWatcher(authConfigId)
      setRows((current) => {
        // The poll and the postMessage can both report the same success; handle it once.
        const target = current.find((row) => row.auth_config_id === authConfigId)
        if (!target || target.status === 'authenticated') return current

        const next = updateRowByAuthConfigId(current, authConfigId, (row) => ({
          ...row,
          status: 'authenticated',
          error_context: null,
        }))

        if (next.every((row) => row.status === 'authenticated')) {
          queueMicrotask(() => {
            onAllAuthenticatedRef.current()
            setRows([])
          })
        }

        return next
      })
    },
    [stopWatcher]
  )

  const onError = useCallback(
    (authConfigId: string, errorCode: string | undefined) => {
      stopWatcher(authConfigId)
      setRows((current) =>
        updateRowByAuthConfigId(current, authConfigId, (row) => ({
          ...row,
          status: getRecoverableAuthStatus(row),
          error_context: errorCode ?? null,
        }))
      )
    },
    [stopWatcher]
  )

  const onTimeout = useCallback((authConfigId: string) => {
    setRows((current) =>
      updateRowByAuthConfigId(current, authConfigId, (row) => ({
        ...row,
        status: getRecoverableAuthStatus(row),
        error_context: AUTH_CALLBACK_HINT_MESSAGE,
      }))
    )
  }, [])

  const onSignInWindowClosed = useCallback(
    (authConfigId: string) => {
      stopWatcher(authConfigId)
      setRows((current) =>
        updateRowByAuthConfigId(current, authConfigId, (row) => ({
          ...row,
          status: getRecoverableAuthStatus(row),
          error_context: SIGN_IN_WINDOW_CLOSED_MESSAGE,
          sign_in_window_closed: true,
        }))
      )
    },
    [stopWatcher]
  )

  const openSignIn = useCallback(
    (row: MCPAuthGateServer, authUrl: string) => {
      const authConfigId = row.auth_config_id
      stopWatcher(authConfigId)

      const result = openSignInWindow(authUrl)
      console.info('[mcp-auth] opened auth tab', {
        authUrlOrigin: safeOrigin(authUrl),
        windowOrigin: window.location.origin,
        popupBlocked: result.status === 'blocked',
      })

      if (result.status !== 'opened') {
        setRows((current) =>
          updateRow(current, row.mcp_config_id, (item) => ({
            ...item,
            // A malformed url fails identically on retry, so it must not keep the confirmation.
            pending_initiate: result.status === 'invalid_url' ? null : item.pending_initiate,
            error_context: OPEN_FAILURE_MESSAGES[result.status],
            recoverable_status: getRecoverableAuthStatus(item),
          }))
        )
        return
      }

      if (authConfigId) {
        watchersRef.current.set(
          authConfigId,
          watchSignInWindow({
            window: result.window,
            mcpConfigId: row.mcp_config_id,
            onAuthenticated: () => onSuccess(authConfigId),
            onClosedEarly: () => onSignInWindowClosed(authConfigId),
          })
        )
      }

      setRows((current) =>
        updateRow(current, row.mcp_config_id, (item) => ({
          ...item,
          status: 'authenticating',
          pending_initiate: null,
          error_context: null,
          sign_in_window_closed: false,
          recoverable_status: getRecoverableAuthStatus(item),
        }))
      )
    },
    [onSuccess, onSignInWindowClosed, stopWatcher]
  )

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

        openSignIn(row, payload.auth_url)
      } catch (error) {
        console.error('Failed to initiate MCP authentication:', error)
        toaster.error('Failed to start MCP server authentication.')
      }
    },
    [rows, openSignIn]
  )

  const continueAuth = useCallback(
    (mcpConfigId: string) => {
      const row = rows.find((item) => item.mcp_config_id === mcpConfigId)
      if (!row?.pending_initiate) return

      openSignIn(row, row.pending_initiate.auth_url)
    },
    [rows, openSignIn]
  )

  const cancel = useCallback(
    (mcpConfigId: string) => {
      stopWatcher(rows.find((row) => row.mcp_config_id === mcpConfigId)?.auth_config_id)
      setRows((current) =>
        updateRow(current, mcpConfigId, (row) => ({
          ...row,
          pending_initiate: null,
        }))
      )
    },
    [rows, stopWatcher]
  )

  const clearRows = useCallback(() => {
    stopAllWatchers()
    setRows([])
  }, [stopAllWatchers])

  const trackedAuthConfigIds = useMemo(
    () => rows.filter(isAuthenticatingGateRow).map((row) => row.auth_config_id as string),
    [rows]
  )

  // A row whose window closed early can no longer receive a callback, so its id stops being live
  // and the listener ends the acceptance window instead of beaconing a false timeout.
  const liveAuthConfigIds = useMemo(
    () => getLiveAuthConfigIds(rows.filter((row) => !row.sign_in_window_closed)),
    [rows]
  )

  useAuthCallbackListener({
    trackedAuthConfigIds,
    liveAuthConfigIds,
    onSuccess,
    onError,
    onTimeout,
  })

  return { rows, handleAuthRequiredError, initiate, continue: continueAuth, cancel, clearRows }
}
