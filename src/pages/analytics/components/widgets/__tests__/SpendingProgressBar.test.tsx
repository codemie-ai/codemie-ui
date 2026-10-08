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
import { describe, it, expect } from 'vitest'

import SpendingProgressBar from '../SpendingProgressBar'

describe('SpendingProgressBar', () => {
  it('renders the rounded percentage', () => {
    render(<SpendingProgressBar percentage={44.5} />)
    expect(screen.getByText('44.5%')).toBeInTheDocument()
  })

  it('clamps percentage above 100 to 100', () => {
    render(<SpendingProgressBar percentage={250} />)
    expect(screen.getByText('100.0%')).toBeInTheDocument()
  })

  it('clamps negative percentage to 0', () => {
    render(<SpendingProgressBar percentage={-30} />)
    expect(screen.getByText('0.0%')).toBeInTheDocument()
  })

  it('applies the fixed-width class by default (not fullWidth)', () => {
    const { container } = render(<SpendingProgressBar percentage={30} />)
    const track = container.querySelector('.relative')
    expect(track).toHaveClass('w-[110px]')
  })

  it('drops the fixed width class when fullWidth is set', () => {
    const { container } = render(<SpendingProgressBar percentage={30} fullWidth />)
    const track = container.querySelector('.relative')
    expect(track).not.toHaveClass('w-[110px]')
    expect(track).toHaveClass('flex-1')
  })

  it('color derives from percentage and thresholds, matching between equal inputs', () => {
    const { container: firstContainer } = render(
      <SpendingProgressBar percentage={95} dangerThreshold={90} warningThreshold={75} />
    )
    const firstSpan = firstContainer.querySelector('span')
    const firstColor = firstSpan?.style.color

    const { container: secondContainer } = render(
      <SpendingProgressBar percentage={95} dangerThreshold={90} warningThreshold={75} />
    )
    const secondSpan = secondContainer.querySelector('span')
    const secondColor = secondSpan?.style.color

    expect(firstColor).toBe(secondColor)
  })

  it('applies a custom className to the wrapper', () => {
    const { container } = render(<SpendingProgressBar percentage={30} className="my-class" />)
    expect(container.querySelector('.my-class')).toBeInTheDocument()
  })

  it('renders spend, limit and percentage when limit is provided', () => {
    render(<SpendingProgressBar spend={2.29} limit={100} percentage={2.29} />)
    expect(screen.getByText('$2.29 / $100.00 (2.3%)')).toBeInTheDocument()
  })

  it('renders dash for the limit when limit is null', () => {
    render(<SpendingProgressBar spend={2.29} limit={null} percentage={2.29} />)
    expect(screen.getByText('$2.29 / - (2.3%)')).toBeInTheDocument()
  })

  it('shows only the percentage when neither spend nor limit is passed', () => {
    const { container } = render(<SpendingProgressBar percentage={2.29} />)
    expect(screen.getByText('2.3%')).toBeInTheDocument()
    expect(container.textContent).not.toContain('$')
  })

  it('renders spend and percentage when only spend is passed', () => {
    render(<SpendingProgressBar spend={12.34} percentage={44.5} />)
    expect(screen.getByText('$12.34 (44.5%)')).toBeInTheDocument()
  })

  it('renders zero spend as $0.00, not a dash', () => {
    render(<SpendingProgressBar spend={0} limit={50} percentage={0} />)
    expect(screen.getByText('$0.00 / $50.00 (0.0%)')).toBeInTheDocument()
  })

  it.each([null, undefined, -5.5, NaN, Infinity, -Infinity])(
    'renders a dash for invalid spend %s',
    (spend) => {
      render(<SpendingProgressBar spend={spend} limit={100} percentage={30} />)
      expect(screen.getByText('- / $100.00 (30.0%)')).toBeInTheDocument()
    }
  )

  it('shows real amounts but clamps the percentage when spend exceeds the limit', () => {
    render(<SpendingProgressBar spend={120} limit={100} percentage={120} />)
    expect(screen.getByText('$120.00 / $100.00 (100.0%)')).toBeInTheDocument()
  })

  it('in amounts mode the bar grows to fill the row instead of a fixed width', () => {
    const { container } = render(<SpendingProgressBar spend={2.29} limit={100} percentage={2.29} />)
    const track = container.querySelector('.relative')
    expect(track).toHaveClass('flex-1')
    expect(track).not.toHaveClass('w-[110px]')
  })
})
