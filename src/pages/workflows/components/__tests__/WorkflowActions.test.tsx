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

import WorkflowActions from '../WorkflowActions'

import type { Workflow } from '../WorkflowCard'

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    deleteWorkflow: vi.fn(),
    unpublishWorkflowFromMarketplace: vi.fn(),
  },
}))

vi.mock('../PublishWorkflowToMarketplaceModal', () => ({
  default: () => null,
}))

vi.mock('@/components/ConfirmationModal', () => ({
  default: () => null,
}))

const makeWorkflow = (overrides: Partial<Workflow> = {}): Workflow => ({
  id: '1',
  slug: 'test-workflow',
  name: 'Test Workflow',
  user_abilities: ['read', 'write', 'delete'],
  is_global: false,
  ...overrides,
})

function openMenu() {
  fireEvent.click(screen.getByRole('button', { name: /more options/i }))
}

function getMenuItemLabels(): string[] {
  return screen.getAllByRole('menuitem').map((el) => el.getAttribute('aria-label') ?? '')
}

describe('WorkflowActions menu ordering', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows Publish to Marketplace as the last item for a non-global editable workflow', () => {
    render(
      <WorkflowActions workflow={makeWorkflow({ is_global: false })} reloadWorkflows={vi.fn()} />
    )
    openMenu()
    const labels = getMenuItemLabels()
    expect(labels.at(-1)).toBe('Publish to Marketplace')
  })

  it('shows Remove from Marketplace as the last item for a global editable workflow', () => {
    render(
      <WorkflowActions workflow={makeWorkflow({ is_global: true })} reloadWorkflows={vi.fn()} />
    )
    openMenu()
    const labels = getMenuItemLabels()
    expect(labels.at(-1)).toBe('Remove from Marketplace')
  })

  it('renders Clone before Delete before marketplace action', () => {
    render(
      <WorkflowActions workflow={makeWorkflow({ is_global: false })} reloadWorkflows={vi.fn()} />
    )
    openMenu()
    const labels = getMenuItemLabels()
    const cloneIdx = labels.indexOf('Clone')
    const deleteIdx = labels.indexOf('Delete')
    const publishIdx = labels.indexOf('Publish to Marketplace')
    expect(cloneIdx).toBeGreaterThanOrEqual(0)
    expect(deleteIdx).toBeGreaterThan(cloneIdx)
    expect(publishIdx).toBeGreaterThan(deleteIdx)
  })

  it('does not show marketplace items when user cannot edit', () => {
    render(
      <WorkflowActions
        workflow={makeWorkflow({ user_abilities: ['read', 'delete'], is_global: false })}
        reloadWorkflows={vi.fn()}
      />
    )
    openMenu()
    const labels = getMenuItemLabels()
    expect(labels).not.toContain('Publish to Marketplace')
    expect(labels).not.toContain('Remove from Marketplace')
  })
})
