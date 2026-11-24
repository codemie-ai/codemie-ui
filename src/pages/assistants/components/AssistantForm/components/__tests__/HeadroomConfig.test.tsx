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
import { describe, expect, it, vi } from 'vitest'

import { HeadroomConfig as HeadroomConfigType } from '@/types/entity/assistant'

import HeadroomConfig, { HEADROOM_STRATEGY_HELP } from '../HeadroomConfig'

const on: HeadroomConfigType = {
  enabled: true,
  compress_user_messages: true,
  compress_tool_outputs: true,
  strategy: 'balanced',
}

describe('HeadroomConfig', () => {
  it('shows defaults when value is null', () => {
    render(<HeadroomConfig value={null} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Enable context compression')).not.toBeChecked()
    expect(screen.getByLabelText('Compress user input')).toBeChecked()
    expect(screen.getByLabelText('Compress tool outputs')).toBeChecked()
    expect(screen.queryByText(HEADROOM_STRATEGY_HELP.balanced)).not.toBeInTheDocument()
  })

  it('disables sub-controls while enabled is off', () => {
    const { container } = render(<HeadroomConfig value={null} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Compress user input')).toBeDisabled()
    expect(screen.getByLabelText('Compress tool outputs')).toBeDisabled()
    expect(container.querySelector('.p-dropdown.p-disabled')).not.toBeNull()
  })

  it('enables sub-controls when enabled is on', () => {
    const { container } = render(<HeadroomConfig value={on} onChange={vi.fn()} />)
    expect(screen.getByLabelText('Compress user input')).not.toBeDisabled()
    expect(container.querySelector('.p-dropdown.p-disabled')).toBeNull()
  })

  it('emits the full 4-field object when toggled', () => {
    const onChange = vi.fn()
    render(<HeadroomConfig value={null} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Enable context compression'))
    expect(onChange).toHaveBeenCalledWith({
      enabled: true,
      compress_user_messages: true,
      compress_tool_outputs: true,
      strategy: 'balanced',
    })
  })

  it('shows a title and description for every strategy in the dropdown', () => {
    const { container } = render(<HeadroomConfig value={on} onChange={vi.fn()} />)
    fireEvent.click(container.querySelector('.p-dropdown') as Element)
    expect(screen.getByText('Lossless')).toBeInTheDocument()
    expect(screen.getByText(HEADROOM_STRATEGY_HELP.lossless)).toBeInTheDocument()
    expect(screen.getByText(HEADROOM_STRATEGY_HELP.aggressive)).toBeInTheDocument()
  })

  it('renders the error next to Strategy', () => {
    render(<HeadroomConfig value={on} onChange={vi.fn()} error="Invalid strategy" />)
    expect(screen.getByText('Invalid strategy')).toBeInTheDocument()
  })

  it('lists not-compressed paths', () => {
    render(<HeadroomConfig value={on} onChange={vi.fn()} />)
    expect(screen.getByText(/Not compressed/)).toBeInTheDocument()
  })
})
