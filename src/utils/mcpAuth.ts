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

export const isAuthenticatingGateRow = (row: {
  status: MCPAuthGateStatus
  auth_config_id?: string | null
}): boolean => row.status === 'authenticating' && Boolean(row.auth_config_id)

// Wider than the tracking filter on purpose: a row the hint expiry rolled back is no
// longer authenticating, yet its sign-in may still complete and needs somewhere to land.
// Losing the row - a cancel, a cleared prompt, a dropped turn - is what ends that window.
export const getLiveAuthConfigIds = (rows: { auth_config_id?: string | null }[]): string[] => [
  ...new Set(rows.map((row) => row.auth_config_id).filter(Boolean) as string[]),
]

const getNonEmptyString = (value: unknown): string | null =>
  typeof value === 'string' && value ? value : null

const getConfigDisplayName = (value: Record<string, unknown>): string | null =>
  getNonEmptyString(value.mcp_config_name) ?? getNonEmptyString(value.mcp_server_name)

export const getMCPAuthGateServerKey = (row: MCPAuthGateServer): string =>
  row.mcp_config_id || row.syntheticKey || ''

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

export const UNNAMED_MCP_SERVER = 'MCP server'

export const DISCOVERY_FAILED_FALLBACK_MESSAGE =
  'Authentication discovery failed for this MCP server.'

export const isUnnamedMCPServer = (name?: string | null): boolean => {
  const trimmed = name?.trim()
  return !trimmed || trimmed === 'undefined' || trimmed === UNNAMED_MCP_SERVER
}

export const normalizeMCPAuthGateServer = (value: unknown): MCPAuthGateServer | null => {
  if (!isObject(value) || !isMCPAuthGateStatus(value.status)) return null

  const mcpConfigId = getNonEmptyString(value.mcp_config_id)
  const configName = getConfigDisplayName(value)

  // Only an unavailable server may arrive without an id or a name (inline configs). Any row the
  // user can act on - sign in, re-authenticate - needs a real id, so it is still rejected.
  if (value.status !== 'discovery_failed' && (!mcpConfigId || !configName)) return null

  const fallbackName = configName ?? UNNAMED_MCP_SERVER

  return {
    mcp_config_id: mcpConfigId ?? '',
    mcp_config_name: fallbackName,
    mcp_server_name: getNonEmptyString(value.mcp_server_name) ?? fallbackName,
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

  // When a payload mixes sign-in failures with discovery failures, the backend keeps the sign-in
  // rows in `servers` and moves the discovery rows to `warnings`. Read both so an unreachable
  // server is never dropped silently; only discovery rows are taken from `warnings`.
  const warnings = Array.isArray(value.warnings)
    ? value.warnings.filter((warning) => isObject(warning) && warning.status === 'discovery_failed')
    : []

  const rows = [...value.servers, ...warnings]
    .map((server, index) => {
      const row = normalizeMCPAuthGateServer(server)
      if (row && !row.mcp_config_id) {
        row.syntheticKey = `inline-${index}`
      }
      return row
    })
    .filter(Boolean) as MCPAuthGateServer[]

  return rows.length ? rows : null
}

export const isMCPAuthRequiredErrorPayload = (
  value: unknown
): value is MCPAuthRequiredErrorResponse => Boolean(parseMCPAuthRequiredErrorPayload(value))
