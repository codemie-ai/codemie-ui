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
import { MemoryRouter } from 'react-router'
import { describe, it, expect } from 'vitest'

import InfoNotice from '../InfoNotice'

const defaultProps = {
  message: 'This is a notice message',
  linkText: 'Click here',
  linkTo: '/some/path',
}

const renderInfoNotice = (props = {}) =>
  render(
    <MemoryRouter>
      <InfoNotice {...defaultProps} {...props} />
    </MemoryRouter>
  )

describe('InfoNotice', () => {
  it('renders the message text', () => {
    renderInfoNotice()

    expect(screen.getByText(defaultProps.message, { exact: false })).toBeInTheDocument()
  })

  it('renders the link text', () => {
    renderInfoNotice()

    expect(screen.getByRole('link', { name: defaultProps.linkText })).toBeInTheDocument()
  })

  it('renders the link with the correct href', () => {
    renderInfoNotice()

    const link = screen.getByRole('link', { name: defaultProps.linkText })
    expect(link).toHaveAttribute('href', defaultProps.linkTo)
  })

  it('applies a custom className when provided', () => {
    const customClass = 'my-custom-class'
    const { container } = renderInfoNotice({ className: customClass })

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass(customClass)
  })

  it('applies default className when no custom className is provided', () => {
    const { container } = renderInfoNotice()

    const wrapper = container.firstChild as HTMLElement
    expect(wrapper).toHaveClass('rounded-lg')
  })
})
