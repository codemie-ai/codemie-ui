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

import { useSubWorkflowEnabled } from '@/hooks/useFeatureFlags'

import Sidebar from '../Sidebar'

vi.mock('@/hooks/useFeatureFlags', () => ({
  useSubWorkflowEnabled: vi.fn(),
}))

vi.mock('@/hooks/useReactFlowDnD', () => ({
  useDnD: () => ({ onDragStart: vi.fn(), isDragging: false }),
}))

const mockCreateState = vi.fn()

const renderSidebar = () => render(<Sidebar createState={mockCreateState} disabled={false} />)

describe('Sidebar — SUB_WORKFLOW feature flag gating', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hides the Sub-Workflow node when the flag is off', () => {
    vi.mocked(useSubWorkflowEnabled).mockReturnValue([false, true])
    renderSidebar()
    expect(screen.queryByText('Sub-Workflow')).toBeNull()
  })

  it('shows the Sub-Workflow node when the flag is on', () => {
    vi.mocked(useSubWorkflowEnabled).mockReturnValue([true, true])
    renderSidebar()
    expect(screen.getByText('Sub-Workflow')).toBeInTheDocument()
  })
})
