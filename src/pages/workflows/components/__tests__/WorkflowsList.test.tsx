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
import { describe, expect, it, vi, beforeEach } from 'vitest'

import WorkflowsList from '../WorkflowsList'

const mockPush = vi.fn()

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({ push: mockPush })),
  useVueRoute: vi.fn(() => ({ path: '/workflows', query: {} })),
}))
vi.mock('@/hooks/useSidebarOffsetClass', () => ({
  useSidebarOffsetClass: vi.fn(() => ''),
}))
vi.mock('@/pages/workflows/hooks/useFavoriteWorkflows', () => ({
  useFavoriteWorkflows: vi.fn(() => ({
    favoriteWorkflows: [],
    favoritesLoading: false,
    workflowsPagination: { page: 0, perPage: 12, totalCount: 0, totalPages: 0 },
    favoritesPage: 0,
    handleRefresh: vi.fn(),
    handleFavoritesPageChange: vi.fn(),
  })),
}))
vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    workflows: [],
    workflowsLoading: false,
    workflowsPagination: { page: 0, perPage: 12, totalCount: 0, totalPages: 0 },
    setWorkflowsScope: vi.fn(),
    indexWorkflows: vi.fn().mockResolvedValue(undefined),
    getWorkflow: vi.fn().mockResolvedValue(null),
    deleteWorkflow: vi.fn().mockResolvedValue(undefined),
    unpublishWorkflowFromMarketplace: vi.fn().mockResolvedValue(undefined),
    setWorkflowsPagination: vi.fn(),
    updateRecentWorkflows: vi.fn(),
  },
}))
vi.mock('@/store/chats', () => ({
  chatsStore: { startNewChat: vi.fn().mockResolvedValue(undefined) },
}))
vi.mock('@/store/user', () => ({
  userStore: {},
}))
vi.mock('@/utils/entity', () => ({
  canEdit: vi.fn(() => true),
  canDelete: vi.fn(() => true),
}))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))
vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal()
  return { ...(actual as object), copyToClipboard: vi.fn() }
})
vi.mock('@/pages/workflows/utils/getWorkflowLink', () => ({
  getWorkflowLink: vi.fn(() => 'https://test/workflow/1'),
}))
vi.mock('@/pages/workflows/constants', () => ({
  WORKFLOW_LIST_SCOPE: { FAVORITES: 'favorites', ALL: 'all' },
}))
vi.mock('@/components/NavigationMore', () => ({
  default: ({ items }: any) => (
    <div data-testid="navigation-more">
      {items.map((item: any) => (
        <button
          key={item.title}
          onClick={item.onClick}
          data-testid={`menu-item-${item.title.toLowerCase().replace(/\s+/g, '-')}`}
        >
          {item.title}
        </button>
      ))}
    </div>
  ),
}))
vi.mock('../WorkflowCard', () => ({
  default: ({ navigationSlot }: any) => <div data-testid="workflow-card">{navigationSlot}</div>,
}))
vi.mock('@/components/Pagination', () => ({ default: () => null }))
vi.mock('@/components/Spinner', () => ({ default: () => null }))
vi.mock('@/pages/workflows/details/popups/WorkflowStartExecutionPopup', () => ({
  default: () => null,
}))
vi.mock('../PublishWorkflowToMarketplaceModal', () => ({ default: () => null }))
vi.mock('@/assets/icons/copy-link.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/publish.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/unpublish.svg?react', () => ({ default: () => <svg /> }))

const globalWorkflow = {
  id: 1,
  name: 'Test Workflow',
  is_global: true,
  user_abilities: ['read', 'write', 'delete'],
}

describe('WorkflowsList — unpublish confirmation modal', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    const { workflowsStore } = await import('@/store/workflows')
    ;(workflowsStore as any).workflows = [globalWorkflow]
    ;(workflowsStore as any).workflowsLoading = false
    ;(workflowsStore as any).workflowsPagination = {
      page: 0,
      perPage: 12,
      totalCount: 1,
      totalPages: 1,
    }
  })

  it('shows "Unpublish" confirm button when removing a workflow from marketplace', () => {
    render(<WorkflowsList scope="all" />)
    fireEvent.click(screen.getByTestId('menu-item-remove-from-marketplace'))
    expect(screen.getByRole('button', { name: 'Unpublish' })).toBeInTheDocument()
  })
})
