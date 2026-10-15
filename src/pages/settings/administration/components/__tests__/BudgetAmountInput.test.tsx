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
import { describe, it, expect, vi } from 'vitest'

import BudgetAmountInput from '../BudgetAmountInput'

const LABEL = 'Amount'

function renderInput(props: { value?: number; strictPositive?: boolean } = {}) {
  const onCommit = vi.fn()
  render(
    <BudgetAmountInput
      value={props.value ?? 300}
      onCommit={onCommit}
      className=""
      ariaLabel={LABEL}
      strictPositive={props.strictPositive}
    />
  )
  const input = screen.getByLabelText<HTMLInputElement>(LABEL)
  return { onCommit, input }
}

async function typeAndBlur(input: HTMLInputElement, text: string) {
  const user = userEvent.setup()
  await user.clear(input)
  if (text) await user.type(input, text)
  await user.tab()
}

describe('BudgetAmountInput', () => {
  describe('with strictPositive', () => {
    it.each([
      ['0', '0'],
      ['-5', '-5'],
      ['-0', '-0'],
      ['an empty field', ''],
    ])('rejects %s on blur and restores the previous value', async (_label, text) => {
      const { onCommit, input } = renderInput({ strictPositive: true })

      await typeAndBlur(input, text)

      expect(onCommit).not.toHaveBeenCalled()
      expect(input).toHaveValue(300)
    })

    it('commits a positive fractional amount', async () => {
      const { onCommit, input } = renderInput({ strictPositive: true })

      await typeAndBlur(input, '0.4')

      expect(onCommit).toHaveBeenCalledWith(0.4)
    })

    it('shows a sub-dollar amount with cent precision instead of 0', () => {
      const { input } = renderInput({ value: 0.1, strictPositive: true })

      expect(input.value).toBe('0.10')
    })

    it('keeps cent precision when the value changes from outside', () => {
      const onCommit = vi.fn()
      const { rerender } = render(
        <BudgetAmountInput
          value={300}
          onCommit={onCommit}
          className=""
          ariaLabel={LABEL}
          strictPositive
        />
      )

      rerender(
        <BudgetAmountInput
          value={0.25}
          onCommit={onCommit}
          className=""
          ariaLabel={LABEL}
          strictPositive
        />
      )

      expect(screen.getByLabelText<HTMLInputElement>(LABEL).value).toBe('0.25')
    })

    it('restores a sub-dollar amount with cent precision after a rejected entry', async () => {
      const { onCommit, input } = renderInput({ value: 0.1, strictPositive: true })

      await typeAndBlur(input, '0')

      expect(onCommit).not.toHaveBeenCalled()
      expect(input).toHaveValue(0.1)
    })
  })

  describe('without strictPositive', () => {
    it('commits 0 when the user types 0', async () => {
      const { onCommit, input } = renderInput()

      await typeAndBlur(input, '0')

      expect(onCommit).toHaveBeenCalledWith(0)
    })

    it('commits 0 when the user clears the field', async () => {
      const { onCommit, input } = renderInput()

      await typeAndBlur(input, '')

      expect(onCommit).toHaveBeenCalledWith(0)
    })

    it('keeps showing whole dollars for a sub-dollar amount', () => {
      const { input } = renderInput({ value: 0.1 })

      expect(input.value).toBe('0')
    })
  })
})
