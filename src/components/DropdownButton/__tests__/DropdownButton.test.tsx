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

import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

import DropdownButton from '../DropdownButton'

describe('DropdownButton', () => {
  const label = 'Create'
  const items = [
    { label: 'Option 1', onClick: vi.fn() },
    { label: 'Option 2', onClick: vi.fn() },
  ]

  it('renders a single button and triggers item onClick when 1 item is passed', () => {
    const onClick = vi.fn()
    render(<DropdownButton label={label} items={[{ label: 'Only One', onClick }]} />)

    const button = screen.getByRole('button', { name: label })
    expect(button).toBeInTheDocument()

    fireEvent.click(button)
    expect(onClick).toHaveBeenCalled()
  })

  it('renders a dropdown (SplitButton) when multiple items are passed', () => {
    render(<DropdownButton label={label} items={items} />)

    const defaultButton = screen.getByRole('button', { name: label })
    expect(defaultButton).toBeInTheDocument()
  })

  it('disables button when `disabled` prop is true', () => {
    render(<DropdownButton label={label} items={items} disabled />)

    const defaultButton = screen.getByRole('button', { name: label })
    expect(defaultButton).toBeDisabled()
  })

  it('renders left icon if `iconLeft` is provided', () => {
    render(
      <DropdownButton label={label} items={items} iconLeft={<svg data-testid="icon-left" />} />
    )
    expect(screen.getByTestId('icon-left')).toBeInTheDocument()
  })
})
