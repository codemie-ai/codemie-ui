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
import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React, { createRef } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { DEFAULT_RETRY_MAX_ATTEMPTS } from '@/utils/workflowEditor/constants'

import CommonStateFields, { ResetKeysInput } from '../CommonStateFields'
import {
  enableWorkflowContracts,
  INPUT_CONTRACT_PLACEHOLDER,
  OUTPUT_CONTRACT_PLACEHOLDER,
} from './contractTestUtils'

import type { CommonStateFieldsRef } from '../CommonStateFields'

// Suppress module-level registerFields side-effect
vi.mock('../../utils/visualEditorFieldRegistry', () => ({ registerFields: vi.fn() }))

// Supply the minimum context values that CommonStateFields reads
vi.mock('../../hooks/useWorkflowContext', () => ({
  useWorkflowContext: vi.fn().mockReturnValue({
    setActiveIssue: vi.fn(),
    activeIssue: null,
  }),
  WorkflowContext: { Provider: ({ children }: { children: React.ReactNode }) => children },
}))

// Always render accordion children so the Transition Settings fields are visible
vi.mock('../components/ConfigAccordion', () => ({
  default: ({ children, title }: { children: React.ReactNode; title: string }) => (
    <div data-testid={`accordion-${title}`}>{children}</div>
  ),
}))

const PLACEHOLDER = 'e.g.: user_data,analysis_result'

function renderWithResetKeys(resetKeys: string[] = []) {
  const ref = createRef<CommonStateFieldsRef>()
  render(
    <CommonStateFields
      ref={ref}
      state={{ id: 'test-state', next: { reset_keys_in_context_store: resetKeys } }}
    />
  )
  return { ref, input: screen.getByPlaceholderText(PLACEHOLDER) }
}

describe('CommonStateFields — Reset Context Keys input', () => {
  let user: ReturnType<typeof userEvent.setup>
  beforeEach(() => {
    user = userEvent.setup()
    vi.clearAllMocks()
  })

  it('preserves a trailing comma while the field is focused', async () => {
    const { input } = renderWithResetKeys()
    await user.click(input)
    await user.type(input, 'key1,')
    expect(input).toHaveValue('key1,')
  })

  it('does not update the form array during typing — only after onBlur trims and parses', async () => {
    const { ref, input } = renderWithResetKeys()
    await user.click(input)
    await user.type(input, ' key1 , key2 , key3 ')
    // Form value must NOT be updated while the user is still typing
    expect(ref.current!.getValues().next?.reset_keys_in_context_store).toEqual([])
    await user.tab() // fires blur
    expect(ref.current!.getValues().next?.reset_keys_in_context_store).toEqual([
      'key1',
      'key2',
      'key3',
    ])
  })

  it('displays an existing string[] as a comma-joined string on initial render', () => {
    const { input } = renderWithResetKeys(['alpha', 'beta'])
    expect(input).toHaveValue('alpha, beta')
  })
})

describe('CommonStateFields — Task/Output contract visibility', () => {
  it('renders Task and the output contract with the full contract section', () => {
    render(<CommonStateFields state={{ id: 's' }} contractFields="full" />)
    expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
  })

  it('hides Task independently of the output contract', () => {
    render(<CommonStateFields state={{ id: 's' }} showTask={false} contractFields="full" />)
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
  })

  it('renders no output field without the contract section (the legacy Output Schema is gone)', () => {
    render(<CommonStateFields state={{ id: 's' }} />)
    expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Expected output format (JSON Schema)')
    ).not.toBeInTheDocument()
  })

  it('keeps every other State Settings field visible when only Task/Output Schema are hidden', () => {
    render(<CommonStateFields state={{ id: 's' }} showTask={false} />)

    // State Settings accordion (besides Task/Output Schema)
    expect(screen.getByPlaceholderText('e.g., analyze_code')).toBeInTheDocument()
    expect(screen.getByText('Interrupt Before')).toBeInTheDocument()
    expect(screen.getByText('Finish Iteration')).toBeInTheDocument()
    expect(screen.getByText('Resolve Dynamic Values in Prompt')).toBeInTheDocument()
    expect(screen.getByText('Result as Human Message')).toBeInTheDocument()

    // Transition Settings accordion
    expect(screen.getByPlaceholderText('e.g.: analysis_result')).toBeInTheDocument()
    expect(screen.getByText('Append to Context')).toBeInTheDocument()
    expect(screen.getByText('Keep History')).toBeInTheDocument()
    expect(screen.getByText('Override Task')).toBeInTheDocument()
    expect(screen.getByText('Store in Context')).toBeInTheDocument()
    expect(screen.getByText('Clear Prior Messages')).toBeInTheDocument()
    expect(screen.getByText('Clear Context Store')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(PLACEHOLDER)).toBeInTheDocument()

    // Retry Policy accordion
    expect(screen.getByPlaceholderText('1')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('2')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('60')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('10')).toBeInTheDocument()
  })

  it('showAllFields={false} still hides Task/Output Schema regardless of new props defaults', () => {
    render(<CommonStateFields state={{ id: 's' }} showAllFields={false} />)
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Expected output format (JSON Schema)')
    ).not.toBeInTheDocument()
  })

  it('preserves a stored task/output_schema value while hidden, through getValues and a simulated reopen', () => {
    const ref = createRef<CommonStateFieldsRef>()
    render(
      <CommonStateFields
        ref={ref}
        state={{ id: 'test-state', task: 'existing task', output_schema: '{"type":"object"}' }}
        showTask={false}
      />
    )

    expect(ref.current!.getValues().task).toBe('existing task')
    expect(ref.current!.getValues().output_schema).toBe('{"type":"object"}')

    // Simulate "edit an unrelated field" — id is always rendered
    const idInput = screen.getByPlaceholderText('e.g., analyze_code')
    fireEvent.change(idInput, { target: { value: 'test-state-renamed' } })

    expect(ref.current!.getValues().task).toBe('existing task')
    expect(ref.current!.getValues().output_schema).toBe('{"type":"object"}')
  })
})

describe('CommonStateFields — workflow contracts flag', () => {
  it('flag off: the full section keeps only the output contract', () => {
    render(<CommonStateFields state={{ id: 's' }} contractFields="full" />)

    expect(screen.getByTestId('accordion-Contracts')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).not.toBeInTheDocument()
    expect(screen.queryByText('Save validation')).not.toBeInTheDocument()
  })

  it('flag off: transform (input only) shows no Contracts section', () => {
    render(<CommonStateFields state={{ id: 's' }} contractFields="input" />)

    expect(screen.queryByTestId('accordion-Contracts')).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).not.toBeInTheDocument()
    expect(screen.queryByText('Save validation')).not.toBeInTheDocument()
  })

  it('flag on: the full section shows input, output and save validation', () => {
    enableWorkflowContracts()
    render(<CommonStateFields state={{ id: 's' }} contractFields="full" />)

    expect(screen.getByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER)).toBeInTheDocument()
    expect(document.querySelector('#node_validation_mode_select')).not.toBeNull()
  })

  it('flag on: transform (input only) shows the input contract and save validation', () => {
    enableWorkflowContracts()
    render(<CommonStateFields state={{ id: 's' }} contractFields="input" />)

    expect(screen.getByTestId('accordion-Contracts')).toBeInTheDocument()
    expect(screen.getByPlaceholderText(INPUT_CONTRACT_PLACEHOLDER)).toBeInTheDocument()
    expect(screen.queryByPlaceholderText(OUTPUT_CONTRACT_PLACEHOLDER)).not.toBeInTheDocument()
    expect(document.querySelector('#node_validation_mode_select')).not.toBeNull()
  })
})

describe('ResetKeysInput — external field.value sync', () => {
  it('updates the raw buffer when field.value changes externally while unfocused', async () => {
    function ExternalSyncHarness() {
      const { control, reset } = useForm<{ keys: string[] }>({
        defaultValues: { keys: ['initial'] },
      })
      return (
        <>
          <Controller
            name="keys"
            control={control}
            render={({ field, fieldState }) => (
              <ResetKeysInput field={field} fieldState={fieldState} />
            )}
          />
          <button onClick={() => reset({ keys: ['b', 'c'] })}>external-reset</button>
        </>
      )
    }

    const user = userEvent.setup()
    render(<ExternalSyncHarness />)

    const input = screen.getByPlaceholderText(PLACEHOLDER)
    expect(input).toHaveValue('initial')

    await user.click(screen.getByRole('button', { name: 'external-reset' }))
    expect(input).toHaveValue('b, c')
  })
})

const STATE_ATTEMPTS_HINT =
  'Total number of attempts, including the first execution (not the number of retries). 1 means run once with no retries. Leave empty to inherit the workflow retry policy, or the server default (10) if none is set.'

describe('CommonStateFields — Retry Policy Attempts default', () => {
  it('keeps the retry attempts default equal to the backend default (10)', () => {
    expect(DEFAULT_RETRY_MAX_ATTEMPTS).toBe(10)
  })

  it('shows the backend default as the Attempts placeholder', () => {
    render(<CommonStateFields state={{ id: 's' }} />)
    expect(screen.getByLabelText('Attempts')).toHaveAttribute('placeholder', '10')
  })

  it('explains total attempts and inheritance in the Attempts hint', () => {
    render(<CommonStateFields state={{ id: 's' }} />)
    expect(screen.getByText(STATE_ATTEMPTS_HINT)).toBeInTheDocument()
  })
})
