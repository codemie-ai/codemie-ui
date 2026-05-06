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
  MCPAuthGateStatus,
  MCPAuthRecoverableStatus,
  MCPAuthRequiredErrorResponse,
  MCPAuthType,
} from '@/types/entity/mcpAuth'

const MCP_AUTH_GATE_STATUSES: MCPAuthGateStatus[] = [
  'authenticated',
  'authentication_required',
  'authenticating',
  'session_expired',
  'config_error',
  'discovery_failed',
]

const RECOVERABLE_STATUSES: MCPAuthRecoverableStatus[] = [
  'authentication_required',
  'session_expired',
]

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const isMCPAuthType = (value: unknown): value is MCPAuthType =>
  value === 'oauth2' || value === 'saml'

const isMCPAuthGateStatus = (value: unknown): value is MCPAuthGateStatus =>
  typeof value === 'string' && MCP_AUTH_GATE_STATUSES.includes(value as MCPAuthGateStatus)

const isRecoverableStatus = (value: unknown): value is MCPAuthRecoverableStatus =>
  typeof value === 'string' && RECOVERABLE_STATUSES.includes(value as MCPAuthRecoverableStatus)

const getNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null

const getConfigDisplayName = (value: Record<string, unknown>): string | null =>
  getNonEmptyString(value.mcp_config_name) ?? getNonEmptyString(value.mcp_server_name)

const getRecoverableStatus = (
  status: MCPAuthGateStatus,
  value: Record<string, unknown>
): MCPAuthRecoverableStatus | null => {
  if (isRecoverableStatus(value.recoverable_status)) {
    return value.recoverable_status
  }

  if (status === 'authentication_required' || status === 'session_expired') {
    return status
  }

  return null
}

export const normalizeMCPAuthGateServer = (value: unknown): MCPAuthGateServer | null => {
  if (!isObject(value) || !isMCPAuthGateStatus(value.status)) return null

  const mcpConfigId = getNonEmptyString(value.mcp_config_id)
  const configName = getConfigDisplayName(value)

  if (!mcpConfigId || !configName) return null

  return {
    mcp_config_id: mcpConfigId,
    mcp_config_name: configName,
    mcp_server_name: getNonEmptyString(value.mcp_server_name) ?? configName,
    auth_config_id: getNonEmptyString(value.auth_config_id),
    auth_type: isMCPAuthType(value.auth_type) ? value.auth_type : null,
    as_hostname: getNonEmptyString(value.as_hostname),
    status: value.status,
    error_context: getNonEmptyString(value.error_context),
    initiate_url: getNonEmptyString(value.initiate_url),
    recoverable_status: getRecoverableStatus(value.status, value),
  }
}

export const parseMCPAuthRequiredErrorPayload = (value: unknown): MCPAuthGateServer[] | null => {
  if (
    !isObject(value) ||
    value.error !== 'authentication_required' ||
    !Array.isArray(value.servers)
  ) {
    return null
  }

  const rows = value.servers
    .map((server) => normalizeMCPAuthGateServer(server))
    .filter(Boolean) as MCPAuthGateServer[]

  return rows.length ? rows : null
}

export const isMCPAuthRequiredErrorPayload = (
  value: unknown
): value is MCPAuthRequiredErrorResponse => Boolean(parseMCPAuthRequiredErrorPayload(value))
