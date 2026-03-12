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

import DetailsProperty from '../index'

describe('DetailsProperty', () => {
  it('renders the label and a string value correctly', () => {
    const label = 'Username'
    const value = 'test-user'

    render(<DetailsProperty label={label} value={value} />)

    const labelElement = screen.getByText(`${label}:`)
    const valueElement = screen.getByText(value)

    expect(labelElement).toBeInTheDocument()
    expect(valueElement).toBeInTheDocument()
  })

  it('renders the label and a non-zero number value correctly', () => {
    const label = 'Count'
    const value = 123

    render(<DetailsProperty label={label} value={value} />)

    expect(screen.getByText(`${label}:`)).toBeInTheDocument()
    expect(screen.getByText(value)).toBeInTheDocument()
  })

  it('should render nothing when the value is falsy', () => {
    const label = 'Test Label'
    const { container } = render(<DetailsProperty label={label} value={undefined} />)
    expect(container).toBeEmptyDOMElement()
  })
})
