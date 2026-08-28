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

import { useCallback, useEffect, useRef, useState } from 'react'

import { getToolOAuthCallbackOrigin, isToolOAuthCallbackMessage } from '@/hooks/toolOAuthCallback'
import { usePopupWindow } from '@/hooks/usePopupWindow'
import { OAuthInitiateResponse, OAuthStatus } from '@/types/entity/dataSource'

/** Stop waiting and surface an error if sign-in has not completed within this window. */
const DEFAULT_TIMEOUT_MS = 120_000

interface OAuthConnectionStatusResponse {
  status: 'connected' | 'not_connected'
  username: string
}

interface UseOAuthConnectOptions {
  settingId: string
  timeoutMs?: number
  connect: (settingId: string) => Promise<OAuthInitiateResponse>
  getConnectionStatus: (settingId: string) => Promise<OAuthConnectionStatusResponse>
}

export interface UseOAuthConnectReturn {
  status: OAuthStatus
  username: string
  error: string
  handleConnect: () => Promise<void>
  refreshStatus: () => Promise<void>
}

export const useOAuthConnect = ({
  settingId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  connect,
  getConnectionStatus,
}: UseOAuthConnectOptions): UseOAuthConnectReturn => {
  const [status, setStatus] = useState<OAuthStatus>(OAuthStatus.IDLE)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [isWaiting, setIsWaiting] = useState(false)

  const stateRef = useRef<string | null>(null)
  const statusRef = useRef<OAuthStatus>(OAuthStatus.IDLE)

  const updateStatus = useCallback((s: OAuthStatus) => {
    statusRef.current = s
    setStatus(s)
  }, [])

  const popup = usePopupWindow({
    onClose: useCallback(() => {
      if (statusRef.current !== OAuthStatus.WAITING) return
      setIsWaiting(false)
      updateStatus(OAuthStatus.IDLE)
    }, [updateStatus]),
  })

  const refreshStatus = useCallback(async () => {
    try {
      const result = await getConnectionStatus(settingId)
      if (result.status === 'connected') {
        setUsername(result.username)
        updateStatus(OAuthStatus.SUCCESS)
      } else {
        updateStatus(OAuthStatus.IDLE)
      }
    } catch (err: unknown) {
      updateStatus(OAuthStatus.ERROR)
      setError(
        err instanceof Error ? err.message : 'Unable to check connection status — please try again.'
      )
    }
  }, [getConnectionStatus, settingId, updateStatus])

  const handleConnect = useCallback(async () => {
    setError('')
    updateStatus(OAuthStatus.WAITING)
    try {
      const { auth_url, state } = await connect(settingId)
      if (!auth_url || !state) {
        updateStatus(OAuthStatus.ERROR)
        setError('Unable to connect — the sign-in service returned an invalid response.')
        return
      }
      stateRef.current = state

      const opened = popup.open(auth_url)
      if (!opened) {
        updateStatus(OAuthStatus.ERROR)
        setError('Popup blocked — allow popups and try again.')
        return
      }
      setIsWaiting(true)
    } catch (err: unknown) {
      updateStatus(OAuthStatus.ERROR)
      setError(err instanceof Error ? err.message : 'Unable to connect — please try again.')
    }
  }, [connect, popup, settingId, updateStatus])

  // The callback page hands the result back via postMessage (correlated by the signed `state`),
  // replacing the old /status polling. Origin is verified against the API that served the callback.
  useEffect(() => {
    const apiOrigin = getToolOAuthCallbackOrigin()

    const handleMessage = (event: MessageEvent) => {
      if (!isToolOAuthCallbackMessage(event.data)) return
      // The signed `state` is the cryptographic correlation. Additionally require the message to
      // come from the popup we opened, OR from the configured backend origin — the callback host
      // (per-integration `callback_base_url`) is not always what the browser derives as the API
      // origin, so a plain `event.origin === apiOrigin` gate drops valid messages in that case.
      if (event.data.state !== stateRef.current) return
      const fromOurPopup = popup.matchesSource(event.source)
      const fromApiOrigin = !!apiOrigin && event.origin === apiOrigin
      if (!fromOurPopup && !fromApiOrigin) return

      setIsWaiting(false)
      if (event.data.status === 'success') {
        setError('')
        if (event.data.username) setUsername(event.data.username)
        updateStatus(OAuthStatus.SUCCESS)
      } else {
        updateStatus(OAuthStatus.ERROR)
        setError(event.data.error || 'Authorization failed — please try again.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [popup.matchesSource, updateStatus])

  // Bound the wait: if the callback message never arrives (popup closed elsewhere, provider stalls),
  // stop and surface a timeout instead of leaving the user in "Waiting for sign-in…" forever.
  useEffect(() => {
    if (!isWaiting) return () => {}
    const timer = setTimeout(() => {
      setIsWaiting(false)
      updateStatus(OAuthStatus.ERROR)
      setError('Timed out waiting for sign-in — please try again.')
    }, timeoutMs)
    return () => clearTimeout(timer)
  }, [isWaiting, timeoutMs, updateStatus])

  return { status, username, error, handleConnect, refreshStatus }
}
