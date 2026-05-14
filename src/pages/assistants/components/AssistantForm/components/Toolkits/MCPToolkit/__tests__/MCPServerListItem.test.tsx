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
import { describe, it, expect, vi } from 'vitest'

import { MCPServerDetails } from '@/types/entity/mcp'

import MCPServerListItem from '../MCPServerListItem'

const server: MCPServerDetails = {
  name: 'GitHub MCP',
  description: '',
  enabled: true,
  mcp_config_id: 'cfg-1',
}

describe('MCPServerListItem', () => {
  it('renders server name normally when available', () => {
    render(
      <MCPServerListItem
        server={server}
        index={0}
        selectedIndex={0}
        isSelected
        onClick={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('GitHub MCP')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).not.toBeDisabled()
  })

  it('shows server name with error styling and disables checkbox when isUnavailable', () => {
    render(
      <MCPServerListItem
        server={server}
        index={0}
        selectedIndex={0}
        isSelected={false}
        isUnavailable
        onClick={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('GitHub MCP')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeDisabled()
  })

  it('shows "UNAVAILABLE" fallback when server has no name and isUnavailable', () => {
    render(
      <MCPServerListItem
        server={{ ...server, name: '' }}
        index={0}
        selectedIndex={0}
        isSelected={false}
        isUnavailable
        onClick={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(screen.getByText('UNAVAILABLE')).toBeInTheDocument()
  })

  it('applies error border class when isUnavailable', () => {
    const { container } = render(
      <MCPServerListItem
        server={server}
        index={0}
        selectedIndex={0}
        isSelected={false}
        isUnavailable
        onClick={vi.fn()}
        onToggle={vi.fn()}
      />
    )
    expect(container.firstChild).toHaveClass('border-border-error')
  })
})
