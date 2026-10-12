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

import Table from '../Table'

describe('Table aria-label', () => {
  it('sets aria-label on the table when ariaLabel is provided', () => {
    render(<Table items={[]} columnDefinitions={[]} ariaLabel="Widgets" />)
    expect(screen.getByRole('table', { name: 'Widgets' })).toBeInTheDocument()
  })

  it('renders no aria-label when ariaLabel is omitted', () => {
    render(<Table items={[]} columnDefinitions={[]} />)
    expect(screen.getByRole('table')).not.toHaveAttribute('aria-label')
  })
})
