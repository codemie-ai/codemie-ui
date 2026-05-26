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

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { MCPAuthGateServer } from '@/types/entity/mcpAuth'

import MCPToolsSelectionStep from '../MCPToolkitForm/MCPToolsSelectionStep'
import MCPToolkitTest, { MCPToolkitTestProvider, MCPToolkitTestTrigger } from '../MCPToolkitTest'

import type { MouseEvent, ReactNode } from 'react'

const { mockInitiate, mockContinue, mockCancel, mockClearRows, mockGetMcpTools, mockTestMCP } =
  vi.hoisted(() => ({
    mockInitiate: vi.fn(),
    mockContinue: vi.fn(),
    mockCancel: vi.fn(),
    mockClearRows: vi.fn(),
    mockGetMcpTools: vi.fn(),
    mockTestMCP: vi.fn(),
  }))

const pendingRow: MCPAuthGateServer = {
  mcp_config_id: 'mcp-1',
  mcp_config_name: 'GitHub',
  mcp_server_name: 'GitHub',
  auth_config_id: 'auth-1',
  auth_type: 'oauth2',
  as_hostname: 'login.github.com',
  status: 'authentication_required',
  error_context: null,
  initiate_url: '/v1/mcp-auth/oauth2/initiate',
  recoverable_status: 'authentication_required',
  pending_initiate: {
    auth_url: 'https://idp.example.com/start',
    redirect_uri_hostname: 'api.example.com',
    localhost_warning: false,
  },
}

vi.mock('valtio', () => ({
  useSnapshot: (store: unknown) => store,
}))

vi.mock('@/store', () => ({
  assistantsStore: {
    getMcpTools: (...args: unknown[]) => mockGetMcpTools(...args),
    testMCP: (...args: unknown[]) => mockTestMCP(...args),
  },
}))

vi.mock('@/hooks/useMCPAuthPrompt', () => ({
  useMCPAuthPrompt: () => ({
    rows: [pendingRow],
    handleAuthRequiredError: vi.fn(),
    initiate: (...args: unknown[]) => mockInitiate(...args),
    continue: (...args: unknown[]) => mockContinue(...args),
    cancel: (...args: unknown[]) => mockCancel(...args),
    clearRows: (...args: unknown[]) => mockClearRows(...args),
  }),
}))

vi.mock('@/pages/chat/components/AssistantAuthGate/AssistantAuthGateRow', () => ({
  default: ({
    row,
    onAuthenticate,
    onContinue,
    onCancel,
  }: {
    row: MCPAuthGateServer
    onAuthenticate: (mcpConfigId: string) => void
    onContinue: (mcpConfigId: string) => void
    onCancel: (mcpConfigId: string) => void
  }) => (
    <div data-testid={`auth-row-${row.mcp_config_id}`}>
      <button onClick={() => onAuthenticate(row.mcp_config_id)}>
        initiate {row.mcp_config_id}
      </button>
      <button onClick={() => onContinue(row.mcp_config_id)}>continue {row.mcp_config_id}</button>
      <button onClick={() => onCancel(row.mcp_config_id)}>cancel {row.mcp_config_id}</button>
    </div>
  ),
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? <div>{children}</div> : null,
}))

vi.mock('@/components/Checker', () => ({
  default: ({ onCheck }: { onCheck: (event: MouseEvent<HTMLButtonElement>) => void }) => (
    <button onClick={onCheck}>Test Connection</button>
  ),
}))

const mcpServer = {
  name: 'github',
  url: 'https://mcp.example.com',
} as any

describe('MCP auth prompt wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMcpTools.mockResolvedValue([{ tools: [] }])
    mockTestMCP.mockResolvedValue({ success: true })
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('passes hook-owned pending Continue and Cancel behavior through MCPToolsSelectionStep', async () => {
    const user = userEvent.setup()

    render(
      <MCPToolsSelectionStep
        isEditing={false}
        mcpServer={mcpServer}
        selectedTools={[]}
        onToolsChange={vi.fn()}
        onBack={vi.fn()}
        onCancel={vi.fn()}
        onSave={vi.fn()}
      />
    )

    await user.click(screen.getByRole('button', { name: 'continue mcp-1' }))
    await user.click(screen.getByRole('button', { name: 'cancel mcp-1' }))

    expect(mockContinue).toHaveBeenCalledWith('mcp-1')
    expect(mockCancel).toHaveBeenCalledWith('mcp-1')
    expect(window.open).not.toHaveBeenCalled()
  })

  it('passes hook-owned pending Continue and Cancel behavior through MCPToolkitTest popup rows', async () => {
    const user = userEvent.setup()

    render(<MCPToolkitTest mcpServer={mcpServer} />)

    await user.click(screen.getByRole('button', { name: 'continue mcp-1' }))
    await user.click(screen.getByRole('button', { name: 'cancel mcp-1' }))

    expect(mockContinue).toHaveBeenCalledWith('mcp-1')
    expect(mockCancel).toHaveBeenCalledWith('mcp-1')
    expect(window.open).not.toHaveBeenCalled()
  })

  it('keeps the auth dialog mounted after the trigger unmounts (e.g. dropdown closes)', async () => {
    const user = userEvent.setup()

    const Harness = ({ showTrigger }: { showTrigger: boolean }) => (
      <MCPToolkitTestProvider mcpServer={mcpServer}>
        {showTrigger ? <MCPToolkitTestTrigger /> : null}
      </MCPToolkitTestProvider>
    )

    const { rerender } = render(<Harness showTrigger />)

    expect(screen.getByTestId('auth-row-mcp-1')).toBeInTheDocument()

    rerender(<Harness showTrigger={false} />)

    expect(screen.getByTestId('auth-row-mcp-1')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'initiate mcp-1' }))
    expect(mockInitiate).toHaveBeenCalledWith('mcp-1')
  })
})
