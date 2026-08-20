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

import { appInfoStore } from '@/store/appInfo'
import api from '@/utils/api'

const AUTH_CALLBACK_EVENT_TYPE = 'mcp_auth_callback'

// Stage 1 — presentation only: how long the spinner shows before the row
// returns to an actionable state. Overridable via `mcpAuthTimeoutSeconds`.
const AUTH_CALLBACK_HINT_SECONDS = 60

// Stage 2 — how long a callback is still applied. Mirrors the shorter of the
// backend lifetimes gating this flow, each verified at its own definition site:
//   _PKCE_TTL_SECONDS 600 s — `codemie-enterprise`, mcp_auth/redis_pkce_store.py
//   _CALLBACK_STATE_MAX_AGE 10 min — `codemie`, enterprise/mcp_auth/_constants.py
// The 900 s DISCOVERED_FLOW_TTL_SECONDS (`codemie-enterprise`,
// mcp_auth/discovered_flow.py) is the looser bound and does not gate this value.
const AUTH_CALLBACK_ACCEPTANCE_SECONDS = 600
const AUTH_CALLBACK_ACCEPTANCE_MS = AUTH_CALLBACK_ACCEPTANCE_SECONDS * 1000

const AUTH_CALLBACK_HINT_MESSAGE =
  'Sign-in is taking longer than usual. It can still complete — or click to try again.'
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
  // Every auth_config_id the caller still holds a row for, whatever its status - a
  // superset of the tracked ids. Losing one is how a cancel, a clearRows or a dropped
  // turn ends an acceptance window the hint expiry already untracked. Omit it (as a
  // caller with a single, never-cancelled flow does) to leave that window open.
  liveAuthConfigIds?: string[]
  // Identifies the caller context these ids belong to - a chat id, say. Only the
  // context that started a flow may end it, so switching context never cancels the
  // flow the previous one is still waiting on.
  contextKey?: string
  timeoutMs?: number
  onSuccess?: (authConfigId: string) => void
  onError?: (authConfigId: string, errorCode: string | undefined) => void
  onTimeout?: (authConfigId: string) => void
}

interface UseAuthCallbackListenerResult {
  authFlows: Record<string, AuthFlowState>
}

// Where a flow came from, captured when tracking begins. A late callback is dispatched
// through these handlers rather than the current ones, so it reaches the context that
// opened the sign-in instead of whichever one happens to be on screen when it lands.
interface AuthFlowOrigin {
  contextKey: string
  onSuccess?: UseAuthCallbackListenerOptions['onSuccess']
  onError?: UseAuthCallbackListenerOptions['onError']
}

const getApiOrigin = (): string | null => {
  const configured = appInfoStore.getMcpAuthOrigin()
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

const getAuthCallbackHintSeconds = (): number =>
  getPositiveInteger(appInfoStore.getMcpAuthTimeoutSeconds()) ?? AUTH_CALLBACK_HINT_SECONDS

const getAuthCallbackHintMs = (): number => getAuthCallbackHintSeconds() * 1000

// The acceptance window never shortens the spinner lifetime: a hint configured
// beyond the backend floor widens it instead.
const getAuthCallbackAcceptanceMs = (hintMs: number): number =>
  Math.max(hintMs, AUTH_CALLBACK_ACCEPTANCE_MS)

const clearTrackedTimeout = (
  timeouts: Record<string, ReturnType<typeof setTimeout>>,
  authConfigId: string
): void => {
  const handle = timeouts[authConfigId]
  if (!handle) return

  clearTimeout(handle)
  delete timeouts[authConfigId]
}

// Mirrors the OAuth2CallbackDiagnostics.waited_ms ceiling on the backend model.
const DIAGNOSTICS_MAX_WAITED_MS = 3_600_000

// Fire-and-forget diagnostics beacon: best-effort only, must never affect the
// timeout flow it reports on. Any failure here is swallowed by design.
const reportCallbackTimeoutDiagnostics = (authConfigId: string, waitedMs: number): void => {
  try {
    const url = `${api.BASE_URL}/v1/mcp-auth/oauth2/callback-diagnostics`
    const body = JSON.stringify({
      result: 'timeout',
      auth_config_id: authConfigId,
      opener_present: false,
      // The backend rejects waited_ms above its one-hour ceiling; the timeout is
      // admin-configurable and unbounded, and a 422 here would drop exactly the
      // long-wait record this beacon exists to produce.
      waited_ms: Math.min(waitedMs, DIAGNOSTICS_MAX_WAITED_MS),
      phase: 'awaiting_callback',
    })

    if (typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
      return
    }

    fetch(url, {
      method: 'POST',
      keepalive: true,
      headers: { 'content-type': 'application/json' },
      body,
    }).catch(() => {
      // Diagnostics must never surface a transport failure to the user.
    })
  } catch {
    // Diagnostics must never affect the timeout behavior they report on.
  }
}

export const useAuthCallbackListener = ({
  trackedAuthConfigIds = EMPTY_AUTH_CONFIG_IDS,
  liveAuthConfigIds,
  contextKey = '',
  timeoutMs,
  onSuccess,
  onError,
  onTimeout,
}: UseAuthCallbackListenerOptions = {}): UseAuthCallbackListenerResult => {
  const [authFlows, setAuthFlows] = useState<Record<string, AuthFlowState>>({})
  const hintTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const acceptanceTimeoutsRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const trackedIdsRef = useRef<Set<string>>(new Set())
  const retainedIdsRef = useRef<Set<string>>(new Set())
  const flowOriginsRef = useRef<Map<string, AuthFlowOrigin>>(new Map())
  const onSuccessRef = useRef<UseAuthCallbackListenerOptions['onSuccess']>(undefined)
  const onErrorRef = useRef<UseAuthCallbackListenerOptions['onError']>(undefined)
  const onTimeoutRef = useRef<UseAuthCallbackListenerOptions['onTimeout']>(undefined)

  useEffect(() => {
    onSuccessRef.current = onSuccess
    onErrorRef.current = onError
    onTimeoutRef.current = onTimeout
  }, [onError, onSuccess, onTimeout])

  useEffect(() => {
    const resolvedHintMs = timeoutMs ?? getAuthCallbackHintMs()
    const resolvedAcceptanceMs = getAuthCallbackAcceptanceMs(resolvedHintMs)
    const nextTrackedIds = new Set(trackedAuthConfigIds.filter(Boolean))
    const previousTrackedIds = trackedIdsRef.current

    const onIdHintExpiry = (authConfigId: string) => {
      console.warn(`[mcp-auth] Timed out waiting for auth callback after ${resolvedHintMs}ms`, {
        authConfigId,
      })
      delete hintTimeoutsRef.current[authConfigId]
      retainedIdsRef.current.add(authConfigId)
      setAuthFlows((current) => ({
        ...current,
        [authConfigId]: {
          status: 'authentication_required',
          message: AUTH_CALLBACK_HINT_MESSAGE,
        },
      }))
      onTimeoutRef.current?.(authConfigId)
    }

    const onIdAcceptanceExpiry = (authConfigId: string) => {
      console.warn(
        `[mcp-auth] Auth callback acceptance window elapsed after ${resolvedAcceptanceMs}ms`,
        { authConfigId }
      )
      delete acceptanceTimeoutsRef.current[authConfigId]
      retainedIdsRef.current.delete(authConfigId)
      flowOriginsRef.current.delete(authConfigId)
      reportCallbackTimeoutDiagnostics(authConfigId, resolvedAcceptanceMs)
    }

    previousTrackedIds.forEach((authConfigId) => {
      if (nextTrackedIds.has(authConfigId)) return

      clearTrackedTimeout(hintTimeoutsRef.current, authConfigId)

      // Untracking a retained id is the consumer reacting to the hint expiry, so the
      // acceptance stage stays armed and a late callback is still applied. Untracking
      // for any other reason - cancel, clearRows, chat switch, a replaced row - tears
      // both stages down, so an abandoned flow never beacons a false timeout.
      if (!retainedIdsRef.current.has(authConfigId)) {
        clearTrackedTimeout(acceptanceTimeoutsRef.current, authConfigId)
        flowOriginsRef.current.delete(authConfigId)
      }

      setAuthFlows((current) => {
        if (!(authConfigId in current)) return current

        const next = { ...current }
        delete next[authConfigId]
        return next
      })
    })

    // A flow the hint expiry already untracked has no untrack transition left to hook:
    // its rollback dropped the id from `trackedAuthConfigIds` on the very next render, so
    // a later cancel, clearRows or dropped turn would otherwise be invisible here. The id
    // leaving its own context's live set is that missing signal - it ends the acceptance
    // stage, so an abandoned sign-in neither beacons a false timeout nor applies a late
    // callback. Another context's render reports only its own ids and so ends nothing.
    if (liveAuthConfigIds) {
      const nextLiveIds = new Set(liveAuthConfigIds.filter(Boolean))

      retainedIdsRef.current.forEach((authConfigId) => {
        if (nextLiveIds.has(authConfigId)) return
        if (flowOriginsRef.current.get(authConfigId)?.contextKey !== contextKey) return

        clearTrackedTimeout(acceptanceTimeoutsRef.current, authConfigId)
        retainedIdsRef.current.delete(authConfigId)
        flowOriginsRef.current.delete(authConfigId)
      })
    }

    nextTrackedIds.forEach((authConfigId) => {
      if (previousTrackedIds.has(authConfigId)) return

      console.info(`[mcp-auth] Awaiting auth callback (timeout ${resolvedHintMs}ms)`, {
        authConfigId,
      })
      // A retry re-tracks an id whose acceptance timer is still armed from the previous
      // attempt; drop it so one id can never hold two timers - and with it the previous
      // retention, which this attempt's own tracking now supersedes.
      clearTrackedTimeout(hintTimeoutsRef.current, authConfigId)
      clearTrackedTimeout(acceptanceTimeoutsRef.current, authConfigId)
      retainedIdsRef.current.delete(authConfigId)
      flowOriginsRef.current.set(authConfigId, {
        contextKey,
        onSuccess: onSuccessRef.current,
        onError: onErrorRef.current,
      })

      hintTimeoutsRef.current[authConfigId] = setTimeout(
        () => onIdHintExpiry(authConfigId),
        resolvedHintMs
      )
      acceptanceTimeoutsRef.current[authConfigId] = setTimeout(
        () => onIdAcceptanceExpiry(authConfigId),
        resolvedAcceptanceMs
      )
      setAuthFlows((current) => ({
        ...current,
        [authConfigId]: {
          status: 'authenticating',
        },
      }))
    })

    trackedIdsRef.current = nextTrackedIds
  }, [contextKey, liveAuthConfigIds, timeoutMs, trackedAuthConfigIds])

  useEffect(() => {
    const apiOrigin = getApiOrigin()

    console.info('[mcp-auth] listener ready', {
      apiOrigin,
      windowOrigin: window.location.origin,
    })

    const handleMessage = (event: MessageEvent) => {
      // Diagnostics: surface any message that claims to be an auth callback, even if
      // it is later dropped (bad shape, unexpected origin, or untracked id), so a lost
      // postMessage is visible. Unrelated (non-callback) messages are still never logged.
      const observed = event.data as Partial<AuthCallbackMessage> | undefined
      if (observed?.type === AUTH_CALLBACK_EVENT_TYPE) {
        console.info('[mcp-auth] message observed', {
          origin: event.origin,
          expectedApiOrigin: apiOrigin,
          status: observed.status,
          authConfigId: observed.auth_config_id,
          shapeValid: isAuthCallbackMessage(event.data),
          tracked: observed.auth_config_id
            ? trackedIdsRef.current.has(observed.auth_config_id)
            : false,
          retained: observed.auth_config_id
            ? retainedIdsRef.current.has(observed.auth_config_id)
            : false,
        })
      }

      // Inspect the message shape before the origin so unrelated cross-origin messages
      // are never logged; the origin is still verified before any state change below.
      if (!isAuthCallbackMessage(event.data)) return
      if (!apiOrigin || event.origin !== apiOrigin) {
        console.warn('[mcp-auth] Ignoring auth callback from unexpected origin', {
          origin: event.origin,
          expected: apiOrigin,
          authConfigId: event.data.auth_config_id,
        })
        return
      }
      if (
        !trackedIdsRef.current.has(event.data.auth_config_id) &&
        !retainedIdsRef.current.has(event.data.auth_config_id)
      ) {
        console.warn('[mcp-auth] Ignoring auth callback for untracked auth_config_id', {
          authConfigId: event.data.auth_config_id,
          tracked: Array.from(trackedIdsRef.current),
          retained: Array.from(retainedIdsRef.current),
        })
        return
      }

      console.info('[mcp-auth] Received auth callback', {
        status: event.data.status,
        authConfigId: event.data.auth_config_id,
        error: event.data.error,
      })

      // A retained flow is one its own context has stopped waiting on, so it is dispatched
      // through the handlers captured when it started rather than the current ones.
      const lateFlowOrigin = retainedIdsRef.current.has(event.data.auth_config_id)
        ? flowOriginsRef.current.get(event.data.auth_config_id)
        : undefined

      clearTrackedTimeout(hintTimeoutsRef.current, event.data.auth_config_id)
      clearTrackedTimeout(acceptanceTimeoutsRef.current, event.data.auth_config_id)
      retainedIdsRef.current.delete(event.data.auth_config_id)
      flowOriginsRef.current.delete(event.data.auth_config_id)

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
        ;(lateFlowOrigin?.onSuccess ?? onSuccessRef.current)?.(event.data.auth_config_id)
        return
      }

      ;(lateFlowOrigin?.onError ?? onErrorRef.current)?.(
        event.data.auth_config_id,
        event.data.error
      )
    }

    window.addEventListener('message', handleMessage)

    return () => {
      window.removeEventListener('message', handleMessage)
    }
  }, [])

  useEffect(
    () => () => {
      Object.values(hintTimeoutsRef.current).forEach((timeoutHandle) => clearTimeout(timeoutHandle))
      Object.values(acceptanceTimeoutsRef.current).forEach((timeoutHandle) =>
        clearTimeout(timeoutHandle)
      )
      hintTimeoutsRef.current = {}
      acceptanceTimeoutsRef.current = {}
      trackedIdsRef.current = new Set()
      retainedIdsRef.current = new Set()
      flowOriginsRef.current = new Map()
    },
    []
  )

  return { authFlows }
}

export {
  AUTH_CALLBACK_EVENT_TYPE,
  AUTH_CALLBACK_HINT_MESSAGE,
  AUTH_CALLBACK_ACCEPTANCE_MS,
  getAuthCallbackHintMs,
  getAuthCallbackAcceptanceMs,
}
export type { AuthFlowState, AuthFlowStatus, AuthCallbackMessage }
