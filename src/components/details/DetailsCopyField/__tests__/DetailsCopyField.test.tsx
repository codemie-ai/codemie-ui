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

import DetailsCopyField from '../DetailsCopyField'

describe('DetailsCopyField', () => {
  const label = 'API Key'
  const value = 'xyz-123-abc-789'

  it('renders nothing when the value is undefined', () => {
    const { container } = render(<DetailsCopyField label={label} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the label, input, and copy button when a value is provided', () => {
    render(<DetailsCopyField label={label} value={value} />)

    expect(screen.getByText(label)).toBeInTheDocument()

    const inputElement = screen.getByRole('textbox') as HTMLInputElement
    expect(inputElement).toBeInTheDocument()
    expect(inputElement.value).toBe(value)
    expect(inputElement).toHaveAttribute('readOnly')

    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('should apply custom className to the root element', () => {
    const customClass = 'mt-4'
    render(<DetailsCopyField label={label} value={value} className={customClass} />)

    const rootElement = screen.getByText(label).parentElement
    expect(rootElement).toHaveClass('flex')
    expect(rootElement).toHaveClass('flex-col')
    expect(rootElement).toHaveClass(customClass)
  })
})
