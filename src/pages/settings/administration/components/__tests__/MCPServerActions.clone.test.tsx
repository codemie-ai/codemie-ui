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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import { mcpServerNameId } from '@/utils/ariaIds'

import MCPServerActions from '../MCPServerActions'

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/clipboard.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/utils/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: vi.fn() }))
vi.mock('@/components/ConfirmationModal', () => ({
  default: ({
    visible,
    header,
    confirmText,
    cancelText = 'Cancel',
    confirmDisabled,
    cancelDisabled,
    onCancel,
    onConfirm,
  }: any) =>
    visible ? (
      <dialog open aria-label={header}>
        <button onClick={onCancel} disabled={cancelDisabled}>
          {cancelText}
        </button>
        <button onClick={onConfirm} disabled={confirmDisabled}>
          {confirmText}
        </button>
      </dialog>
    ) : null,
}))

const server = { id: 'mcp-1', name: 'My MCP Server' } as any

const open = () =>
  fireEvent.click(screen.getByRole('button', { name: 'More options My MCP Server' }))

const renderActions = (onCloneClick: (server: any) => void, cloneDisabled = false) =>
  render(
    <div>
      <span id={mcpServerNameId('mcp-1')}>My MCP Server</span>
      <MCPServerActions
        server={server}
        onViewDetails={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onCloneClick={onCloneClick}
        canClone
        cloneDisabled={cloneDisabled}
      />
    </div>
  )

describe('MCPServerActions — Clone menu item', () => {
  it('clicking Clone calls onCloneClick directly with no dialog ever appearing', () => {
    const onCloneClick = vi.fn()
    renderActions(onCloneClick)
    open()
    fireEvent.click(screen.getByRole('menuitem', { name: 'Clone' }))
    expect(onCloneClick).toHaveBeenCalledTimes(1)
    expect(onCloneClick).toHaveBeenCalledWith(server)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it("is disabled while this row's clone modal is already open, and blocks a repeat click", () => {
    const onCloneClick = vi.fn()
    renderActions(onCloneClick, true)
    open()
    const cloneItem = screen.getByRole('menuitem', { name: 'Clone' })
    expect(cloneItem).toBeDisabled()
    fireEvent.click(cloneItem)
    expect(onCloneClick).not.toHaveBeenCalled()
  })
})
