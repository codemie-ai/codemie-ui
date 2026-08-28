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

// Shared plumbing for the per-user tool OAuth (GitLab/Jira/Confluence) postMessage callback, used by
// both the connect flow (`useOAuthConnect`) and the credential test flow (`useToolOAuthTest`).

import { appInfoStore } from '@/store/appInfo'
import api from '@/utils/api'

// postMessage the OAuth callback page sends to the opener window when the flow completes. Must match
// the backend (`oauth_html_utils.TOOL_OAUTH_CALLBACK_EVENT_TYPE`).
export const TOOL_OAUTH_CALLBACK_EVENT_TYPE = 'tool_oauth_callback'

export interface ToolOAuthCallbackMessage {
  type: string
  status: 'success' | 'error'
  state: string | null
  username?: string
  error?: string
}

/** Origin the callback page's postMessage arrives from (the backend that served the callback).
 *
 * Mirrors `useAuthCallbackListener`: the configured backend origin wins, because the API is often
 * reached through a relative path (`VITE_API_URL=/api`) while the OAuth callback is served from the
 * real backend origin (`CALLBACK_API_BASE_URL`) — so `window.location.origin` would be wrong. */
export const getToolOAuthCallbackOrigin = (): string | null => {
  const configured = appInfoStore.getMcpAuthOrigin()
  if (configured) {
    try {
      return new URL(configured).origin
    } catch {
      return null
    }
  }
  try {
    if (/^https?:\/\//i.test(api.BASE_URL)) return new URL(api.BASE_URL).origin
    return window.location.origin
  } catch {
    return null
  }
}

export const isToolOAuthCallbackMessage = (data: unknown): data is ToolOAuthCallbackMessage => {
  if (!data || typeof data !== 'object') return false
  const message = data as Partial<ToolOAuthCallbackMessage>
  return (
    message.type === TOOL_OAUTH_CALLBACK_EVENT_TYPE &&
    (message.status === 'success' || message.status === 'error') &&
    typeof message.state === 'string' &&
    message.state.length > 0
  )
}
