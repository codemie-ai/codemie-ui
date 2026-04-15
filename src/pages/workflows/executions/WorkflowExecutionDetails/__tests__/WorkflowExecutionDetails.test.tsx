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
import userEvent from '@testing-library/user-event'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { WorkflowExecution } from '@/types/entity/workflow'

import WorkflowExecutionDetails from '../WorkflowExecutionDetails'

vi.mock('@/utils/utils', () => ({
  copyToClipboard: vi.fn(),
  createdBy: vi.fn((user) => user ?? 'Unknown'),
}))

vi.mock('@/utils/helpers', () => ({
  formatDateTime: vi.fn((date) => date ?? 'N/A'),
}))

vi.mock('@/components/StatusBadge', () => ({
  default: ({ text, status }: { text: string; status: string }) => (
    <span data-testid="status-badge" data-status={status}>
      {text}
    </span>
  ),
}))

const mockExecution: WorkflowExecution = {
  execution_id: 'exec-123-456',
  overall_status: 'Succeeded',
  created_by: 'John Doe',
  date: '2024-01-15T10:30:00Z',
  update_date: '2024-01-15T11:00:00Z',
} as unknown as WorkflowExecution

describe('WorkflowExecutionDetails', () => {
  let user

  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('renders labels and values', () => {
    render(<WorkflowExecutionDetails execution={mockExecution} />)

    expect(screen.getByText('Succeeded')).toBeInTheDocument()
    expect(screen.getByText('Triggered by:')).toBeInTheDocument()
    expect(screen.getByText('Started:')).toBeInTheDocument()
    expect(screen.getByText('Updated:')).toBeInTheDocument()
    expect(screen.getByText('ID:')).toBeInTheDocument()
    expect(screen.getByText('exec-123-456')).toBeInTheDocument()
  })

  it('renders copy button for execution ID', () => {
    render(<WorkflowExecutionDetails execution={mockExecution} />)

    const copyButton = screen.getByRole('button')
    expect(copyButton).toBeInTheDocument()
  })

  it('copy button is clickable', async () => {
    render(<WorkflowExecutionDetails execution={mockExecution} />)

    const copyButton = screen.getByRole('button')
    await user.click(copyButton)

    // Just verify the button can be clicked without error
    expect(copyButton).toBeInTheDocument()
  })

  it('renders with different execution status', () => {
    const failedExecution = {
      ...mockExecution,
      overall_status: 'Failed',
    }

    render(<WorkflowExecutionDetails execution={failedExecution as WorkflowExecution} />)

    expect(screen.getByText('Failed')).toBeInTheDocument()
  })
})
