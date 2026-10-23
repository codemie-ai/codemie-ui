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

import { CHECKER_STATUSES } from '@/constants'
import { settingsStore } from '@/store/settings'
import { userStore } from '@/store/user'

import MCPTestIntegrationModal from '../MCPTestIntegrationModal'

vi.mock(
  '@/pages/assistants/components/AssistantForm/components/Toolkits/IntegrationSelector',
  () => ({
    default: ({ settingsDefinitions, onChange, onAddSettingClick, disabled }: any) => (
      <div>
        {settingsDefinitions.map((s: any) => (
          <button key={s.id} type="button" onClick={() => onChange(s)}>
            pick-{s.id}
          </button>
        ))}
        <button type="button" disabled={disabled} onClick={onAddSettingClick}>
          Add Environment Variables
        </button>
      </div>
    ),
  })
)

vi.mock('@/pages/integrations/components/NewIntegrationPopup', () => ({
  default: ({ visible, onSuccess }: any) =>
    visible ? (
      <button type="button" onClick={() => onSuccess('s-2')}>
        complete-new-integration
      </button>
    ) : null,
}))

const server = {
  id: 'mcp-1',
  name: 'GitHub MCP',
  required_env_vars: [{ name: 'TOKEN', description: 'api token', required: true }],
} as any

const setup = (
  existing: any[] = [{ id: 's-1', alias: 'my-int' }],
  status = CHECKER_STATUSES.UNDEFINED
) => {
  vi.spyOn(settingsStore, 'indexSettings').mockResolvedValue({ mcp: existing } as any)
  vi.spyOn(userStore, 'getDefaultProject').mockResolvedValue('proj')
  const onTest = vi.fn()
  const onHide = vi.fn()
  const user = userEvent.setup()
  render(
    <MCPTestIntegrationModal
      visible
      server={server}
      status={status}
      onHide={onHide}
      onTest={onTest}
    />
  )
  return { user, onTest, onHide }
}

describe('MCPTestIntegrationModal', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('lists the MCP integrations returned by settingsStore.indexSettings()', async () => {
    setup()
    expect(await screen.findByText('pick-s-1')).toBeInTheDocument()
  })

  it('does not call onTest and shows an inline hint when nothing is selected', async () => {
    const { user, onTest } = setup()
    await screen.findByText('pick-s-1')

    await user.click(screen.getByRole('button', { name: 'Test Integration' }))

    expect(onTest).not.toHaveBeenCalled()
    expect(await screen.findByText('Select an integration to run the test')).toBeInTheDocument()
  })

  it('calls onTest with the selected integration id', async () => {
    const { user, onTest } = setup()
    await user.click(await screen.findByText('pick-s-1'))
    await user.click(screen.getByRole('button', { name: 'Test Integration' }))

    expect(onTest).toHaveBeenCalledWith('s-1')
  })

  it('preselects the newly created integration after NewIntegrationPopup succeeds', async () => {
    let currentList = [{ id: 's-1', alias: 'my-int' }]
    vi.spyOn(settingsStore, 'indexSettings').mockImplementation(
      async () => ({ mcp: currentList } as any)
    )
    vi.spyOn(userStore, 'getDefaultProject').mockResolvedValue('proj')
    const onTest = vi.fn()
    const user = userEvent.setup()
    render(
      <MCPTestIntegrationModal
        visible
        server={server}
        status={CHECKER_STATUSES.UNDEFINED}
        onHide={vi.fn()}
        onTest={onTest}
      />
    )
    await screen.findByText('pick-s-1')

    await user.click(screen.getByRole('button', { name: 'Add Environment Variables' }))

    currentList = [
      { id: 's-1', alias: 'my-int' },
      { id: 's-2', alias: 'new-int' },
    ]

    await user.click(await screen.findByText('complete-new-integration'))
    await screen.findByText('pick-s-2')

    await user.click(screen.getByRole('button', { name: 'Test Integration' }))

    expect(onTest).toHaveBeenCalledWith('s-2')
  })
})
