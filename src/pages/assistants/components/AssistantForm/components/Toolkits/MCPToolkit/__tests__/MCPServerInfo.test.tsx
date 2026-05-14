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
import { describe, it, expect } from 'vitest'

import { MCPConfig, MCPServerDetails } from '@/types/entity/mcp'

import MCPServerInfo from '../MCPServerInfo'

const baseServer: MCPServerDetails = { name: 'Test Server', description: '', enabled: true }
const catalogEntry = { id: 'cfg-1', logo_url: 'https://cdn.example.com/logo.png' } as MCPConfig

describe('MCPServerInfo', () => {
  it('uses catalogEntry.logo_url when provided', () => {
    render(<MCPServerInfo server={baseServer} catalogEntry={catalogEntry} />)
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://cdn.example.com/logo.png')
  })

  it('falls back to server.logo_url when no catalogEntry', () => {
    render(
      <MCPServerInfo server={{ ...baseServer, logo_url: 'https://inline.example.com/logo.png' }} />
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://inline.example.com/logo.png')
  })

  it('falls back to server.logo_url when catalogEntry has no logo_url', () => {
    const entryWithoutLogo = { id: 'cfg-1' } as MCPConfig
    render(
      <MCPServerInfo
        server={{ ...baseServer, logo_url: 'https://inline.example.com/logo.png' }}
        catalogEntry={entryWithoutLogo}
      />
    )
    expect(screen.getByRole('img')).toHaveAttribute('src', 'https://inline.example.com/logo.png')
  })

  it('shows MCPIconSvg when no logo at all', () => {
    const { container } = render(<MCPServerInfo server={baseServer} />)
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('shows server.name as heading text', () => {
    render(<MCPServerInfo server={baseServer} />)
    expect(screen.getByRole('heading')).toHaveTextContent('Test Server')
  })
})
