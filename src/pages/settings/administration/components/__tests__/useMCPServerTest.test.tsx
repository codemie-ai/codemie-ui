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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FC } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { mcpStore } from '@/store/mcp'
import { MCPConfig } from '@/types/entity/mcp'

import { useMCPServerTest } from '../useMCPServerTest'

const mocks = vi.hoisted(() => ({
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}))

vi.mock('@/utils/toaster', () => ({
  default: { success: mocks.success, error: mocks.error, info: mocks.info },
}))

vi.mock('../MCPTestIntegrationModal', () => ({
  default: ({ visible, status, onHide, onTest }: any) =>
    visible ? (
      <div>
        <span>status:{status}</span>
        <button type="button" onClick={() => onTest('settings-1')}>
          run-test
        </button>
        <button type="button" onClick={onHide}>
          hide
        </button>
      </div>
    ) : null,
}))

const withoutIntegration = {
  id: 'mcp-1',
  name: 'Plain',
  required_env_vars: [],
} as unknown as MCPConfig
const withIntegration = {
  id: 'mcp-2',
  name: 'Needs it',
  required_env_vars: [{ name: 'TOKEN', description: '', required: true }],
} as unknown as MCPConfig

let startFn: ((server: MCPConfig) => void) | null = null

const Harness: FC = () => {
  const { start, modal } = useMCPServerTest()
  startFn = start
  return <>{modal}</>
}

describe('useMCPServerTest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mcpStore.testingConfigIds = []
    startFn = null
  })

  it('runs immediately with settingsId undefined for a server that needs no integration', async () => {
    const spy = vi.spyOn(mcpStore, 'testConfig').mockResolvedValue({
      id: 'mcp-1',
      status: 'success',
      tools_count: 3,
    } as any)
    render(<Harness />)

    startFn!(withoutIntegration)

    await waitFor(() => expect(spy).toHaveBeenCalledWith('mcp-1', undefined))
    await waitFor(() =>
      expect(mocks.success).toHaveBeenCalledWith('MCP connection test successful (3 tools)')
    )
  })

  it('reports a warning with the backend message, falling back to a default', async () => {
    vi.spyOn(mcpStore, 'testConfig').mockResolvedValue({
      id: 'mcp-1',
      status: 'warning',
      message: 'be careful',
    } as any)
    render(<Harness />)

    startFn!(withoutIntegration)

    await waitFor(() => expect(mocks.info).toHaveBeenCalledWith('be careful'))
  })

  it('falls back to the default warning message when none is returned', async () => {
    vi.spyOn(mcpStore, 'testConfig').mockResolvedValue({
      id: 'mcp-1',
      status: 'warning',
      message: null,
    } as any)
    render(<Harness />)

    startFn!(withoutIntegration)

    await waitFor(() =>
      expect(mocks.info).toHaveBeenCalledWith('Connected, but the server returned no tools.')
    )
  })

  it('reports a failure toast with the backend message', async () => {
    vi.spyOn(mcpStore, 'testConfig').mockResolvedValue({
      id: 'mcp-1',
      status: 'failure',
      message: 'boom',
    } as any)
    render(<Harness />)

    startFn!(withoutIntegration)

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('boom'))
  })

  it('reports a thrown error via toaster.error', async () => {
    vi.spyOn(mcpStore, 'testConfig').mockRejectedValue(new Error('network down'))
    render(<Harness />)

    startFn!(withoutIntegration)

    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith('network down'))
  })

  it('opens the modal without calling testConfig when the server needs an integration', async () => {
    const spy = vi.spyOn(mcpStore, 'testConfig')
    render(<Harness />)

    startFn!(withIntegration)

    expect(await screen.findByText('status:undefined')).toBeInTheDocument()
    expect(spy).not.toHaveBeenCalled()
  })

  it("sets a non-SUCCESS Checker status when the modal's test result is a warning", async () => {
    vi.spyOn(mcpStore, 'testConfig').mockResolvedValue({
      id: 'mcp-2',
      status: 'warning',
      message: 'no tools',
    } as any)
    const user = userEvent.setup()
    render(<Harness />)

    startFn!(withIntegration)
    await screen.findByText('status:undefined')

    await user.click(screen.getByRole('button', { name: 'run-test' }))

    await waitFor(() => expect(mocks.info).toHaveBeenCalledWith('no tools'))
    expect(screen.queryByText('status:success')).not.toBeInTheDocument()
    expect(screen.getByText('status:warning')).toBeInTheDocument()
  })

  it("runs the modal's onTest and keeps the modal open; only onHide closes it", async () => {
    vi.spyOn(mcpStore, 'testConfig').mockResolvedValue({
      id: 'mcp-2',
      status: 'success',
      tools_count: 1,
    } as any)
    const user = userEvent.setup()
    render(<Harness />)

    startFn!(withIntegration)
    await screen.findByText('status:undefined')

    await user.click(screen.getByRole('button', { name: 'run-test' }))

    await waitFor(() => expect(screen.getByText('status:success')).toBeInTheDocument())
    expect(screen.queryByText('run-test')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'hide' }))
    expect(screen.queryByText('run-test')).not.toBeInTheDocument()
  })

  it('handles 401 Response rejection with auth-required message', async () => {
    const response = new Response(null, { status: 401, statusText: 'Unauthorized' })
    vi.spyOn(mcpStore, 'testConfig').mockRejectedValue(response)
    render(<Harness />)

    startFn!(withoutIntegration)

    await waitFor(() =>
      expect(mocks.error).toHaveBeenCalledWith(
        'Authentication required — please add your credentials'
      )
    )
  })

  it('does not toast for Response rejection when the modal is not running', async () => {
    const response = new Response(null, { status: 404, statusText: 'Not Found' })
    vi.spyOn(mcpStore, 'testConfig').mockRejectedValue(response)
    mocks.error.mockClear()
    render(<Harness />)

    startFn!(withoutIntegration)

    await waitFor(() => expect(mcpStore.testConfig).toHaveBeenCalled())
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('does not toast for non-401 Response rejections (api.post already toasted)', async () => {
    const response = new Response(null, { status: 500, statusText: 'Server Error' })
    vi.spyOn(mcpStore, 'testConfig').mockRejectedValue(response)
    mocks.error.mockClear()
    render(<Harness />)

    startFn!(withIntegration)
    await screen.findByText('status:undefined')
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'run-test' }))

    await waitFor(() => expect(screen.getByText('status:failed')).toBeInTheDocument())
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('shows the MCP auth-required gate instead of a generic toast on a 401 auth payload', async () => {
    const response = new Response(
      JSON.stringify({
        error: 'authentication_required',
        servers: [
          {
            mcp_config_id: 'mcp-1',
            mcp_config_name: 'GitHub MCP',
            mcp_server_name: 'GitHub',
            auth_config_id: 'auth-1',
            auth_type: 'oauth2',
            status: 'authentication_required',
            initiate_url: '/v1/mcp-auth/oauth2/initiate',
          },
        ],
      }),
      { status: 401, headers: { 'content-type': 'application/json' } }
    )
    vi.spyOn(mcpStore, 'testConfig').mockRejectedValue(response)
    render(<Harness />)

    startFn!(withoutIntegration)

    expect(await screen.findByText('MCP authentication required')).toBeInTheDocument()
    expect(screen.getByText('GitHub MCP')).toBeInTheDocument()
    expect(mocks.error).not.toHaveBeenCalled()
  })

  it('shows a broker login prompt when the response carries an auth location header', async () => {
    const response = new Response(null, {
      status: 401,
      headers: { 'x-user-mcp-auth-location': 'https://broker.example.com/login' },
    })
    vi.spyOn(mcpStore, 'testConfig').mockRejectedValue(response)
    render(<Harness />)

    startFn!(withoutIntegration)

    expect(await screen.findByRole('button', { name: 'Login to MCP Server' })).toBeInTheDocument()
    expect(mocks.error).not.toHaveBeenCalled()
  })
})
