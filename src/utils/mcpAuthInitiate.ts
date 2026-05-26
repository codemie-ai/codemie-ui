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

import {
  MCPAuthGateServer,
  MCPAuthInitiateResponse,
  MCPAuthPendingInitiate,
  MCPAuthRecoverableStatus,
} from '@/types/entity/mcpAuth'

export const MISSING_REDIRECT_HOSTNAME_MESSAGE =
  'Authentication response did not include a redirect URI hostname. Retry authentication.'

export const POPUP_BLOCKED_AUTH_MESSAGE =
  'Browser blocked the sign-in window. Allow popups and try again.'

export const getRecoverableAuthStatus = (row: MCPAuthGateServer): MCPAuthRecoverableStatus =>
  row.recoverable_status ??
  (row.status === 'session_expired' ? 'session_expired' : 'authentication_required')

export const getPendingInitiate = (
  payload: MCPAuthInitiateResponse
): MCPAuthPendingInitiate | null => {
  const redirectUriHostname = payload.redirect_uri_hostname

  if (typeof redirectUriHostname !== 'string' || !redirectUriHostname.trim()) {
    return null
  }

  return {
    auth_url: payload.auth_url,
    redirect_uri_hostname: redirectUriHostname,
    localhost_warning: payload.localhost_warning ?? false,
  }
}
