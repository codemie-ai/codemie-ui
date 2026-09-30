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

import api from '@/utils/api'

// Mirrors the OAuth2CallbackDiagnostics.waited_ms ceiling on the backend model.
const DIAGNOSTICS_MAX_WAITED_MS = 3_600_000

interface CallbackDiagnostics {
  result: 'success' | 'error' | 'timeout'
  phase: string
  waitedMs: number
  authConfigId?: string
  openerPresent?: boolean
}

// Fire-and-forget diagnostics beacon: best-effort only, must never affect the
// flow it reports on. Any failure here is swallowed by design.
export const reportCallbackDiagnostics = ({
  result,
  phase,
  waitedMs,
  authConfigId,
  openerPresent,
}: CallbackDiagnostics): void => {
  try {
    const url = `${api.BASE_URL}/v1/mcp-auth/oauth2/callback-diagnostics`
    const body = JSON.stringify({
      result,
      auth_config_id: authConfigId,
      opener_present: openerPresent,
      // The backend rejects waited_ms above its one-hour ceiling; the timeout is
      // admin-configurable and unbounded, and a 422 here would drop exactly the
      // long-wait record this beacon exists to produce.
      waited_ms: Math.min(waitedMs, DIAGNOSTICS_MAX_WAITED_MS),
      phase,
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
    // Diagnostics must never affect the behavior they report on.
  }
}
