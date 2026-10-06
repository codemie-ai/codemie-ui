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
  it('renders spend and rounded percentage together', () => {
    render(<SpendingProgressBar spend={12.34} percentage={44.5} />)
    expect(screen.getByText('$12.34 (45%)')).toBeInTheDocument()
  })

  it('renders unclamped spend but clamped percentage', () => {
    render(<SpendingProgressBar spend={120} percentage={250} />)
    expect(screen.getByText('$120.00 (100%)')).toBeInTheDocument()
  })

  it('renders dash for null spend with percentage', () => {
    render(<SpendingProgressBar spend={null} percentage={30} />)
    expect(screen.getByText('- (30%)')).toBeInTheDocument()
  })

  it('renders dash for undefined spend with percentage', () => {
    render(<SpendingProgressBar spend={undefined} percentage={30} />)
    expect(screen.getByText('- (30%)')).toBeInTheDocument()
  })

  it('renders zero spend as $0.00, not dash', () => {
    render(<SpendingProgressBar spend={0} percentage={0} />)
    expect(screen.getByText('$0.00 (0%)')).toBeInTheDocument()
  })

  it('does not include w-12 class on label', () => {
    const { container } = render(<SpendingProgressBar spend={12.34} percentage={44.5} />)
    const span = container.querySelector('span')
    expect(span).toHaveClass('whitespace-nowrap')
    expect(span).toHaveClass('text-right')
    expect(span).not.toHaveClass('w-12')
  })

  it('color derives from percentage only, unchanged when spend is null', () => {
    const { rerender, container: firstContainer } = render(
      <SpendingProgressBar spend={50} percentage={30} />
    )
    const firstSpan = firstContainer.querySelector('span')
    const firstColor = firstSpan?.style.color

    rerender(<SpendingProgressBar spend={null} percentage={30} />)
    const secondSpan = firstContainer.querySelector('span')
    const secondColor = secondSpan?.style.color

    expect(firstColor).toBe(secondColor)
  })

  it('flex wrapper has min-w-0 for proper overflow handling', () => {
    const { container } = render(<SpendingProgressBar spend={1234.56} percentage={100} />)
    const wrapper = container.querySelector('.flex')
    expect(wrapper).toHaveClass('min-w-0')
  })

  it('renders dash for NaN spend', () => {
    render(<SpendingProgressBar spend={NaN} percentage={30} />)
    expect(screen.getByText('- (30%)')).toBeInTheDocument()
  })

  it('renders dash for Infinity spend', () => {
    render(<SpendingProgressBar spend={Infinity} percentage={30} />)
    expect(screen.getByText('- (30%)')).toBeInTheDocument()
  })

  it('renders dash for negative Infinity spend', () => {
    render(<SpendingProgressBar spend={-Infinity} percentage={30} />)
    expect(screen.getByText('- (30%)')).toBeInTheDocument()
  })

  it('renders dash for negative spend', () => {
    render(<SpendingProgressBar spend={-5.5} percentage={30} />)
    expect(screen.getByText('- (30%)')).toBeInTheDocument()
  })
})
