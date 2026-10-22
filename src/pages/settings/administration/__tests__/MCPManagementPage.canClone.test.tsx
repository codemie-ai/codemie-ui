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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import MCPManagementPage from '../MCPManagementPage'

const { mockUserStore, mockMcpStore } = vi.hoisted(() => ({
  mockUserStore: { user: { isAdmin: false, isMaintainer: false } },
  mockMcpStore: {
    configs: [{ id: 'mcp-1', name: 'My MCP Server', categories: [] }] as unknown[],
    pagination: { page: 0, perPage: 10, totalPages: 1 },
    loading: false,
    indexConfigs: vi.fn().mockResolvedValue([]),
  },
}))

vi.mock('@/store/user', () => ({ userStore: mockUserStore }))
vi.mock('@/store/mcp', () => ({ mcpStore: mockMcpStore }))
vi.mock('@/hooks/useFeatureFlags', () => ({ useMcpEnabled: () => [true, true] }))

vi.mock('valtio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})

vi.mock('@/pages/settings/components/SettingsLayout', () => ({
  default: ({ content, rightContent }: any) => (
    <div>
      {rightContent}
      {content}
    </div>
  ),
}))

vi.mock('@/components/Table', () => ({
  default: ({ items, customRenderColumns }: any) => (
    <div>
      {items.map((item: any) => (
        <div key={item.id}>{customRenderColumns.actions(item)}</div>
      ))}
    </div>
  ),
}))

vi.mock('../components/MCPServerModal', () => ({ default: () => null }))
vi.mock('../components/MCPServerDetails', () => ({ default: () => null }))

vi.mock('@/assets/icons/plus-filled.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/clipboard.svg?react', () => ({ default: () => <span /> }))

const openRowMenu = () => fireEvent.click(screen.getByRole('button', { name: 'More options' }))

describe('MCPManagementPage — canClone gate (isAdmin || isMaintainer)', () => {
  beforeEach(() => {
    mockMcpStore.indexConfigs.mockClear()
  })

  it('hides Clone for a plain user (neither admin nor maintainer)', () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: false }
    render(<MCPManagementPage />)
    openRowMenu()
    expect(screen.queryByRole('menuitem', { name: 'Clone' })).not.toBeInTheDocument()
  })

  it('shows Clone for an admin', () => {
    mockUserStore.user = { isAdmin: true, isMaintainer: false }
    render(<MCPManagementPage />)
    openRowMenu()
    expect(screen.getByRole('menuitem', { name: 'Clone' })).toBeInTheDocument()
  })

  it('shows Clone for a maintainer', () => {
    mockUserStore.user = { isAdmin: false, isMaintainer: true }
    render(<MCPManagementPage />)
    openRowMenu()
    expect(screen.getByRole('menuitem', { name: 'Clone' })).toBeInTheDocument()
  })
})
