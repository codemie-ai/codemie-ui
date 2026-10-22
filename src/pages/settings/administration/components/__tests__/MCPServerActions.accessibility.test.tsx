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
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('@/utils/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: vi.fn() }))

const makeServer = (overrides: Record<string, unknown> = {}) => ({
  id: 'mcp-1',
  name: 'My MCP Server',
  ...overrides,
})

describe('MCPServerActions accessibility (contextId pattern)', () => {
  it('More Options button references the server name element via aria-labelledby', () => {
    render(
      <div>
        <span id={mcpServerNameId('mcp-1')}>My MCP Server</span>
        <MCPServerActions
          server={makeServer() as any}
          onViewDetails={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onCloneClick={vi.fn()}
          canClone={true}
          cloneDisabled={false}
        />
      </div>
    )
    const btn = screen.getByRole('button', { name: 'More options My MCP Server' })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toHaveAttribute('aria-label')
    const parts = btn.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('My MCP Server')
  })
})

describe('MCPServerActions — Clone menu item', () => {
  const openMenu = () => {
    fireEvent.click(screen.getByRole('button', { name: 'More options My MCP Server' }))
  }

  const renderActions = (
    overrides: Partial<Record<'canClone' | 'cloneDisabled', boolean>> = {}
  ) => {
    render(
      <div>
        <span id={mcpServerNameId('mcp-1')}>My MCP Server</span>
        <MCPServerActions
          server={makeServer() as any}
          onViewDetails={vi.fn()}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onCloneClick={vi.fn()}
          canClone={overrides.canClone ?? true}
          cloneDisabled={overrides.cloneDisabled ?? false}
        />
      </div>
    )
  }

  it('does not render a Clone item when canClone is false', () => {
    renderActions({ canClone: false })
    openMenu()
    expect(screen.queryByRole('menuitem', { name: 'Clone' })).not.toBeInTheDocument()
  })

  it('renders an enabled Clone item when canClone is true and cloneDisabled is false', () => {
    renderActions({ canClone: true, cloneDisabled: false })
    openMenu()
    const item = screen.getByRole('menuitem', { name: 'Clone' })
    expect(item).toBeInTheDocument()
    expect(item).not.toBeDisabled()
  })

  it('renders a disabled Clone item when cloneDisabled is true', () => {
    renderActions({ canClone: true, cloneDisabled: true })
    openMenu()
    const item = screen.getByRole('menuitem', { name: 'Clone' })
    expect(item).toBeInTheDocument()
    expect(item).toBeDisabled()
  })
})
