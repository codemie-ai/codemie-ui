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

import Card from '../Card'

vi.mock('@/components/Tooltip', () => ({ default: () => null }))

const renderCard = (props: { ariaLabel?: string } = {}) =>
  render(
    <Card
      id="card-1"
      title="My card"
      description="Card description"
      avatar={<span />}
      onClick={vi.fn()}
      {...props}
    />
  )

describe('Card', () => {
  it('applies ariaLabel to the clickable role="button" element', () => {
    renderCard({ ariaLabel: 'Open My card' })

    expect(screen.getByRole('button', { name: 'Open My card' })).toBeInTheDocument()
  })

  it('does not set aria-label when ariaLabel is omitted', () => {
    renderCard()

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-label')
  })

  it('applies ariaDescribedBy to the clickable role="button" element', () => {
    render(
      <Card
        id="card-1"
        title="My card"
        description="Card description"
        avatar={<span />}
        onClick={vi.fn()}
        ariaDescribedBy="no-version-id"
      />
    )

    expect(screen.getByRole('button')).toHaveAttribute('aria-describedby', 'no-version-id')
  })

  it('does not set aria-describedby when ariaDescribedBy is omitted', () => {
    renderCard()

    expect(screen.getByRole('button')).not.toHaveAttribute('aria-describedby')
  })
})
