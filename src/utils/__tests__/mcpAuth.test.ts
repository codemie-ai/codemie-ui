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

import { describe, it, expect } from 'vitest'

import {
  getLiveAuthConfigIds,
  getMCPAuthGateServerKey,
  isAuthenticatingGateRow,
  isMCPAuthRequiredErrorPayload,
  isUnnamedMCPServer,
  normalizeMCPAuthGateServer,
  parseMCPAuthRequiredErrorPayload,
  UNNAMED_MCP_SERVER,
} from '@/utils/mcpAuth'

// The 401 body the backend sends for an inline figma MCP config whose auth discovery failed.
const FIGMA_DISCOVERY_FAILED_PAYLOAD = {
  error: 'authentication_required',
  servers: [
    {
      status: 'discovery_failed',
      mcp_config_id: null,
      mcp_config_name: 'figma',
      mcp_server_name: 'figma',
      error_context:
        'Discovery failed: no_trusted_authorization_server. Add the AS domain to the trust allowlist or configure auth_config manually for this server.',
    },
  ],
}

const AUTH_REQUIRED_SERVER = {
  status: 'authentication_required',
  mcp_config_id: 'mcp-1',
  mcp_config_name: 'GitHub',
  mcp_server_name: 'GitHub',
  auth_config_id: 'auth-1',
  auth_type: 'oauth2',
  initiate_url: '/v1/mcp-auth/oauth2/initiate',
}

describe('parseMCPAuthRequiredErrorPayload', () => {
  it('keeps the inline figma discovery_failed row instead of dropping it', () => {
    const rows = parseMCPAuthRequiredErrorPayload(FIGMA_DISCOVERY_FAILED_PAYLOAD)

    expect(rows).toEqual([
      expect.objectContaining({
        status: 'discovery_failed',
        mcp_config_id: '',
        mcp_config_name: 'figma',
        mcp_server_name: 'figma',
        error_context: FIGMA_DISCOVERY_FAILED_PAYLOAD.servers[0].error_context,
        syntheticKey: 'inline-0',
      }),
    ])
    expect(isMCPAuthRequiredErrorPayload(FIGMA_DISCOVERY_FAILED_PAYLOAD)).toBe(true)
  })

  it('gives each inline row its own synthetic key and none to rows with an id', () => {
    const rows = parseMCPAuthRequiredErrorPayload({
      error: 'authentication_required',
      servers: [
        { status: 'discovery_failed', mcp_config_id: null, mcp_config_name: 'figma' },
        AUTH_REQUIRED_SERVER,
        { status: 'discovery_failed', mcp_config_id: null, mcp_config_name: 'miro' },
      ],
    })

    expect(rows?.map((row) => row.syntheticKey)).toEqual(['inline-0', undefined, 'inline-2'])
  })

  it('still rejects an id-less row the user would have to sign in to', () => {
    const payload = {
      error: 'authentication_required',
      servers: [{ ...AUTH_REQUIRED_SERVER, mcp_config_id: null }],
    }

    expect(parseMCPAuthRequiredErrorPayload(payload)).toBeNull()
    expect(isMCPAuthRequiredErrorPayload(payload)).toBe(false)
  })

  it('surfaces discovery failures sent in `warnings` alongside sign-in rows', () => {
    const rows = parseMCPAuthRequiredErrorPayload({
      error: 'authentication_required',
      servers: [AUTH_REQUIRED_SERVER],
      warnings: FIGMA_DISCOVERY_FAILED_PAYLOAD.servers,
    })

    expect(rows).toEqual([
      expect.objectContaining({ mcp_config_id: 'mcp-1', status: 'authentication_required' }),
      expect.objectContaining({
        mcp_config_name: 'figma',
        status: 'discovery_failed',
        syntheticKey: 'inline-1',
      }),
    ])
  })

  it('ignores `warnings` entries that are not discovery failures', () => {
    const rows = parseMCPAuthRequiredErrorPayload({
      error: 'authentication_required',
      servers: [AUTH_REQUIRED_SERVER],
      warnings: [{ ...AUTH_REQUIRED_SERVER, mcp_config_id: 'mcp-2' }, 'not-a-row'],
    })

    expect(rows).toHaveLength(1)
    expect(rows?.[0].mcp_config_id).toBe('mcp-1')
  })

  it('returns null for payloads that are not MCP auth gates', () => {
    expect(parseMCPAuthRequiredErrorPayload({ error: 'jira_auth_required' })).toBeNull()
    expect(parseMCPAuthRequiredErrorPayload({ error: 'authentication_required' })).toBeNull()
    expect(parseMCPAuthRequiredErrorPayload(null)).toBeNull()
  })
})

describe('isAuthenticatingGateRow', () => {
  it('returns true when status is authenticating and auth_config_id is present', () => {
    expect(isAuthenticatingGateRow({ status: 'authenticating', auth_config_id: 'a-1' })).toBe(true)
  })

  it('returns false when status is authenticating but auth_config_id is null', () => {
    expect(isAuthenticatingGateRow({ status: 'authenticating', auth_config_id: null })).toBe(false)
  })

  it('returns false when status is authenticating but auth_config_id is undefined', () => {
    expect(isAuthenticatingGateRow({ status: 'authenticating', auth_config_id: undefined })).toBe(
      false
    )
  })

  it('returns false when status is authentication_required with an id', () => {
    expect(
      isAuthenticatingGateRow({ status: 'authentication_required', auth_config_id: 'a-1' })
    ).toBe(false)
  })

  it('returns false when status is authenticated with an id', () => {
    expect(isAuthenticatingGateRow({ status: 'authenticated', auth_config_id: 'a-1' })).toBe(false)
  })
})

describe('getLiveAuthConfigIds', () => {
  it('collects ids in every status, de-duplicated and in first-seen order', () => {
    expect(
      getLiveAuthConfigIds([
        { auth_config_id: 'a-1' },
        { auth_config_id: 'a-2' },
        { auth_config_id: 'a-1' },
      ])
    ).toEqual(['a-1', 'a-2'])
  })

  it('drops rows carrying no usable auth_config_id', () => {
    expect(getLiveAuthConfigIds([{ auth_config_id: '' }, { auth_config_id: null }, {}])).toEqual([])
  })
})

describe('normalizeMCPAuthGateServer', () => {
  it('admits a discovery_failed row with no id and no name, using the fallback name', () => {
    expect(normalizeMCPAuthGateServer({ status: 'discovery_failed', mcp_config_id: null })).toEqual(
      expect.objectContaining({
        status: 'discovery_failed',
        mcp_config_id: '',
        mcp_config_name: UNNAMED_MCP_SERVER,
        mcp_server_name: UNNAMED_MCP_SERVER,
      })
    )
  })

  it('falls back to mcp_server_name when mcp_config_name is missing', () => {
    expect(
      normalizeMCPAuthGateServer({
        status: 'discovery_failed',
        mcp_config_id: null,
        mcp_server_name: 'figma',
      })
    ).toEqual(expect.objectContaining({ mcp_config_name: 'figma', mcp_server_name: 'figma' }))
  })

  it('rejects an actionable row that has no id or no name', () => {
    expect(normalizeMCPAuthGateServer({ ...AUTH_REQUIRED_SERVER, mcp_config_id: null })).toBeNull()
    expect(
      normalizeMCPAuthGateServer({
        status: 'authentication_required',
        mcp_config_id: 'mcp-1',
      })
    ).toBeNull()
  })

  it('returns null for non-objects and unknown statuses', () => {
    expect(normalizeMCPAuthGateServer(null)).toBeNull()
    expect(normalizeMCPAuthGateServer({ status: 'bogus', mcp_config_id: 'a' })).toBeNull()
  })

  it('builds a complete row with a recoverable status for an identified server', () => {
    expect(normalizeMCPAuthGateServer(AUTH_REQUIRED_SERVER)).toEqual(
      expect.objectContaining({
        mcp_config_id: 'mcp-1',
        mcp_config_name: 'GitHub',
        auth_config_id: 'auth-1',
        recoverable_status: 'authentication_required',
      })
    )
  })
})

describe('getMCPAuthGateServerKey', () => {
  const base = normalizeMCPAuthGateServer(AUTH_REQUIRED_SERVER)!

  it('prefers mcp_config_id over syntheticKey', () => {
    expect(getMCPAuthGateServerKey({ ...base, syntheticKey: 'inline-3' })).toBe('mcp-1')
  })

  it('uses syntheticKey when there is no id', () => {
    expect(getMCPAuthGateServerKey({ ...base, mcp_config_id: '', syntheticKey: 'inline-3' })).toBe(
      'inline-3'
    )
  })

  it('returns an empty string when neither is set', () => {
    expect(getMCPAuthGateServerKey({ ...base, mcp_config_id: '' })).toBe('')
  })
})

describe('isUnnamedMCPServer', () => {
  it('treats empty, "undefined" and the placeholder as unnamed', () => {
    expect(isUnnamedMCPServer(undefined)).toBe(true)
    expect(isUnnamedMCPServer('  ')).toBe(true)
    expect(isUnnamedMCPServer('undefined')).toBe(true)
    expect(isUnnamedMCPServer(UNNAMED_MCP_SERVER)).toBe(true)
    expect(isUnnamedMCPServer('figma')).toBe(false)
  })
})
