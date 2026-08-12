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
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { workflowNameId } from '@/utils/ariaIds'

import WorkflowsList from '../WorkflowsList'

// NavigationMore mock captures contextId for assertion
vi.mock('@/components/NavigationMore', () => ({
  default: ({ contextId, items }: any) => (
    <button aria-label="More options" data-context-id={contextId}>
      {items?.length ?? 0}
    </button>
  ),
}))

// WorkflowCard mock exposes nameId and renders navigationSlot
vi.mock('../WorkflowCard', () => ({
  default: ({ workflow, navigationSlot, nameId }: any) => (
    <div data-testid="workflow-card" data-workflow-id={workflow?.id}>
      <span id={nameId} data-testid="workflow-name">
        {workflow?.name}
      </span>
      {navigationSlot}
    </div>
  ),
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    workflows: [],
    workflowsLoading: false,
    workflowsPagination: { totalCount: 0, page: 1, perPage: 10, totalPages: 1 },
    favoriteWorkflows: [],
    favoriteWorkflowsLoading: false,
    favoriteWorkflowsPagination: { totalCount: 0, page: 1, perPage: 10, totalPages: 1 },
    indexWorkflows: vi.fn().mockResolvedValue(undefined),
    indexFavoriteWorkflows: vi.fn().mockResolvedValue(undefined),
    setWorkflowsScope: vi.fn(),
    setWorkflowsPagination: vi.fn(),
    getWorkflow: vi.fn().mockResolvedValue(null),
    updateRecentWorkflows: vi.fn(),
    deleteWorkflow: vi.fn().mockResolvedValue(undefined),
    unpublishWorkflowFromMarketplace: vi.fn().mockResolvedValue(undefined),
  },
}))
vi.mock('@/store/chats', () => ({ chatsStore: { startNewChat: vi.fn() } }))
vi.mock('valtio', async (orig) => {
  const actual = await orig<typeof import('valtio')>()
  return {
    ...actual,
    useSnapshot: (store: any) => store,
  }
})
vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
  useVueRoute: () => ({ query: {}, params: {} }),
}))
vi.mock('@/pages/workflows/constants', () => ({
  WORKFLOW_LIST_SCOPE: { FAVORITES: 'favorites', ALL: 'all' },
}))
vi.mock('@/components/Pagination', () => ({ default: () => null }))
vi.mock('@/components/Spinner', () => ({ default: () => null }))
vi.mock('@/pages/workflows/details/popups/WorkflowStartExecutionPopup', () => ({
  default: () => null,
}))
vi.mock('../PublishWorkflowToMarketplaceModal', () => ({ default: () => null }))
vi.mock('../utils/getWorkflowLink', () => ({ getWorkflowLink: vi.fn(() => '/workflow/1') }))
vi.mock('@/assets/icons/copy-link.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/publish.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/unpublish.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))
vi.mock('@/utils/utils', async (orig) => ({ ...(await orig<object>()), copyToClipboard: vi.fn() }))

const makeWorkflow = (id: string, name: string) => ({
  id,
  slug: `slug-${id}`,
  name,
  user_abilities: ['read'],
  is_global: false,
})

describe('WorkflowsList — NavigationMore contextId wiring', () => {
  beforeEach(async () => {
    const { workflowsStore } = await import('@/store/workflows')
    ;(workflowsStore as any).workflows = [makeWorkflow('wf-1', 'Alpha Workflow')]
    ;(workflowsStore as any).workflowsPagination = {
      totalCount: 1,
      page: 1,
      perPage: 10,
      totalPages: 1,
    }
  })

  it('NavigationMore contextId matches the workflow name span id', () => {
    render(<WorkflowsList scope="all" />)

    const moreBtn = screen.getByRole('button', { name: 'More options' })
    const contextId = moreBtn.getAttribute('data-context-id')
    expect(contextId).toBe(workflowNameId('wf-1'))

    const nameSpan = document.getElementById(workflowNameId('wf-1'))
    expect(nameSpan).toBeInTheDocument()
    expect(nameSpan).toHaveTextContent('Alpha Workflow')
  })
})
