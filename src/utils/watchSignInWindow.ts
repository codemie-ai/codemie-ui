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

import { reportCallbackDiagnostics } from './mcpAuthDiagnostics'
import { fetchMCPAuthStatus } from './mcpAuthStatus'

const CLOSED_CHECK_INTERVAL_MS = 500
const STATUS_POLL_INTERVAL_MS = 3000
// The callback page closes itself on success, so a closed window is the normal success path and
// its final status check must survive a transient fetch failure before it reads as an early close.
const CLOSED_STATUS_MAX_ATTEMPTS = 3
const CLOSED_STATUS_RETRY_DELAY_MS = 1000
// Matches the backend PKCE / callback lifetime (see useAuthCallbackListener).
const WATCH_MAX_MS = 600_000
const WINDOW_CLOSED_PHASE = 'window_closed_before_callback'

type StatusOutcome = 'authenticated' | 'unauthenticated' | 'failed'

interface WatchSignInWindowOptions {
  window: Window
  mcpConfigId: string
  onAuthenticated: () => void
  onClosedEarly: () => void
}

const wait = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms)
  })

/**
 * Watches a sign-in window we cannot receive messages from: polls the backend status and detects
 * the window closing. Resolves at most once through onAuthenticated or onClosedEarly.
 * Returns a function that stops all watching.
 *
 * Known limit: the watcher has no error channel. The callback page can post an identity-provider
 * error only to an opener, and the opener is cut on purpose, so such an error surfaces as the
 * generic closed-early outcome (or the caller's hint), never as the provider's error code.
 */
export const watchSignInWindow = ({
  window: signInWindow,
  mcpConfigId,
  onAuthenticated,
  onClosedEarly,
}: WatchSignInWindowOptions): (() => void) => {
  const startedAt = Date.now()
  let stopped = false
  let lastStatusCheckAt = startedAt

  const stop = () => {
    stopped = true
    clearInterval(tickHandle)
  }

  const fetchStatusOutcome = async (): Promise<StatusOutcome> => {
    try {
      const { status } = await fetchMCPAuthStatus(mcpConfigId)
      return status === 'authenticated' ? 'authenticated' : 'unauthenticated'
    } catch (error) {
      console.warn('[mcp-auth] Sign-in status check failed', { mcpConfigId, error })
      return 'failed'
    }
  }

  const pollStatus = async () => {
    lastStatusCheckAt = Date.now()
    const outcome = await fetchStatusOutcome()
    if (stopped || outcome !== 'authenticated') return

    stop()
    onAuthenticated()
  }

  // An explicit non-authenticated status is a verdict and ends the check at once, which keeps the
  // early-close feedback fast; only a failed fetch says nothing about the sign-in and is retried.
  const checkStatusAfterClose = async (
    attemptsLeft = CLOSED_STATUS_MAX_ATTEMPTS
  ): Promise<StatusOutcome> => {
    const outcome = await fetchStatusOutcome()
    if (outcome !== 'failed' || attemptsLeft <= 1 || stopped) return outcome

    await wait(CLOSED_STATUS_RETRY_DELAY_MS)
    return stopped ? outcome : checkStatusAfterClose(attemptsLeft - 1)
  }

  const handleWindowClosed = async () => {
    // Only the ticking ends here; the final status check may still resolve the watch.
    clearInterval(tickHandle)
    const outcome = await checkStatusAfterClose()
    if (stopped) return

    stop()
    if (outcome === 'authenticated') {
      onAuthenticated()
      return
    }

    reportCallbackDiagnostics({
      result: 'error',
      phase: WINDOW_CLOSED_PHASE,
      waitedMs: Date.now() - startedAt,
    })
    onClosedEarly()
  }

  const tick = () => {
    if (Date.now() - startedAt >= WATCH_MAX_MS) {
      stop()
    } else if (signInWindow.closed) {
      handleWindowClosed()
    } else if (Date.now() - lastStatusCheckAt >= STATUS_POLL_INTERVAL_MS) {
      pollStatus()
    }
  }

  const tickHandle = setInterval(tick, CLOSED_CHECK_INTERVAL_MS)

  return stop
}
