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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import MCPServerDetails from '../MCPServerDetails'

const actionsProps = vi.fn()
vi.mock('../MCPServerDetails/ServerActions', () => ({
  default: (props: unknown) => {
    actionsProps(props)
    return null
  },
}))
vi.mock('../MCPServerDetails/ServerVariables', () => ({ default: () => null }))
vi.mock('@/assets/icons/cross.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/mcp.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <span /> }))

afterEach(() => {
  cleanup()
  actionsProps.mockClear()
})

const baseServer = { id: 'mcp-1', name: 'My MCP', is_active: true, usage_count: 0, categories: [] }

describe('MCPServerDetails', () => {
  it('does not render a LAST TEST section', () => {
    render(
      <MCPServerDetails
        server={baseServer as any}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTest={vi.fn()}
      />
    )
    expect(screen.queryByText('LAST TEST')).not.toBeInTheDocument()
  })

  it('passes onTest and isTesting to ServerActions', () => {
    const onTest = vi.fn()
    render(
      <MCPServerDetails
        server={baseServer as any}
        onClose={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        onTest={onTest}
        isTesting
      />
    )
    expect(actionsProps).toHaveBeenCalledWith(
      expect.objectContaining({ onTest, isTesting: true, server: baseServer })
    )
  })
})
