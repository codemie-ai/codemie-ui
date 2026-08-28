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

/** Stop waiting and surface an error if the test flow has not completed within this window. */
const DEFAULT_TIMEOUT_MS = 120_000

interface UseToolOAuthTestOptions {
  initiate: () => Promise<OAuthInitiateResponse>
  timeoutMs?: number
}

export interface UseToolOAuthTestReturn {
  status: OAuthStatus
  user: string
  error: string
  handleSignIn: () => Promise<void>
}

/**
 * Runs a per-user tool OAuth (GitLab/Jira/Confluence) flow WITHOUT persisting a token — the "Test"
 * on a setting form. `initiate` calls the provider's `/initiate` (which the backend forces to
 * persist_token=false); the callback page hands the result back via postMessage (correlated by the
 * signed `state`), replacing the removed `/status` polling. On success the authenticated provider
 * username, when the provider returns one, is surfaced so the toast can read "authenticated as …".
 */
export const useToolOAuthTest = ({
  initiate,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: UseToolOAuthTestOptions): UseToolOAuthTestReturn => {
  const [status, setStatus] = useState<OAuthStatus>(OAuthStatus.IDLE)
  const [user, setUser] = useState('')
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

  const handleSignIn = useCallback(async () => {
    setError('')
    setUser('')
    updateStatus(OAuthStatus.WAITING)
    try {
      const { auth_url, state } = await initiate()
      if (!auth_url || !state) {
        updateStatus(OAuthStatus.ERROR)
        setError('Unable to start the test — the sign-in service returned an invalid response.')
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
      setError(err instanceof Error ? err.message : 'Unable to start the test — please try again.')
    }
  }, [initiate, popup, updateStatus])

  // The callback page hands the result back via postMessage (correlated by the signed `state`).
  // Origin is verified against the backend that served the callback.
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
        setUser(event.data.username || '')
        updateStatus(OAuthStatus.SUCCESS)
      } else {
        updateStatus(OAuthStatus.ERROR)
        setError(event.data.error || 'Test failed — please try again.')
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [popup.matchesSource, updateStatus])

  // Bound the wait: if the callback message never arrives, stop and surface a timeout instead of
  // leaving the Test button spinning forever.
  useEffect(() => {
    if (!isWaiting) return () => {}
    const timer = setTimeout(() => {
      setIsWaiting(false)
      updateStatus(OAuthStatus.ERROR)
      setError('Timed out waiting for the test to complete — please try again.')
    }, timeoutMs)
    return () => clearTimeout(timer)
  }, [isWaiting, timeoutMs, updateStatus])

  return { status, user, error, handleSignIn }
}
