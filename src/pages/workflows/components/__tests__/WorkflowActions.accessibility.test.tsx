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
import { describe, expect, it, vi } from 'vitest'

import WorkflowActions from '../WorkflowActions'

import type { Workflow } from '../WorkflowCard'

// Real NavigationMore is intentionally NOT mocked — these tests verify production ARIA wiring.

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: vi.fn(() => ({ push: vi.fn() })),
}))

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    unpublishWorkflowFromMarketplace: vi.fn().mockResolvedValue(undefined),
    deleteWorkflow: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/utils/toaster', () => ({
  default: { info: vi.fn(), error: vi.fn() },
}))

vi.mock('@/utils/utils', async (importOriginal) => {
  const actual = await importOriginal<object>()
  return { ...actual, copyToClipboard: vi.fn() }
})

vi.mock('../PublishWorkflowToMarketplaceModal', () => ({ default: () => null }))
vi.mock('@/components/ConfirmationModal', () => ({ default: () => null }))
vi.mock('../utils/getWorkflowLink', () => ({ getWorkflowLink: vi.fn(() => '/workflow/1') }))

vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/copy-link.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/copy.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/edit.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/info.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/publish.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/unpublish.svg?react', () => ({ default: () => <svg /> }))

const makeWorkflow = (overrides: Partial<Workflow> = {}): Workflow => ({
  id: '1',
  slug: 'test-workflow',
  name: 'Test Workflow',
  user_abilities: ['read', 'write', 'delete'],
  is_global: false,
  ...overrides,
})

describe('NavigationMore accessibility — WorkflowActions button (contextId pattern)', () => {
  it('trigger button compound name includes the workflow name via aria-labelledby', () => {
    render(<WorkflowActions workflow={makeWorkflow({ id: 'wf-1', name: 'Alpha Workflow' })} />)

    const trigger = screen.getByRole('button', { name: /^More options Alpha Workflow$/ })
    expect(trigger).toBeInTheDocument()
  })

  it('trigger button uses aria-labelledby (not aria-label) when contextId is set', () => {
    render(<WorkflowActions workflow={makeWorkflow({ name: 'Beta Workflow' })} />)

    const trigger = screen.getByRole('button', { name: /^More options Beta Workflow$/ })
    expect(trigger).toHaveAttribute('aria-labelledby')
    expect(trigger).not.toHaveAttribute('aria-label')
  })

  it('aria-labelledby references a span containing the workflow name', () => {
    render(<WorkflowActions workflow={makeWorkflow({ id: 'wf-42', name: 'My Workflow' })} />)

    const trigger = screen.getByRole('button', { name: /^More options My Workflow$/ })
    const labelledBy = trigger.getAttribute('aria-labelledby')!
    const parts = labelledBy.split(/\s+/)
    expect(parts).toHaveLength(2)
    const nameEl = document.getElementById(parts[1])
    expect(nameEl).toBeInTheDocument()
    expect(nameEl).toHaveTextContent('My Workflow')
  })

  it('multiple concurrent WorkflowActions each have a unique contextId-based name', () => {
    render(
      <>
        <WorkflowActions workflow={makeWorkflow({ id: 'wf-10', name: 'First Workflow' })} />
        <WorkflowActions workflow={makeWorkflow({ id: 'wf-20', name: 'Second Workflow' })} />
      </>
    )

    expect(
      screen.getByRole('button', { name: /^More options First Workflow$/ })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /^More options Second Workflow$/ })
    ).toBeInTheDocument()
  })
})
