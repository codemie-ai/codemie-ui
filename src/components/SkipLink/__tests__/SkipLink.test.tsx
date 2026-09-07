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

import SkipLink from '../SkipLink'

describe('SkipLink', () => {
  it('renders a link to the main content landmark', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })

    expect(link).toHaveAttribute('href', '#main-content')
  })

  it('is visually hidden until keyboard-focused', () => {
    render(<SkipLink />)

    const link = screen.getByRole('link', { name: 'Skip to main content' })

    expect(link).toHaveClass('sr-only')
    expect(link).toHaveClass('focus-visible:not-sr-only')
  })

  it('moves focus to the main content landmark on click', () => {
    render(
      <>
        <SkipLink />
        <main id="main-content" tabIndex={-1} />
      </>
    )

    const link = screen.getByRole('link', { name: 'Skip to main content' })
    link.click()

    expect(screen.getByRole('main')).toHaveFocus()
  })
})
