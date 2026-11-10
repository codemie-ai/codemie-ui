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

import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ChipWrapper } from '../ChipWrapper'

afterEach(cleanup)

type ChipProps = React.ComponentProps<typeof ChipWrapper>

const renderChip = (props: Partial<ChipProps> & Pick<ChipProps, 'option'>) =>
  render(
    <ChipWrapper
      selectedItemTemplate={undefined}
      preparedValue={[]}
      onChange={vi.fn()}
      {...props}
    />
  )

const Avatar = () => <svg aria-hidden="true" />

describe('ChipWrapper remove button', () => {
  it.each([
    ['the option label', { option: 'principal-a', label: 'Alice' }, 'Remove Alice'],
    [
      'the text a template renders when the option is not listed',
      { option: 'person-0', selectedItemTemplate: () => 'Person 0' },
      'Remove Person 0',
    ],
    [
      'nested template text',
      {
        option: 'customfield_1',
        selectedItemTemplate: (value: unknown) => <span title={String(value)}>Story points</span>,
      },
      'Remove Story points',
    ],
    ['the label of an object option', { option: { label: 'Team', value: 'team' } }, 'Remove Team'],
    ['the name of an object option', { option: { name: 'Bob', id: 'bob' } }, 'Remove Bob'],
    ['a plain value shown as is', { option: 'raw-id' }, 'Remove raw-id'],
    [
      'a generic name when nothing readable is available',
      { option: { avatar: 'x' }, selectedItemTemplate: () => <Avatar /> },
      'Remove selected item',
    ],
    [
      'a generic name for an unreadable object without a template',
      { option: { avatar: 'x' } },
      'Remove selected item',
    ],
  ])('is named after %s', (_case, props, name) => {
    renderChip(props)

    expect(screen.getByRole('button', { name })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /object Object/ })).not.toBeInTheDocument()
  })

  it('shows the label of an object option instead of [object Object]', () => {
    renderChip({ option: { label: 'Team', value: 'team' } })

    expect(screen.getByText('Team')).toBeInTheDocument()
    expect(screen.queryByText('[object Object]')).not.toBeInTheDocument()
  })

  it('removes only its own option', () => {
    const onChange = vi.fn()
    renderChip({ option: 'b', label: 'Bob', preparedValue: ['a', 'b'], onChange })

    fireEvent.click(screen.getByRole('button', { name: 'Remove Bob' }))

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ value: ['a'], target: { value: ['a'] } })
    )
  })
})
