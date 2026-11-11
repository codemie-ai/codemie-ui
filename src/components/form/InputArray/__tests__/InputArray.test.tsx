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
import { describe, expect, it, vi } from 'vitest'

import InputArray from '../InputArray'

describe('InputArray — required state', () => {
  it('renders a persistent asterisk next to the label when required, even with an empty list', () => {
    render(<InputArray isAIGenerated={false} label="To" value={[]} required onChange={vi.fn()} />)
    expect(screen.getByText('To').parentElement).toHaveTextContent('*')
  })

  it('does not render an asterisk when required is omitted', () => {
    render(<InputArray isAIGenerated={false} label="To" value={[]} onChange={vi.fn()} />)
    expect(screen.getByText('To').parentElement).not.toHaveTextContent('*')
  })

  it('exposes aria-required="true" on each row input when required', () => {
    render(
      <InputArray
        isAIGenerated={false}
        label="To"
        value={['a@b.com']}
        required
        onChange={vi.fn()}
      />
    )
    expect(screen.getAllByRole('textbox')[0]).toHaveAttribute('aria-required', 'true')
  })

  it('does not expose aria-required on row inputs when required is omitted', () => {
    render(<InputArray isAIGenerated={false} label="To" value={['a@b.com']} onChange={vi.fn()} />)
    expect(screen.getAllByRole('textbox')[0]).not.toHaveAttribute('aria-required', 'true')
  })

  it('exposes aria-required on a hidden placeholder control when a required list is empty', () => {
    render(<InputArray isAIGenerated={false} label="To" value={[]} required onChange={vi.fn()} />)
    expect(screen.getByRole('textbox', { name: /to required/i })).toHaveAttribute(
      'aria-required',
      'true'
    )
  })

  it('does not render a hidden placeholder control when the empty list is not required', () => {
    render(<InputArray isAIGenerated={false} label="To" value={[]} onChange={vi.fn()} />)
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })
})
