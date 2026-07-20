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
