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

import CommonStateFields, { ResetKeysInput } from '../CommonStateFields'

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
  default: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
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

describe('CommonStateFields — Task/Output Schema visibility', () => {
  it('renders Task and Output Schema by default', () => {
    render(<CommonStateFields state={{ id: 's' }} />)
    expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
  })

  it('hides Task independently of Output Schema', () => {
    render(<CommonStateFields state={{ id: 's' }} showTask={false} />)
    expect(screen.queryByPlaceholderText('Describe the task for this node')).not.toBeInTheDocument()
    expect(screen.getByPlaceholderText('Expected output format (JSON Schema)')).toBeInTheDocument()
  })

  it('hides Output Schema independently of Task', () => {
    render(<CommonStateFields state={{ id: 's' }} showOutputSchema={false} />)
    expect(screen.getByPlaceholderText('Describe the task for this node')).toBeInTheDocument()
    expect(
      screen.queryByPlaceholderText('Expected output format (JSON Schema)')
    ).not.toBeInTheDocument()
  })

  it('keeps every other State Settings field visible when only Task/Output Schema are hidden', () => {
    render(<CommonStateFields state={{ id: 's' }} showTask={false} showOutputSchema={false} />)

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
    expect(screen.getByPlaceholderText('3')).toBeInTheDocument()
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
        showOutputSchema={false}
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
