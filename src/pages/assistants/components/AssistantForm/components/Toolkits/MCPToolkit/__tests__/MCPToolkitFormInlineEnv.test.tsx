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
import { beforeEach, describe, expect, it, vi } from 'vitest'

import MCPToolkitForm from '../MCPToolkitForm'
import MCPToolkitTest from '../MCPToolkitTest'

import type { MouseEvent, ReactNode } from 'react'

const {
  mockGetMcpTools,
  mockTestMCP,
  mockFindUserSetting,
  mockCreateUserSetting,
  mockUpdateUserSetting,
  formValues,
  envState,
} = vi.hoisted(() => ({
  mockGetMcpTools: vi.fn(),
  mockTestMCP: vi.fn(),
  mockFindUserSetting: vi.fn(),
  mockCreateUserSetting: vi.fn(),
  mockUpdateUserSetting: vi.fn(),
  formValues: {
    name: 'github',
    description: 'desc',
    tokensSizeLimit: null,
    connectUrl: '',
    configJson: '{}',
    useCustomConfig: false,
  } as Record<string, unknown>,
  envState: {
    envVarMode: 'new' as 'new' | 'existing',
    settings: undefined as unknown,
    manualEnvVarValues: {} as Record<string, string>,
  },
}))

vi.mock('@/store/appInfo', () => ({ appInfoStore: { configs: [] } }))

vi.mock('valtio', () => ({
  useSnapshot: (store: unknown) => store,
}))

vi.mock('@/store', () => ({
  assistantsStore: {
    getMcpTools: (...args: unknown[]) => mockGetMcpTools(...args),
    testMCP: (...args: unknown[]) => mockTestMCP(...args),
  },
}))

vi.mock('@/store/userSettings', () => ({
  userSettingsStore: {
    findUserSetting: (...args: unknown[]) => mockFindUserSetting(...args),
    createUserSetting: (...args: unknown[]) => mockCreateUserSetting(...args),
    updateUserSetting: (...args: unknown[]) => mockUpdateUserSetting(...args),
    resetIsSettingsIndexed: vi.fn(),
  },
}))

vi.mock('@/hooks/useMCPAuthPrompt', () => ({
  useMCPAuthPrompt: () => ({
    rows: [],
    handleAuthRequiredError: vi.fn(),
    initiate: vi.fn(),
    continue: vi.fn(),
    cancel: vi.fn(),
    clearRows: vi.fn(),
  }),
}))

vi.mock('@/components/Popup', () => ({
  default: ({ visible, children }: { visible: boolean; children: ReactNode }) =>
    visible ? <div>{children}</div> : null,
}))

vi.mock('@/components/Checker', () => ({
  default: ({ onCheck }: { onCheck: (event: MouseEvent<HTMLButtonElement>) => void }) => (
    <button type="button" onClick={onCheck}>
      Test Connection
    </button>
  ),
}))

vi.mock('../MCPToolkitForm/useMCPForm', () => ({
  useMCPForm: () => ({
    form: {
      control: {},
      setValue: vi.fn(),
      getValues: () => ({ ...formValues }),
      watch: () => ({ ...formValues }),
      handleSubmit: (fn: () => void) => (e?: { preventDefault?: () => void }) => {
        e?.preventDefault?.()
        return fn()
      },
      reset: vi.fn(),
      trigger: vi.fn().mockResolvedValue(true),
    },
    configHasEnv: false,
    isEditing: false,
  }),
}))

vi.mock('../MCPToolkitForm/useEnvVarMode', () => ({
  useEnvVarMode: (server?: { isFromMarketplace?: boolean; required_env_vars?: unknown[] }) => ({
    ...envState,
    setEnvVarMode: vi.fn(),
    setSettings: vi.fn(),
    setManualEnvVarValues: vi.fn(),
    envVarErrors: {},
    validateManualEnvVars: () => true,
    resetEnvVarState: vi.fn(),
    shouldCreateNewEnvVarSetting: () =>
      envState.envVarMode === 'new' &&
      !!server?.required_env_vars?.length &&
      !!server?.isFromMarketplace,
  }),
}))

vi.mock('../MCPToolkitForm/MCPServerConfigStep', () => ({
  default: ({ serverConfig, onNext }: { serverConfig: any; onNext: () => void }) => (
    <div>
      <MCPToolkitTest mcpServer={serverConfig} />
      <button type="button" onClick={onNext}>
        Next
      </button>
    </div>
  ),
}))

const marketplaceServer = {
  name: 'github',
  mcp_config_id: 'cfg-1',
  isFromMarketplace: true,
  required_env_vars: [{ name: 'A', required: true }],
} as any

const renderForm = (props: Record<string, unknown> = {}) => {
  const baseProps = {
    isVisible: true,
    mcpServer: marketplaceServer,
    settingsDefinitions: [],
    onHide: vi.fn(),
    updateMcpServer: vi.fn(),
    showNewIntegrationPopup: vi.fn(),
    project: 'proj',
    refreshSettings: vi.fn(),
  }
  const ui = (extra: Record<string, unknown>) => (
    <MCPToolkitForm {...(baseProps as any)} {...props} {...extra} />
  )
  const result = render(ui({}))
  return { ...result, rerenderWith: (extra: Record<string, unknown>) => result.rerender(ui(extra)) }
}

const expectNoPersistence = () => {
  expect(mockFindUserSetting).not.toHaveBeenCalled()
  expect(mockCreateUserSetting).not.toHaveBeenCalled()
  expect(mockUpdateUserSetting).not.toHaveBeenCalled()
}

const staleSetting = { id: 'stale-id', credential_type: 'MCP', project_name: 'old' }

describe('MCPToolkitForm inline env settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetMcpTools.mockResolvedValue([{ tools: [] }])
    mockTestMCP.mockResolvedValue({ success: true })
    formValues.useCustomConfig = false
    envState.envVarMode = 'new'
    envState.settings = staleSetting
    envState.manualEnvVarValues = { A: 'v', B: ' ' }
  })

  const clickTest = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole('button', { name: 'Test Connection' }))
    await waitFor(() => expect(mockTestMCP).toHaveBeenCalled())
    return mockTestMCP.mock.calls.at(-1)![0]
  }

  it('sends transient id-less settings with Test and the tools fetch in new mode', async () => {
    const user = userEvent.setup()
    renderForm()

    const sent = await clickTest(user)

    expect(sent.settings).toEqual({
      credential_type: 'MCP',
      project_name: 'proj',
      credential_values: [{ key: 'A', value: 'v' }],
    })
    expect(sent.settings).not.toHaveProperty('id')
    expect(sent.mcp_config_id).toBe('cfg-1')

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(mockGetMcpTools).toHaveBeenCalled())
    const fetched = mockGetMcpTools.mock.calls.at(-1)![0]

    expect(fetched.settings).toEqual(sent.settings)
    expect(fetched.mcp_config_id).toBe('cfg-1')
    expectNoPersistence()
  })

  it('follows the project in project_name', async () => {
    const user = userEvent.setup()
    const { rerenderWith } = renderForm()

    rerenderWith({ project: 'other' })
    const sent = await clickTest(user)

    expect(sent.settings.project_name).toBe('other')
  })

  it('sends undefined settings when nothing usable was typed', async () => {
    const user = userEvent.setup()
    envState.manualEnvVarValues = { A: ' ' }
    renderForm()

    const sent = await clickTest(user)

    expect(sent.settings).toBeUndefined()
    expectNoPersistence()
  })

  it('sends the stored setting with its id in existing mode', async () => {
    const user = userEvent.setup()
    envState.envVarMode = 'existing'
    renderForm()

    const sent = await clickTest(user)

    expect(sent.settings).toBe(staleSetting)
    expectNoPersistence()
  })

  it('merges typed values into config.env for a custom config in new mode', async () => {
    const user = userEvent.setup()
    formValues.useCustomConfig = true
    formValues.configJson = JSON.stringify({ command: 'npx', env: { A: 'old', C: 'keep' } })
    renderForm()

    const sent = await clickTest(user)

    expect(sent.use_custom_config).toBe(true)
    expect(sent.config.env).toEqual({ A: 'v', C: 'keep' })
    expect(sent.settings).toBeUndefined()

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(mockGetMcpTools).toHaveBeenCalled())
    const fetched = mockGetMcpTools.mock.calls.at(-1)![0]

    expect(fetched.config.env).toEqual({ A: 'v', C: 'keep' })
    expect(fetched.settings).toBeUndefined()
    expectNoPersistence()
    formValues.configJson = '{}'
  })

  it('saves a custom config without the typed values in its env', async () => {
    const user = userEvent.setup()
    formValues.useCustomConfig = true
    formValues.configJson = JSON.stringify({ command: 'npx', env: { A: 'old', C: 'keep' } })
    mockGetMcpTools.mockResolvedValue([{ tools: [{ name: 't1' }] }])
    mockFindUserSetting.mockResolvedValueOnce(undefined).mockResolvedValueOnce({ id: 'new-id' })
    const updateMcpServer = vi.fn()
    renderForm({ mcpServer: { ...marketplaceServer, tools: ['t1'] }, updateMcpServer })

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Add' })).toBeEnabled())
    await user.click(screen.getByRole('button', { name: 'Add' }))
    await waitFor(() => expect(updateMcpServer).toHaveBeenCalled())

    const saved = updateMcpServer.mock.calls[0][0]
    expect(saved.config.env).toEqual({ A: 'old', C: 'keep' })
    expect(saved.settings).toEqual({ id: 'new-id' })
    expect(mockCreateUserSetting).toHaveBeenCalledWith(
      expect.objectContaining({ alias: 'github_env_vars' })
    )
    formValues.configJson = '{}'
  })

  it('keeps envVarHook.settings for a custom config in existing mode', async () => {
    const user = userEvent.setup()
    formValues.useCustomConfig = true
    envState.envVarMode = 'existing'
    renderForm()

    const sent = await clickTest(user)

    expect(sent.settings).toBe(staleSetting)
    expectNoPersistence()
  })

  it('keeps envVarHook.settings for a non-marketplace server in new mode', async () => {
    const user = userEvent.setup()
    renderForm({ mcpServer: { name: 'github', mcp_config_id: 'cfg-1' } })

    const sent = await clickTest(user)

    expect(sent.settings).toBe(staleSetting)

    await user.click(screen.getByRole('button', { name: 'Next' }))
    await waitFor(() => expect(mockGetMcpTools).toHaveBeenCalled())
    expect(mockGetMcpTools.mock.calls.at(-1)![0].settings).toBe(staleSetting)
    expectNoPersistence()
  })
})

describe('MCPToolkitTest beforeTest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockTestMCP.mockResolvedValue({ success: true })
  })

  it('does not send the test request when beforeTest fails', async () => {
    const user = userEvent.setup()
    const beforeTest = vi.fn(() => false)
    render(<MCPToolkitTest mcpServer={marketplaceServer} beforeTest={beforeTest} />)

    await user.click(screen.getByRole('button', { name: 'Test Connection' }))

    expect(beforeTest).toHaveBeenCalledTimes(1)
    expect(mockTestMCP).not.toHaveBeenCalled()
  })

  it('sends the test request when beforeTest passes', async () => {
    const user = userEvent.setup()
    render(<MCPToolkitTest mcpServer={marketplaceServer} beforeTest={() => true} />)

    await user.click(screen.getByRole('button', { name: 'Test Connection' }))

    await waitFor(() => expect(mockTestMCP).toHaveBeenCalledTimes(1))
  })
})
