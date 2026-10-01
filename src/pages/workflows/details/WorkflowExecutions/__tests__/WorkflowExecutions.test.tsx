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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { appInfoStore } from '@/store/appInfo'
import { mockMobileLayout } from '@/test-utils/mobileLayout'

import WorkflowExecutions from '../WorkflowExecutions'

vi.mock('@/pages/workflows/details/hooks/useExecutionsContext', () => ({
  default: () => ({ workflowId: 'wf-1', executionId: null }),
}))

vi.mock('@/hooks/usePolling', () => ({ usePolling: vi.fn() }))

vi.mock('@/hooks/useInfiniteScroll', () => ({
  useInfiniteScroll: vi.fn(() => ({ current: null })),
}))

vi.mock('@/pages/workflows/details/WorkflowExecutions/WorkflowExecutionsList', () => ({
  default: ({ title }: { title: string }) => <div>{title}</div>,
}))

describe('WorkflowExecutions', () => {
  let restoreLayout = () => {}

  afterEach(() => {
    cleanup()
    restoreLayout()
    restoreLayout = () => {}
    appInfoStore.sidebarExpanded = true
    appInfoStore.mobileSidebarOpen = false
    appInfoStore.pageSidebarCount = 0
  })

  it('shows the execution history beside the execution on desktop', () => {
    appInfoStore.sidebarExpanded = true
    const { container } = render(<WorkflowExecutions />)

    expect(screen.getByRole('heading', { name: 'Workflow Execution History' })).toBeInTheDocument()
    expect(container.querySelector('aside')).toHaveClass('w-workflow-exec-sidebar')
    expect(screen.getByRole('button', { name: 'Hide Sidebar' })).toBeInTheDocument()
  })

  it('collapses on desktop with the sidebar toggle state', () => {
    appInfoStore.sidebarExpanded = false
    const { container } = render(<WorkflowExecutions />)

    expect(container.querySelector('aside')).toHaveClass('w-0')
  })

  it('becomes a page sidebar overlay on mobile, opened from the top bar', () => {
    restoreLayout = mockMobileLayout().restore
    const { container, rerender } = render(<WorkflowExecutions />)

    const aside = container.querySelector('aside')
    expect(aside).toHaveClass('fixed')
    expect(aside).toHaveClass('hidden')
    expect(appInfoStore.pageSidebarCount).toBe(1)
    expect(screen.queryByRole('button', { name: /sidebar/i })).not.toBeInTheDocument()

    appInfoStore.mobileSidebarOpen = true
    rerender(<WorkflowExecutions />)
    expect(container.querySelector('aside')).not.toHaveClass('hidden')
  })
})
