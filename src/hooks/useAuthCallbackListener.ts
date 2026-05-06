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

import { useEffect, useRef, useState } from 'react'

import api from '@/utils/api'

const AUTH_CALLBACK_EVENT_TYPE = 'mcp_auth_callback'
const AUTH_CALLBACK_TIMEOUT_SECONDS = 60
const AUTH_CALLBACK_TIMEOUT_MS = AUTH_CALLBACK_TIMEOUT_SECONDS * 1000
const AUTH_CALLBACK_TIMEOUT_MESSAGE = "Authentication didn't complete. Click to try again."
const EMPTY_AUTH_CONFIG_IDS: string[] = []

type AuthCallbackMessageStatus = 'success' | 'error'
type AuthFlowStatus = 'authenticating' | 'authentication_required' | 'error'

interface AuthCallbackMessage {
  type: string
  status: AuthCallbackMessageStatus
  auth_config_id: string
  error?: string
}

interface AuthFlowState {
  status: AuthFlowStatus
  message?: string
  error?: string
}

interface UseAuthCallbackListenerOptions {
  trackedAuthConfigIds?: string[]
  timeoutMs?: number
  onSuccess?: (authConfigId: string) => void
  onError?: (authConfigId: string, errorCode: string | undefined) => void
  onTimeout?: (authConfigId: string) => void
}

interface UseAuthCallbackListenerResult {
  authFlows: Record<string, AuthFlowState>
}

const getApiOrigin = (): string | null => {
  const configured = window._env_?.VITE_MCP_AUTH_ORIGIN ?? import.meta.env.VITE_MCP_AUTH_ORIGIN
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      return null
    }
  }
  try {
    if (/^https?:\/\//i.test(api.BASE_URL)) {
      return new URL(api.BASE_URL).origin
    }
    return window.location.origin
  } catch {
    return null
  }
}

const isAuthCallbackMessage = (data: unknown): data is AuthCallbackMessage => {
  if (!data || typeof data !== 'object') return false

  const message = data as Partial<AuthCallbackMessage>
  return (
    message.type === AUTH_CALLBACK_EVENT_TYPE &&
    (message.status === 'success' || message.status === 'error') &&
    typeof message.auth_config_id === 'string' &&
    message.auth_config_id.length > 0
  )
}

const getPositiveInteger = (value: unknown): number | null => {
  let parsedValue = Number.NaN

  if (typeof value === 'number') {
    parsedValue = value
  } else if (typeof value === 'string' && /^\d+$/.test(value)) {
    parsedValue = Number(value)
  }

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) return null

  return parsedValue
}

const getAuthCallbackTimeoutSeconds = (): number =>
  getPositiveInteger(
    window._env_?.VITE_MCP_AUTH_AUTHENTICATING_TIMEOUT_SECONDS ??
      import.meta.env.VITE_MCP_AUTH_AUTHENTICATING_TIMEOUT_SECONDS
  ) ?? AUTH_CALLBACK_TIMEOUT_SECONDS

// Keep the UI timeout <= the backend PKCE lifetime.
const getAuthCallbackTimeoutMs = (): number => getAuthCallbackTimeoutSeconds() * 1000

export const useAuthCallbackListener = ({
  trackedAuthConfigIds = EMPTY_AUTH_CONFIG_IDS,
  timeoutMs,
  onSuccess,
  onError,
  onTimeout,
}: UseAuthCallbackListenerOptions = {}): UseAuthCallbackListenerResult => {
  const [authFlows, setAuthFlows] = useState<Record<string, AuthFlowState>>({})
  const timeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const trackedIdsRef = useRef<Set<string>>(new Set())
  const onSuccessRef = useRef<UseAuthCallbackListenerOptions['onSuccess']>(undefined)
  const onErrorRef = useRef<UseAuthCallbackListenerOptions['onError']>(undefined)
  const onTimeoutRef = useRef<UseAuthCallbackListenerOptions['onTimeout']>(undefined)

  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    onTimeoutRef.current = onTimeout
  }, [onError, onSuccess, onTimeout])

  useEffect(() => {
    const resolvedTimeoutMs = timeoutMs ?? getAuthCallbackTimeoutMs()
    const nextTrackedIds = new Set(trackedAuthConfigIds.filter(Boolean))
    const previousTrackedIds = trackedIdsRef.current

    const onIdTimeout = (authConfigId: string) => {
      delete timeoutsRef.current[authConfigId]
      setAuthFlows((current) => ({
        ...current,
        [authConfigId]: {
          status: 'authentication_required',
          message: AUTH_CALLBACK_TIMEOUT_MESSAGE,
        },
      }))
      onTimeoutRef.current?.(authConfigId)
    }

    previousTrackedIds.forEach((authConfigId) => {
      if (nextTrackedIds.has(authConfigId)) return

      const timeoutHandle = timeoutsRef.current[authConfigId]
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
        delete timeoutsRef.current[authConfigId]
      }

      setAuthFlows((current) => {
        if (!(authConfigId in current)) return current

        const next = { ...current }
        delete next[authConfigId]
        return next
      })
    })

    nextTrackedIds.forEach((authConfigId) => {
      if (previousTrackedIds.has(authConfigId)) return

      const timeoutHandle = setTimeout(() => onIdTimeout(authConfigId), resolvedTimeoutMs)

      timeoutsRef.current[authConfigId] = timeoutHandle
      setAuthFlows((current) => ({
        ...current,
        [authConfigId]: {
          status: 'authenticating',
        },
      }))
    })

    trackedIdsRef.current = nextTrackedIds
  }, [timeoutMs, trackedAuthConfigIds])

  useEffect(() => {
    const apiOrigin = getApiOrigin()

    const handleMessage = (event: MessageEvent) => {
      if (!apiOrigin || event.origin !== apiOrigin) return
      if (!isAuthCallbackMessage(event.data)) return
      if (!trackedIdsRef.current.has(event.data.auth_config_id)) return

      const timeoutHandle = timeoutsRef.current[event.data.auth_config_id]
      if (timeoutHandle) {
        clearTimeout(timeoutHandle)
        delete timeoutsRef.current[event.data.auth_config_id]
      }

      setAuthFlows((current) => ({
        ...current,
        [event.data.auth_config_id]:
          event.data.status === 'success'
            ? { status: 'authentication_required' }
            : {
                status: 'error',
                error: event.data.error,
              },
      }))

      if (event.data.status === 'success') {
        onSuccessRef.current?.(event.data.auth_config_id)
        return
      }

      onErrorRef.current?.(event.data.auth_config_id, event.data.error)
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  useEffect(
    () => () => {
      Object.values(timeoutsRef.current).forEach((timeoutHandle) => clearTimeout(timeoutHandle))
      timeoutsRef.current = {}
      trackedIdsRef.current = new Set()
    },
    []
  )

  return { authFlows }
}

export {
  AUTH_CALLBACK_EVENT_TYPE,
  AUTH_CALLBACK_TIMEOUT_MESSAGE,
  AUTH_CALLBACK_TIMEOUT_MS,
  getAuthCallbackTimeoutMs,
}
export type { AuthFlowState, AuthFlowStatus, AuthCallbackMessage }
