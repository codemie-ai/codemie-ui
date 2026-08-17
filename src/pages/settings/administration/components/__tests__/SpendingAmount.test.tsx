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

import SpendingAmount from '../SpendingAmount'

describe('SpendingAmount', () => {
  it('renders the spend and limit inline', () => {
    render(<SpendingAmount spend={120.5} limit={500} />)
    expect(screen.getByText('$120.50 / $500.00')).toBeInTheDocument()
  })

  it('renders zero spend rather than a dash', () => {
    render(<SpendingAmount spend={0} limit={500} />)
    expect(screen.getByText('$0.00 / $500.00')).toBeInTheDocument()
  })

  it('renders a dash for spend when spend is absent', () => {
    render(<SpendingAmount spend={null} limit={500} />)
    expect(screen.getByText('- / $500.00')).toBeInTheDocument()
  })

  it('renders a dash for the limit when no limit is configured', () => {
    render(<SpendingAmount spend={40} limit={null} />)
    expect(screen.getByText('$40.00 / -')).toBeInTheDocument()
  })

  it('applies no color when no limit is configured', () => {
    render(<SpendingAmount spend={120.5} limit={null} />)
    expect(screen.getByText('$120.50 / -')).not.toHaveStyle({ color: expect.anything() })
  })

  it('does not render tooltip attributes', () => {
    render(<SpendingAmount spend={120.5} limit={500} />)
    const el = screen.getByText('$120.50 / $500.00')
    expect(el).not.toHaveAttribute('data-tooltip-id')
    expect(el).not.toHaveAttribute('data-tooltip-content')
  })
})
