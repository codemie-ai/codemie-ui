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

import { describe, it, expect, beforeEach } from 'vitest'

import { mockRouterState } from '@/hooks/__mocks__/useVueRouter'
import { history } from '@/hooks/appLevel/useHistoryStack'
import { goBackFromWorkflowEdit } from '@/pages/workflows/utils/goBackWorkflows'

describe('goBackFromWorkflowEdit', () => {
  beforeEach(() => {
    mockRouterState.push.mockClear()
    history.stack = []
    history.currentIndex = -1
  })

  it('navigates to the workflow list when history is empty (direct link)', () => {
    goBackFromWorkflowEdit({ workflowId: 'test-wf-id' })

    expect(mockRouterState.push).toHaveBeenCalledWith({ name: 'workflows-all' })
  })

  it('navigates via history when previous non-workflow route exists (in-app navigation)', () => {
    history.stack = [
      { name: 'workflows-all', params: {}, query: {} },
      { name: 'edit-workflow', params: { id: 'test-wf-id' }, query: {} },
    ]
    history.currentIndex = 1

    goBackFromWorkflowEdit({ workflowId: 'test-wf-id' })

    // navigateBack finds 'workflows-all' in the history stack and pushes to it.
    // The !safeRoute guard must NOT fire (safeRoute is 'workflows-all', not null).
    expect(mockRouterState.push).toHaveBeenCalledWith({
      name: 'workflows-all',
      params: {},
      query: {},
    })
  })
})
