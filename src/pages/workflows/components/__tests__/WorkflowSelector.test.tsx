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

import { render, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { workflowsStore } from '@/store/workflows'

import WorkflowSelector from '../WorkflowSelector'

vi.mock('@/store/workflows', () => ({
  workflowsStore: {
    getWorkflowOptions: vi.fn().mockResolvedValue([]),
  },
}))

describe('WorkflowSelector — getOptions prop', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls the provided getOptions on mount instead of store.getWorkflowOptions', async () => {
    const customGetOptions = vi
      .fn()
      .mockResolvedValue([{ id: 'wf-1', name: 'Selectable Workflow', icon_url: '' }])

    render(<WorkflowSelector value={[]} onChange={vi.fn()} getOptions={customGetOptions} />)

    await waitFor(() => {
      expect(customGetOptions).toHaveBeenCalledWith({ search: '', project: undefined })
    })
    expect(workflowsStore.getWorkflowOptions).not.toHaveBeenCalled()
  })

  it('falls back to workflowsStore.getWorkflowOptions when getOptions is not provided', async () => {
    render(<WorkflowSelector value={[]} onChange={vi.fn()} />)

    await waitFor(() => {
      expect(workflowsStore.getWorkflowOptions).toHaveBeenCalled()
    })
  })
})
