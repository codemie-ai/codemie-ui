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

import { render, screen, fireEvent } from '@testing-library/react'
import { useRef } from 'react'
import { describe, it, expect } from 'vitest'

import { useFocusTrap } from '../useFocusTrap'

const TestContainer = ({ isActive }: { isActive: boolean }) => {
  const containerRef = useRef<HTMLDivElement>(null)
  useFocusTrap(containerRef, isActive)
  return (
    <div ref={containerRef}>
      <button>First</button>
      <button>Second</button>
      <button>Third</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('wraps Tab from last to first focusable element when active', () => {
    render(<TestContainer isActive={true} />)
    const [first, , third] = screen.getAllByRole('button')

    third.focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })

    expect(first).toHaveFocus()
  })

  it('wraps Shift+Tab from first to last focusable element when active', () => {
    render(<TestContainer isActive={true} />)
    const [first, , third] = screen.getAllByRole('button')

    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true, bubbles: true })

    expect(third).toHaveFocus()
  })

  it('redirects focus to first element when Tab pressed with focus outside the container', () => {
    render(
      <>
        <button>Outside</button>
        <TestContainer isActive={true} />
      </>
    )
    const buttons = screen.getAllByRole('button')
    const outsideBtn = buttons[0]
    const firstInside = buttons[1]

    outsideBtn.focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })

    expect(firstInside).toHaveFocus()
  })

  it('does not intercept Tab when inactive', () => {
    render(<TestContainer isActive={false} />)
    const [, , third] = screen.getAllByRole('button')

    third.focus()
    fireEvent.keyDown(document, { key: 'Tab', bubbles: true })

    // hook inactive: no focus change
    expect(third).toHaveFocus()
  })

  it('does not intercept non-Tab keys', () => {
    render(<TestContainer isActive={true} />)
    const [, , third] = screen.getAllByRole('button')

    third.focus()
    fireEvent.keyDown(document, { key: 'ArrowDown', bubbles: true })

    expect(third).toHaveFocus()
  })
})
