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

import { render, screen, waitFor } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import WorkflowExecutionsTable from '../WorkflowExecutionsTable'

vi.mock('valtio', async (orig) => {
  const actual = await orig<typeof import('valtio')>()
  return { ...actual, useSnapshot: (store: any) => store }
})

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    workflowExecutions: [],
    workflowExecutionsPagination: { page: 0, perPage: 10, totalPages: 1 },
    loadWorkflowExecutions: vi.fn().mockResolvedValue(undefined),
    exportWorkflowExecution: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('@/hooks/useVueRouter', () => ({
  useVueRouter: () => ({ push: vi.fn() }),
}))

vi.mock('@/components/Table', () => ({
  default: ({ ariaLabel }: any) => (
    <table aria-label={ariaLabel}>
      <thead>
        <tr>
          <th>Name</th>
        </tr>
      </thead>
    </table>
  ),
}))

vi.mock('@/components/Button', () => ({ default: () => null }))
vi.mock('@/components/Spinner', () => ({ default: () => null }))
vi.mock('@/components/StatusBadge', () => ({ default: () => null }))
vi.mock('../WorkflowExecutionExportPopup', () => ({ default: () => null }))
vi.mock('@/assets/icons/download.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/assets/icons/view.svg?react', () => ({ default: () => <svg /> }))
vi.mock('@/utils/toaster', () => ({ default: { info: vi.fn(), error: vi.fn() } }))

describe('WorkflowExecutionsTable accessibility', () => {
  it('names the table "Workflow executions"', async () => {
    render(<WorkflowExecutionsTable workflow={{ id: 'wf-1' } as any} />)

    await waitFor(() =>
      expect(screen.getByRole('table', { name: 'Workflow executions' })).toBeInTheDocument()
    )
  })
})
