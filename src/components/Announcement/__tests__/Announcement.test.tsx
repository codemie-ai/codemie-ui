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
import { describe, expect, it } from 'vitest'

import Announcement from '../Announcement'

describe('Announcement', () => {
  it('exposes a polite, atomic live region', () => {
    render(<Announcement announcement="" />)

    const region = screen.getByRole('status')

    expect(region).toHaveAttribute('aria-live', 'polite')
    expect(region).toHaveAttribute('aria-atomic', 'true')
  })

  it('renders the announcement without showing it', () => {
    render(<Announcement announcement="2 rows total." />)

    const region = screen.getByRole('status')

    expect(region).toHaveTextContent('2 rows total.')
    expect(region).toHaveClass('sr-only')
  })

  it('renders an empty region when there is nothing to announce', () => {
    render(<Announcement announcement="" />)

    expect(screen.getByRole('status')).toHaveTextContent('')
  })
})
