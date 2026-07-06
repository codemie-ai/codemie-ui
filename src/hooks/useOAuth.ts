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

import { useState, useRef, useCallback } from 'react'

import { usePolling } from '@/hooks/usePolling'
import { usePopupWindow } from '@/hooks/usePopupWindow'
import { OAuthInitiateResponse, OAuthStatus, OAuthStatusResponse } from '@/types/entity/dataSource'

interface UseOAuthOptions {
  initiate: () => Promise<OAuthInitiateResponse>
  getStatus: (state: string) => Promise<OAuthStatusResponse & { email?: string }>
  onStatusChange?: (status: OAuthStatus) => void
  onAuthStateChange?: (state: string) => void
  pollInterval?: number
  initialStatus?: OAuthStatus
  initialUserEmail?: string
}

interface UseOAuthReturn {
  status: OAuthStatus
  user: string
  error: string
  oauthState: string | null
  handleSignIn: () => Promise<void>
  handleReauthenticate: () => Promise<void>
  cancel: () => void
}

export const useOAuth = ({
  initiate,
  getStatus,
  onStatusChange,
  onAuthStateChange,
  pollInterval = 2000,
  initialStatus = OAuthStatus.IDLE,
  initialUserEmail = '',
}: UseOAuthOptions): UseOAuthReturn => {
  const [status, setStatus] = useState<OAuthStatus>(initialStatus)
  const [user, setUser] = useState<string>(initialUserEmail)
  const [error, setError] = useState<string>('')
  const [isPolling, setIsPolling] = useState(false)
  const [oauthState, setOauthState] = useState<string | null>(null)

  const stateRef = useRef<string | null>(null)
  const reauthModeRef = useRef(false)
  const previousUserRef = useRef('')

  // Readable ref so onClose callback sees current status without stale closure
  const statusRef = useRef<OAuthStatus>(initialStatus)

  const updateStatus = useCallback(
    (s: OAuthStatus) => {
      statusRef.current = s
      setStatus(s)
      onStatusChange?.(s)
    },
    [onStatusChange]
  )

  const cancel = useCallback(() => {
    setIsPolling(false)
    if (reauthModeRef.current) {
      updateStatus(OAuthStatus.SUCCESS)
      setUser(previousUserRef.current)
      setError('')
    } else {
      updateStatus(OAuthStatus.IDLE)
      setError('')
    }
  }, [updateStatus])

  const popup = usePopupWindow({
    onClose: useCallback(() => {
      // Only revert if we're still mid-flow; after SUCCESS/ERROR the popup auto-closes
      if (statusRef.current !== OAuthStatus.WAITING) return
      cancel()
    }, [cancel]),
  })

  const startFlow = useCallback(
    async (reauth: boolean) => {
      setError('')
      updateStatus(OAuthStatus.WAITING)

      try {
        const { auth_url, state } = await initiate()
        stateRef.current = state
        setOauthState(state)
        onAuthStateChange?.(state)
        reauthModeRef.current = reauth

        const opened = popup.open(auth_url)
        if (!opened) {
          updateStatus(OAuthStatus.ERROR)
          return
        }

        updateStatus(OAuthStatus.WAITING)
        setIsPolling(true)
      } catch (err: unknown) {
        updateStatus(OAuthStatus.ERROR)
        setError(err instanceof Error ? err.message : 'Unable to connect — please try again.')
      }
    },
    [initiate, popup, updateStatus]
  )

  const handleSignIn = useCallback(async () => {
    await startFlow(false)
  }, [startFlow])

  const handleReauthenticate = useCallback(async () => {
    previousUserRef.current = user
    await startFlow(true)
  }, [startFlow, user])

  // Status polling
  usePolling({
    fetchFn: useCallback(async () => {
      const state = stateRef.current
      if (!state) return
      const result = await getStatus(state)
      if (result.status === 'success') {
        setUser(result.email ?? '')
        updateStatus(OAuthStatus.SUCCESS)
        setError('')
        setIsPolling(false)
      } else if (result.status === 'error') {
        const msg = result.message ?? 'Authorization failed — please try again.'
        if (reauthModeRef.current) {
          updateStatus(OAuthStatus.SUCCESS)
          setUser(previousUserRef.current)
        } else {
          updateStatus(OAuthStatus.ERROR)
          setError(msg)
        }
        setIsPolling(false)
      }
    }, [getStatus, updateStatus]),
    enabled: isPolling,
    interval: pollInterval,
  })

  return { status, user, error, oauthState, handleSignIn, handleReauthenticate, cancel }
}
