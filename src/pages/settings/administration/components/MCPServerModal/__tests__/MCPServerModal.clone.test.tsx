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
import React from 'react'
import { describe, it, expect, vi } from 'vitest'

import { MCPConfig } from '@/types/entity/mcp'

import MCPServerModal from '../index'

vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/plus-filled.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/utils/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: vi.fn() }))

vi.mock('@/components/Popup', () => ({
  default: ({
    visible,
    header,
    children,
    footerContent,
  }: {
    visible: boolean
    header?: string
    children: React.ReactNode
    footerContent?: React.ReactNode
  }) => {
    if (!visible) return null
    return (
      <dialog aria-label={header} open>
        {children}
        {footerContent}
      </dialog>
    )
  },
}))

const cloneSource = {
  id: 'mcp-1',
  name: 'Foo',
  description: 'A server',
  categories: [],
  logo_url: '',
  server_home_url: 'https://example.com',
  source_url: '',
  config: { command: 'npx' },
  required_env_vars: [],
} as unknown as MCPConfig

describe('MCPServerModal — Clone mode', () => {
  it('opens titled "Clone MCP Server", submit reads "Clone Server", name starts empty', () => {
    render(
      <MCPServerModal
        visible
        mode="clone"
        server={null}
        cloneSource={cloneSource}
        onHide={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByRole('dialog', { name: 'Clone MCP Server' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clone Server' })).toBeInTheDocument()
    expect(screen.getByLabelText('Name', { exact: false })).toHaveValue('')
  })

  it('still pre-fills the other fields from the clone source', () => {
    render(
      <MCPServerModal
        visible
        mode="clone"
        server={null}
        cloneSource={cloneSource}
        onHide={vi.fn()}
        onSubmit={vi.fn().mockResolvedValue(undefined)}
      />
    )

    expect(screen.getByLabelText('Link to MCP documentation', { exact: false })).toHaveValue(
      cloneSource.server_home_url
    )
  })

  it('blocks submit with a required-name error when the empty name is left untouched', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    render(
      <MCPServerModal
        visible
        mode="clone"
        server={null}
        cloneSource={cloneSource}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Clone Server' }))

    expect(await screen.findByText('Name is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
