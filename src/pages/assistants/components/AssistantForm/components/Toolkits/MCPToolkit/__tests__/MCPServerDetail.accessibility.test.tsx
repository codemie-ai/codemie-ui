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
import { ReactNode } from 'react'
import { describe, it, expect, vi } from 'vitest'

import MCPServerDetail from '../MCPServerDetail'

// Real NavigationMore — verifies production ARIA wiring
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('../MCPToolkitTest', () => ({
  default: () => null,
  MCPToolkitTestProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  MCPToolkitTestTrigger: () => null,
}))
vi.mock('../IntegrationSelector', () => ({ default: () => null }))

describe('MCPServerDetail accessibility (contextId via useId + sr-only span)', () => {
  it('More Options button has compound name including server name', () => {
    render(
      <MCPServerDetail
        server={{ name: 'GitHub MCP', description: 'desc', enabled: true }}
        settingsDefinitions={[]}
        isSelected={false}
        onUpdate={vi.fn()}
        onEdit={vi.fn()}
        onDelete={vi.fn()}
        showNewIntegrationPopup={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: /^More options GitHub MCP$/ })
    expect(btn).toBeInTheDocument()
    expect(btn).not.toHaveAttribute('aria-label')
    const parts = btn.getAttribute('aria-labelledby')!.split(/\s+/)
    expect(document.getElementById(parts[1])).toHaveTextContent('GitHub MCP')
  })
})
