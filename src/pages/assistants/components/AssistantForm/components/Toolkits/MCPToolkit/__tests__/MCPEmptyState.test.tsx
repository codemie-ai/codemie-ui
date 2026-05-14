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

import MCPEmptyState from '../MCPEmptyState'

describe('MCPEmptyState', () => {
  it('shows Manual Setup button when customSetupEnabled is true', () => {
    render(<MCPEmptyState onBrowseMarketplace={vi.fn()} onAddCustom={vi.fn()} customSetupEnabled />)
    expect(screen.getByText('Manual Setup')).toBeInTheDocument()
    expect(screen.getByText(/configuring one manually/)).toBeInTheDocument()
  })

  it('hides Manual Setup button when customSetupEnabled is false', () => {
    render(
      <MCPEmptyState
        onBrowseMarketplace={vi.fn()}
        onAddCustom={vi.fn()}
        customSetupEnabled={false}
      />
    )
    expect(screen.queryByText('Manual Setup')).toBeNull()
    expect(screen.queryByText(/configuring one manually/)).toBeNull()
  })

  it('shows Browse Catalog button regardless of customSetupEnabled', () => {
    render(
      <MCPEmptyState
        onBrowseMarketplace={vi.fn()}
        onAddCustom={vi.fn()}
        customSetupEnabled={false}
      />
    )
    expect(screen.getByText('Browse Catalog')).toBeInTheDocument()
  })
})
