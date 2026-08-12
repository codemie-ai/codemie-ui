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

import WorkflowExecutionsListItem from '../WorkflowExecutionsListItem'

vi.mock('@/hooks/useVueRouter', () => ({ useVueRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/assets/icons/navigation-more.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/assets/icons/delete.svg?react', () => ({ default: () => <span /> }))
vi.mock('@/components/Badge', () => ({ default: () => null }))
vi.mock('@/components/StatusBadge', () => ({
  default: () => null,
  StatusEnum: { SUCCESS: 'success', ERROR: 'error', WARNING: 'warning', DEFAULT: 'default' },
}))

const makeExecution = (overrides: Record<string, unknown> = {}) => ({
  id: 'exec-1',
  execution_id: 'exec-1',
  date: '2026-01-01T00:00:00Z',
  update_date: null,
  workflow_id: 'wf-1',
  conversation_id: null,
  overall_status: 'succeeded',
  ...overrides,
})

describe('WorkflowExecutionsListItem accessibility (action-only pattern)', () => {
  it('More Options button has aria-label "Remove execution"', () => {
    render(
      <WorkflowExecutionsListItem
        execution={makeExecution() as any}
        isActive={false}
        onRemove={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: 'Remove execution' })
    expect(btn).toBeInTheDocument()
    expect(btn).toHaveAttribute('aria-label', 'Remove execution')
  })

  it('trigger does not use aria-labelledby (action-only, no entity name)', () => {
    render(
      <WorkflowExecutionsListItem
        execution={makeExecution() as any}
        isActive={false}
        onRemove={vi.fn()}
      />
    )
    const btn = screen.getByRole('button', { name: 'Remove execution' })
    expect(btn).not.toHaveAttribute('aria-labelledby')
  })
})
