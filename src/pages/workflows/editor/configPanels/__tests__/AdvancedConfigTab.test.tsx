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

import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createRef } from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { selectDropdownOption } from '@/test-utils/component-interactions'
import type { WorkflowConfiguration } from '@/types/workflowEditor/configuration'
import { updateAdvancedConfig } from '@/utils/workflowEditor/actions/config/updateAdvancedConfig'

import AdvancedConfigTab, { AdvancedConfigTabRef } from '../AdvancedConfigTab'

// --- Mocks ---

const { mockUseSubWorkflowEnabled, mockUseWorkflowContractsEnabled, mockWorkflowContextValue } =
  vi.hoisted(() => ({
    mockUseSubWorkflowEnabled: vi.fn(),
    mockUseWorkflowContractsEnabled: vi.fn(() => [true, true]),
    mockWorkflowContextValue: {
      activeIssue: null as { path: string } | null,
      getIssueField: vi.fn().mockReturnValue(null),
      getMcpIssue: vi.fn().mockReturnValue(null),
      markIssueDirty: vi.fn(),
    },
  }))

vi.mock('@/hooks/useFeatureFlags', () => ({
  useSubWorkflowEnabled: mockUseSubWorkflowEnabled,
  useWorkflowContractsEnabled: mockUseWorkflowContractsEnabled,
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

const WORKFLOW_MAX_ATTEMPTS_HINT =
  'Total number of attempts, including the first execution (not the number of retries). 1 means run once with no retries. Leave empty to use the server default (10). Must be a positive integer. Maximum: 100.'

describe('AdvancedConfigTab — Retry Policy Max Attempts default', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkflowContextValue.activeIssue = null
    mockUseSubWorkflowEnabled.mockReturnValue([false, true])
  })

  it('shows the backend default as the Max Attempts placeholder when unset', () => {
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.getByRole('spinbutton', { name: /^max attempts/i })).toHaveAttribute(
      'placeholder',
      '10'
    )
  })

  it('explains total attempts and the server default in the Max Attempts hint', () => {
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(screen.getByText(WORKFLOW_MAX_ATTEMPTS_HINT)).toBeDefined()
  })
})

describe('AdvancedConfigTab — contract defaults', () => {
  const lastSaved = () => {
    const { calls } = defaultProps.onConfigChange.mock
    return calls[calls.length - 1][0] as Partial<WorkflowConfiguration>
  }
  const modeLabel = () => document.querySelector<HTMLElement>('.p-dropdown-label')

  beforeEach(() => {
    vi.clearAllMocks()
    mockWorkflowContextValue.activeIssue = null
    mockUseSubWorkflowEnabled.mockReturnValue([false, true])
    mockUseWorkflowContractsEnabled.mockReturnValue([true, true])
  })

  it('hides the Contracts accordion while workflow contracts are disabled', () => {
    mockUseWorkflowContractsEnabled.mockReturnValue([false, true])

    render(<AdvancedConfigTab {...defaultProps} />)

    expect(screen.queryByTestId('accordion-Contracts')).not.toBeInTheDocument()
    expect(screen.queryByText('Save validation')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('switch', { name: /require input contracts/i })
    ).not.toBeInTheDocument()
  })

  it('renders the workflow-level mode select under its own id', () => {
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(document.querySelector('#workflow_validation_mode_select')).not.toBeNull()
  })

  it('shows the unset mode as "Default (warn)" and the switch off', () => {
    render(<AdvancedConfigTab {...defaultProps} />)
    expect(modeLabel()?.textContent).toBe('Default (warn)')
    expect(screen.getByRole('switch', { name: /require input contracts/i })).not.toBeChecked()
  })

  it('writes validation and require_input_contracts through the save', async () => {
    const user = userEvent.setup()
    const ref = createRef<AdvancedConfigTabRef>()
    render(<AdvancedConfigTab {...defaultProps} ref={ref} />)

    await selectDropdownOption('Save validation', 'strict', { user })
    fireEvent.click(screen.getByRole('switch', { name: /require input contracts/i }))

    expect(ref.current?.isDirty()).toBe(true)
    await act(async () => {
      await ref.current?.save()
    })

    const merged = updateAdvancedConfig(emptyConfig, lastSaved()).config
    expect(merged.save_validation).toBe('strict')
    expect(merged.require_input_contracts).toBe(true)
  })

  it('persists: a saved config reloads into the dropdown and the switch', () => {
    const ref = createRef<AdvancedConfigTabRef>()
    render(
      <AdvancedConfigTab
        {...defaultProps}
        ref={ref}
        config={{ states: [], save_validation: 'strict', require_input_contracts: true }}
      />
    )
    expect(modeLabel()?.textContent).toBe('strict')
    expect(screen.getByRole('switch', { name: /require input contracts/i })).toBeChecked()
    expect(ref.current?.isDirty()).toBe(false)
  })

  it('removes both keys from the merged config when they are reset to unset', async () => {
    const user = userEvent.setup()
    const ref = createRef<AdvancedConfigTabRef>()
    const config: WorkflowConfiguration = {
      states: [],
      save_validation: 'strict',
      require_input_contracts: true,
    }
    render(<AdvancedConfigTab {...defaultProps} ref={ref} config={config} />)

    await selectDropdownOption('Save validation', 'Default (warn)', { user })
    fireEvent.click(screen.getByRole('switch', { name: /require input contracts/i }))
    await act(async () => {
      await ref.current?.save()
    })

    const merged = updateAdvancedConfig(config, lastSaved()).config
    expect(merged).not.toHaveProperty('save_validation')
    expect(merged).not.toHaveProperty('require_input_contracts')
  })

  it('leaves both keys out of an untouched save', async () => {
    const ref = createRef<AdvancedConfigTabRef>()
    render(<AdvancedConfigTab {...defaultProps} ref={ref} />)
    await act(async () => {
      await ref.current?.save()
    })
    const merged = updateAdvancedConfig(emptyConfig, lastSaved()).config
    expect(merged).not.toHaveProperty('save_validation')
    expect(merged).not.toHaveProperty('require_input_contracts')
  })

  it.each(['save_validation', 'require_input_contracts'])(
    'auto-expands the contracts accordion when activeIssue path is %s',
    async (path) => {
      mockWorkflowContextValue.activeIssue = { path }
      render(<AdvancedConfigTab {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByTestId('accordion-Contracts').getAttribute('data-expanded')).toBe('true')
      })
    }
  )
})
