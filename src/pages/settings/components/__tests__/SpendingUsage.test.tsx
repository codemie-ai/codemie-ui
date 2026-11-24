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

import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'

import { ABSENT_VALUE_MARKER } from '@/constants'

import SpendingUsage from '../SpendingUsage'

afterEach(cleanup)

describe('SpendingUsage', () => {
  it('shows spend and remaining budget with exactly two decimals', () => {
    render(<SpendingUsage percentage={12.3456} spent={12.3456} limit={100} />)

    expect(screen.getByText('Your spending: $12.35')).toBeInTheDocument()
    expect(screen.getByText('$87.65')).toBeInTheDocument()
  })

  it('rounds sub-cent spend to two decimals', () => {
    render(<SpendingUsage percentage={0} spent={0.0067} limit={100} />)

    expect(screen.getByText('Your spending: $0.01')).toBeInTheDocument()
  })

  it('shows the absent marker, never $0.00, when spend and limit are absent', () => {
    const { container } = render(<SpendingUsage percentage={null} spent={null} limit={null} />)

    expect(screen.getByText(`Your spending: ${ABSENT_VALUE_MARKER}`)).toBeInTheDocument()
    expect(screen.getByText(/Available:/)).toHaveTextContent(`Available: ${ABSENT_VALUE_MARKER}`)
    expect(container).not.toHaveTextContent('$0.00')
  })
})
