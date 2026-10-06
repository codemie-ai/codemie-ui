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
import { useRef } from 'react'
import { afterEach, describe, it, expect } from 'vitest'

import { useFocusReturn } from '../useFocusReturn'

const TestComponent = ({ isOpen }: { isOpen: boolean }) => {
  const triggerRef = useRef<HTMLButtonElement>(null)
  useFocusReturn(triggerRef, isOpen)
  return <button ref={triggerRef}>Trigger</button>
}

afterEach(cleanup)

describe('useFocusReturn', () => {
  it('focuses trigger when isOpen transitions true → false', () => {
    const { rerender } = render(<TestComponent isOpen={true} />)
    rerender(<TestComponent isOpen={false} />)
    expect(screen.getByRole('button', { name: 'Trigger' })).toHaveFocus()
  })

  it('preserves focus on another element when the popup closes', () => {
    const renderContent = (isOpen: boolean) => (
      <div>
        <TestComponent isOpen={isOpen} />
        <button type="button">After</button>
      </div>
    )
    const { rerender } = render(renderContent(true))
    const after = screen.getByRole('button', { name: 'After' })
    after.focus()

    rerender(renderContent(false))

    expect(after).toHaveFocus()
  })

  it('returns focus when the focused popup content is removed on close', () => {
    const renderContent = (isOpen: boolean) => (
      <div>
        <TestComponent isOpen={isOpen} />
        {isOpen && <button type="button">Popup action</button>}
      </div>
    )
    const { rerender } = render(renderContent(true))
    screen.getByRole('button', { name: 'Popup action' }).focus()

    rerender(renderContent(false))

    expect(screen.getByRole('button', { name: 'Trigger' })).toHaveFocus()
  })

  it('does not focus trigger when isOpen stays false', () => {
    const { rerender } = render(<TestComponent isOpen={false} />)
    rerender(<TestComponent isOpen={false} />)
    expect(screen.getByRole('button', { name: 'Trigger' })).not.toHaveFocus()
  })

  it('does not focus trigger when isOpen transitions false → true', () => {
    const { rerender } = render(<TestComponent isOpen={false} />)
    rerender(<TestComponent isOpen={true} />)
    expect(screen.getByRole('button', { name: 'Trigger' })).not.toHaveFocus()
  })

  it('does not throw when triggerRef.current is null', () => {
    const NullRefComponent = ({ isOpen }: { isOpen: boolean }) => {
      const triggerRef = useRef<HTMLButtonElement>(null)
      useFocusReturn(triggerRef, isOpen)
      return <div>no button</div>
    }
    const { rerender } = render(<NullRefComponent isOpen={true} />)
    expect(() => rerender(<NullRefComponent isOpen={false} />)).not.toThrow()
  })
})
