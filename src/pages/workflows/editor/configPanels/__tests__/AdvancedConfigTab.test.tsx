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
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'

import AdvancedConfigTab, { AdvancedConfigTabRef } from '../AdvancedConfigTab'

// --- Mocks ---

const { mockUseSubWorkflowEnabled, mockWorkflowContextValue } = vi.hoisted(() => ({
  mockUseSubWorkflowEnabled: vi.fn(),
  mockWorkflowContextValue: {
    activeIssue: null as { path: string } | null,
    getIssueField: vi.fn().mockReturnValue(null),
    getMcpIssue: vi.fn().mockReturnValue(null),
    markIssueDirty: vi.fn(),
  },
}))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useSubWorkflowEnabled: mockUseSubWorkflowEnabled,
}))

vi.mock('../../hooks/useWorkflowContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../hooks/useWorkflowContext')>()
  return {
    ...actual,
    useWorkflowContext: vi.fn().mockReturnValue(mockWorkflowContextValue),
  }
})

vi.mock('../components/ConfigAccordion', () => ({
  default: ({
    children,
    title,
    expanded,
  }: {
    children: React.ReactNode
    title: string
    expanded?: boolean
  }) => (
    <div data-testid={`accordion-${title}`} data-expanded={String(expanded ?? false)}>
      {children}
    </div>
  ),
}))

// --- Fixtures ---

const emptyConfig: WorkflowConfiguration = { states: [] }

const defaultProps = {
  config: emptyConfig,
  workflow: undefined,
  onConfigChange: vi.fn(),
  onClose: vi.fn(),
}

// --- Tests ---

describe('AdvancedConfigTab — Sub-workflow section', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkflowContextValue.activeIssue = null
  })

  it('does not render sub-workflow section when flag is off', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([false, true])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.queryByTestId('accordion-Sub-workflow')).toBeNull()
  })

  it('does not render sub-workflow section while flag is still loading', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, false])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.queryByTestId('accordion-Sub-workflow')).toBeNull()
  })

  it('renders sub-workflow section when flag is on and loaded', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.getByTestId('accordion-Sub-workflow')).toBeDefined()
  })

  it('renders max_nesting_level input when flag is on', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.getByRole('spinbutton', { name: /^max nesting level/i })).toBeDefined()
  })

  it('does not render pool sizing fields', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.queryByRole('switch', { name: /enable pool/i })).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: /^min size/i })).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: /^max size/i })).toBeNull()
    expect(screen.queryByRole('spinbutton', { name: /^refill interval/i })).toBeNull()
  })

  it('form is not dirty on initial render', () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    const ref = createRef<AdvancedConfigTabRef>()
    render(<AdvancedConfigTab {...defaultProps} ref={ref} />)
    expect(ref.current?.isDirty()).toBe(false)
  })

  it('auto-expands sub-workflow accordion when activeIssue path is max_nesting_level', async () => {
    mockUseSubWorkflowEnabled.mockReturnValue([true, true])
    mockWorkflowContextValue.activeIssue = { path: 'max_nesting_level' }
    render(<AdvancedConfigTab {...defaultProps} />)
    await waitFor(() => {
      expect(screen.getByTestId('accordion-Sub-workflow').getAttribute('data-expanded')).toBe(
        'true'
      )
    })
  })
})
