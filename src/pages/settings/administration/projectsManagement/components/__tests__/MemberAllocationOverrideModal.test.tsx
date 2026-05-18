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

import { BudgetCategory } from '@/types/entity/budget'
import { ProjectBudget } from '@/types/entity/projectBudget'

import MemberAllocationOverrideModal from '../MemberAllocationOverrideModal'

const mockBudget: ProjectBudget = {
  budget_id: 'b1',
  name: 'Platform Budget',
  project_name: 'Test Project',
  budget_category: 'platform' as BudgetCategory,
  max_budget: 100,
  soft_budget: 80,
  budget_duration: 'monthly',
  provider_sync_status: null,
  member_count: 0,
  allocated_member_budget_total: 0,
  member_allocations: [],
}

const baseProps = {
  visible: true,
  userId: 'john_doe',
  userName: 'John Doe',
  budgets: [mockBudget],
  userAllocationsByCategory: null,
  initialCategory: null,
  onHide: vi.fn(),
  onSubmit: vi.fn(),
  onClearOverride: vi.fn(),
}

describe('MemberAllocationOverrideModal', () => {
  it('shows user display name in header instead of user id', () => {
    render(<MemberAllocationOverrideModal {...baseProps} />)
    expect(screen.getByText('Budget Override — John Doe')).toBeInTheDocument()
  })

  it('falls back to userId when userName is null', () => {
    render(<MemberAllocationOverrideModal {...baseProps} userName={null} />)
    expect(screen.getByText('Budget Override — john_doe')).toBeInTheDocument()
  })

  it('falls back to userId when userName is empty string', () => {
    render(<MemberAllocationOverrideModal {...baseProps} userName="" />)
    expect(screen.getByText('Budget Override — john_doe')).toBeInTheDocument()
  })
})
