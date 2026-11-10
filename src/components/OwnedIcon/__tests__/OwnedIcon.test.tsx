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

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import OwnedIcon from '../OwnedIcon'

describe('OwnedIcon', () => {
  it('renders the given icon with a notch and a person badge, hidden from assistive tech', () => {
    render(<OwnedIcon icon={<svg data-testid="base-icon" />} />)
    const root = screen.getByTestId('owned-icon')
    expect(root).toHaveAttribute('aria-hidden')
    const base = screen.getByTestId('base-icon').parentElement as HTMLElement
    expect(base.getAttribute('style')).toContain('radial-gradient')
    expect(root).toContainElement(screen.getByTestId('owned-icon-badge'))
  })

  it('keeps extra classes', () => {
    render(<OwnedIcon icon={<svg />} className="text-text-accent" />)
    expect(screen.getByTestId('owned-icon')).toHaveClass('text-text-accent')
  })
})
