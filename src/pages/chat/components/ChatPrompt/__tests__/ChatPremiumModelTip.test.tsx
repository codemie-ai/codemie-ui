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
import { MemoryRouter } from 'react-router'
import { describe, expect, it, vi } from 'vitest'

import ChatPremiumModelTip from '../ChatPremiumModelTip'

const renderTip = (onDismiss = vi.fn()) =>
  render(
    <MemoryRouter>
      <ChatPremiumModelTip modelLabel="Claude Opus 4.1" onDismiss={onDismiss} />
    </MemoryRouter>
  )

describe('ChatPremiumModelTip', () => {
  it('shows the premium message with the model label', () => {
    renderTip()

    expect(screen.getByText(/Premium model active/)).toBeInTheDocument()
    expect(screen.getByText(/Claude Opus 4.1/)).toBeInTheDocument()
    expect(screen.getByText(/higher usage rates apply/)).toBeInTheDocument()
  })

  it('links to the models catalog page', () => {
    renderTip()

    const link = screen.getByRole('link', { name: /view models and rates/i })
    expect(link).toHaveAttribute('href', '/help/models')
  })

  it('calls onDismiss when the close button is clicked', () => {
    const onDismiss = vi.fn()
    renderTip(onDismiss)

    fireEvent.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalledTimes(1)
  })
})
