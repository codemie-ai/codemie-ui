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
import { describe, expect, it, vi } from 'vitest'

import MCPServerActions from '../MCPServerActions'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/play.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))

const server = { id: 'mcp-1', name: 'My MCP Server' } as any

const renderActions = async (isTesting = false, onTest = vi.fn()) => {
  const user = userEvent.setup()
  render(
    <MCPServerActions
      server={server}
      onViewDetails={vi.fn()}
      onEdit={vi.fn()}
      onDelete={vi.fn()}
      canClone={false}
      cloneDisabled={true}
      onCloneClick={vi.fn()}
      onTest={onTest}
      isTesting={isTesting}
    />
  )
  await user.click(screen.getByRole('button', { name: /More options/ }))
  return { user }
}

describe('MCPServerActions Test Integration', () => {
  it('calls onTest with the row server when clicked', async () => {
    const onTest = vi.fn()
    const { user } = await renderActions(false, onTest)

    await user.click(await screen.findByText('Test Integration'))

    expect(onTest).toHaveBeenCalledWith(server)
  })

  it('disables the menu item while isTesting is true', async () => {
    await renderActions(true)

    const item = (await screen.findByText('Test Integration')).closest('button')!
    expect(item).toBeDisabled()
  })
})
