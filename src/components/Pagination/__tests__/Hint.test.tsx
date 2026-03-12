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
import { expect, describe, it } from 'vitest'

import Hint from '../Hint'

describe('Hint', () => {
  it('renders hint with correct text', () => {
    const hintText = 'This is a hint'
    render(<Hint hint={hintText} />)

    const hintElement = screen.getByText('(?)')
    expect(hintElement).toBeInTheDocument()
    expect(hintElement).toHaveAttribute('title', hintText)
  })

  it('applies correct styling', () => {
    render(<Hint hint="Test hint" />)

    const hintElement = screen.getByText('(?)')
    expect(hintElement).toHaveClass('text-sm')
    expect(hintElement).toHaveClass('text-text-quaternary')
    expect(hintElement).toHaveClass('ml-1')
  })

  it('handles empty hint gracefully', () => {
    render(<Hint hint="" />)

    const hintElement = screen.getByText('(?)')
    expect(hintElement).toBeInTheDocument()
    expect(hintElement).toHaveAttribute('title', '')
  })

  it('handles long hint text correctly', () => {
    const longHintText =
      'This is a very long hint text that should still be displayed correctly in the title attribute of the hint element without any truncation or other issues that might occur with long strings'
    render(<Hint hint={longHintText} />)

    const hintElement = screen.getByText('(?)')
    expect(hintElement).toBeInTheDocument()
    expect(hintElement).toHaveAttribute('title', longHintText)
  })
})
