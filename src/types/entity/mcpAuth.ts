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

export type MCPAuthType = 'oauth2' | 'saml'

export type MCPAuthResolvedStatus =
  | 'authenticated'
  | 'authentication_required'
  | 'session_expired'
  | 'config_error'

export type MCPAuthGateStatus = MCPAuthResolvedStatus | 'authenticating' | 'discovery_failed'
export type MCPAuthRecoverableStatus = Extract<
  MCPAuthResolvedStatus,
  'authentication_required' | 'session_expired'
>

export interface MCPAuthGateServer {
  mcp_config_id: string
  mcp_config_name: string
  mcp_server_name: string
  auth_config_id?: string | null
  auth_type?: MCPAuthType | null
  as_hostname?: string | null
  status: MCPAuthGateStatus
  error_context?: string | null
  initiate_url?: string | null
  recoverable_status?: MCPAuthRecoverableStatus | null
}

export interface MCPAuthStatusResponse extends MCPAuthGateServer {
  auth_config_id: string
  auth_type: MCPAuthType
  as_hostname: string | null
  status: MCPAuthResolvedStatus
  error_context: string | null
  initiate_url: string
}

export interface MCPAuthRequiredErrorResponse {
  error: 'authentication_required'
  servers: MCPAuthGateServer[]
}

export interface MCPAuthInitiateResponse {
  auth_url: string
  redirect_uri_hostname?: string
  localhost_warning?: boolean
}
