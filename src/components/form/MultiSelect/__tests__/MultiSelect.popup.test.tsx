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

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'

import Popup from '@/components/Popup'

import MultiSelect from '../MultiSelect'

it.each(['trigger', 'filter'])(
  'closes the open picker on Escape from its %s before closing its real Popup',
  async (target) => {
    const user = userEvent.setup()
    const onHide = vi.fn()
    render(
      <Popup visible header="Sharing" onHide={onHide}>
        <MultiSelect
          label="People"
          value={[]}
          options={[{ label: 'Alice', value: 'alice' }]}
          onChange={vi.fn()}
          onFilter={vi.fn()}
        />
      </Popup>
    )

    const trigger = await screen.findByRole('combobox', { name: 'People' })
    trigger.focus()
    await user.keyboard('{ArrowDown}')
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
    const focused = target === 'filter' ? screen.getByPlaceholderText('Search') : trigger
    focused.focus()
    expect(focused).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'false'))
    expect(onHide).not.toHaveBeenCalled()
    expect(trigger).toHaveFocus()

    await user.keyboard('{Escape}')
    await waitFor(() => expect(onHide).toHaveBeenCalledOnce())
  }
)

it('does not consume Escape from another control or close an unfocused picker', async () => {
  const user = userEvent.setup()
  const onHide = vi.fn()
  render(
    <Popup visible header="Sharing" onHide={onHide}>
      <MultiSelect
        label="People"
        value={[]}
        options={[{ label: 'Alice', value: 'alice' }]}
        onChange={vi.fn()}
      />
      <button type="button">Other action</button>
    </Popup>
  )

  const trigger = await screen.findByRole('combobox', { name: 'People' })
  trigger.focus()
  await user.keyboard('{ArrowDown}')
  await waitFor(() => expect(trigger).toHaveAttribute('aria-expanded', 'true'))
  screen.getByRole('button', { name: 'Other action' }).focus()

  await user.keyboard('{Escape}')
  await waitFor(() => expect(onHide).toHaveBeenCalledOnce())
  expect(trigger).toHaveAttribute('aria-expanded', 'true')
})
